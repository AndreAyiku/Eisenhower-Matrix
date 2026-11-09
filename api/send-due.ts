import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";

type Kind = "task" | "timer" | "test";

interface Sub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface StoredJob {
  kind: Kind;
  id: string;
  at: number;
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface DeviceRecord {
  subscription: Sub;
  jobs: StoredJob[];
}

type Cmd = (string | number)[];

const TTL_SECONDS = 100 * 24 * 60 * 60;
const MAX_DEVICES_PER_RUN = 25;
const RETRY_WINDOW_MS = 10 * 60 * 1000;

async function redis(commands: Cmd[], transaction = false): Promise<unknown[]> {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) throw new Error("redis_not_configured");

  const res = await fetch(
    `${base.replace(/\/$/, "")}/${transaction ? "multi-exec" : "pipeline"}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
    }
  );
  if (!res.ok) throw new Error(`redis_http_${res.status}`);

  const data = (await res.json()) as { result?: unknown; error?: string }[];
  return data.map((item) => {
    if (item.error) throw new Error("redis_error");
    return item.result;
  });
}

function parseRecord(raw: unknown): DeviceRecord | null {
  if (typeof raw !== "string") return null;
  try {
    const data = JSON.parse(raw) as Partial<DeviceRecord>;
    if (!data.subscription || !Array.isArray(data.jobs)) return null;
    return { subscription: data.subscription, jobs: data.jobs };
  } catch {
    return null;
  }
}

function authorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(String(req.headers.authorization ?? ""));
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    const [found] = await redis([
      ["ZRANGEBYSCORE", "due", "-inf", nowSec, "LIMIT", 0, MAX_DEVICES_PER_RUN],
    ]);
    const ids = Array.isArray(found)
      ? found.filter((x): x is string => typeof x === "string")
      : [];

    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (const id of ids) {
      const [raw] = await redis([["GET", `dev:${id}`]]);
      const record = parseRecord(raw);
      if (!record) {
        await redis([["ZREM", "due", id]]);
        continue;
      }

      const keep: StoredJob[] = record.jobs.filter((j) => j.at > nowMs);
      let gone = false;

      for (const job of record.jobs.filter((j) => j.at <= nowMs)) {
        try {
          await webpush.sendNotification(
            record.subscription,
            JSON.stringify({
              title: job.title,
              body: job.body,
              url: job.url,
              tag: job.tag,
            }),
            { TTL: 3600, urgency: "high" }
          );
          sent++;
        } catch (err) {
          const status = Number((err as { statusCode?: number }).statusCode ?? 0);
          if (status === 404 || status === 410) {
            gone = true;
            break;
          }
          failed++;
          if (nowMs - job.at < RETRY_WINDOW_MS) keep.push(job);
        }
      }

      if (gone) {
        await redis([["DEL", `dev:${id}`], ["ZREM", "due", id]], true);
        removed++;
        continue;
      }

      keep.sort((a, b) => a.at - b.at);
      const commands: Cmd[] = [
        [
          "SET",
          `dev:${id}`,
          JSON.stringify({ subscription: record.subscription, jobs: keep }),
          "EX",
          TTL_SECONDS,
        ],
        keep.length > 0
          ? ["ZADD", "due", Math.floor(keep[0].at / 1000), id]
          : ["ZREM", "due", id],
      ];
      await redis(commands, true);
    }

    return res.status(200).json({ ok: true, devices: ids.length, sent, failed, removed });
  } catch (err) {
    if (err instanceof Error && err.message === "redis_not_configured") {
      return res.status(503).json({ ok: false, error: "not_configured" });
    }
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}