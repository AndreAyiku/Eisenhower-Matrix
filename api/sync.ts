import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";

type Kind = "task" | "timer" | "test";
const KINDS: readonly string[] = ["task", "timer", "test"];

interface Sub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface StoredJob {
  kind: Kind;
  id: string;
  at: number; // epoch milliseconds
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
const MAX_JOBS_PER_KIND = 200;
const MAX_JOBS_PER_DEVICE = 250;
const HORIZON_MS = 90 * 24 * 60 * 60 * 1000;

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

// Only real push services are allowed, so this can't be used to call random websites.
function allowedEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname;
  return (
    host === "web.push.apple.com" ||
    host.endsWith(".push.apple.com") ||
    host === "fcm.googleapis.com" ||
    host.endsWith(".push.services.mozilla.com") ||
    host.endsWith(".notify.windows.com")
  );
}

function readSubscription(input: unknown): Sub | null {
  const s = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || !allowedEndpoint(s.endpoint)) return null;
  const p256dh = s.keys?.p256dh;
  const auth = s.keys?.auth;
  if (
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    p256dh.length > 256 ||
    auth.length > 256
  ) {
    return null;
  }
  return { endpoint: s.endpoint, keys: { p256dh, auth } };
}

function parseBody(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

const text = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";

const safeUrl = (v: unknown): string =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v.slice(0, 200) : "/today";

function cleanJobs(kind: Kind, input: unknown, nowMs: number): StoredJob[] | null {
  if (!Array.isArray(input) || input.length > MAX_JOBS_PER_KIND) return null;
  const seen = new Set<string>();
  const jobs: StoredJob[] = [];

  for (const item of input as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const j = item as Record<string, unknown>;
    const id = text(j.id, 64);
    const at = typeof j.at === "number" ? Math.round(j.at) : NaN;
    if (!id || seen.has(id) || !Number.isFinite(at)) continue;
    if (at < nowMs - 60_000 || at > nowMs + HORIZON_MS) continue;
    seen.add(id);
    jobs.push({
      kind,
      id,
      at,
      title: text(j.title, 100) || "FocusFlow",
      body: text(j.body, 200),
      url: safeUrl(j.url),
      tag: text(j.tag, 100) || `${kind}-${id}`,
    });
  }
  return jobs;
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

function deviceId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const body = parseBody(req.body);
  const sub = readSubscription(body?.subscription);
  if (!body || !sub) return res.status(400).json({ ok: false, error: "bad_subscription" });

  const id = deviceId(sub.endpoint);
  const key = `dev:${id}`;

  try {
    if (req.method === "DELETE") {
      await redis([["DEL", key], ["ZREM", "due", id]], true);
      return res.status(200).json({ ok: true });
    }

    const kind = body.kind;
    if (typeof kind !== "string" || !KINDS.includes(kind)) {
      return res.status(400).json({ ok: false, error: "bad_kind" });
    }
    const incoming = cleanJobs(kind as Kind, body.jobs, Date.now());
    if (!incoming) return res.status(400).json({ ok: false, error: "bad_jobs" });

    const [raw] = await redis([["GET", key]]);
    const existing = parseRecord(raw);
    const kept = existing ? existing.jobs.filter((j) => j.kind !== kind) : [];
    const jobs = [...kept, ...incoming]
      .sort((a, b) => a.at - b.at)
      .slice(0, MAX_JOBS_PER_DEVICE);

    const commands: Cmd[] = [
      ["SET", key, JSON.stringify({ subscription: sub, jobs }), "EX", TTL_SECONDS],
      jobs.length > 0
        ? ["ZADD", "due", Math.floor(jobs[0].at / 1000), id]
        : ["ZREM", "due", id],
    ];
    await redis(commands, true);

    return res.status(200).json({ ok: true, count: incoming.length });
  } catch (err) {
    if (err instanceof Error && err.message === "redis_not_configured") {
      return res.status(503).json({ ok: false, error: "not_configured" });
    }
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}