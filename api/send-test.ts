import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";

interface SubscriptionBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const sub = (body as { subscription?: SubscriptionBody } | null)?.subscription;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (
    !sub ||
    !allowedEndpoint(sub.endpoint) ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    p256dh.length > 256 ||
    auth.length > 256
  ) {
    return res.status(400).json({ ok: false, error: "bad_subscription" });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh, auth } },
      JSON.stringify({
        title: "FocusFlow",
        body: "Notifications are working. This is a test.",
        url: "/today",
        tag: "test",
      }),
      { TTL: 60, urgency: "high" }
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    const status = Number((err as { statusCode?: number }).statusCode ?? 0);
    if (status === 404 || status === 410) {
      return res.status(410).json({ ok: false, error: "expired" });
    }
    return res.status(502).json({ ok: false, error: "push_failed" });
  }
}