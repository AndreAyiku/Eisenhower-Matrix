export type PushStatus =
  | "needs-install"
  | "unsupported"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

export type PushResult = { ok: true } | { ok: false; error: string };

export type JobKind = "task" | "timer" | "test";

export interface ReminderJob {
  id: string;
  at: number; // epoch milliseconds
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Fired when notifications are switched on or off, so reminders can be (re)synced. */
export const PUSH_CHANGED = "ff-push-changed";

const VAPID_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined;

export function isIOS(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 5000)
  );
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    throw new Error(
      "The app’s background worker isn’t running. Open the installed app on your phone (not the dev server) and try again."
    );
  }
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) {
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (!VAPID_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/** Must be called straight from a tap: iOS only shows the permission prompt then. */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) {
    return { ok: false, error: "This device can’t receive notifications here." };
  }
  if (!VAPID_KEY) {
    return { ok: false, error: "Notifications aren’t set up yet: the public key is missing." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error: "Permission wasn’t granted. You can allow it in the iPhone Settings app under Notifications.",
    };
  }

  try {
    const reg = await readyRegistration();
    const existing = await reg.pushManager.getSubscription();
    if (!existing) {
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
    }
    window.dispatchEvent(new Event(PUSH_CHANGED));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn’t turn notifications on.",
    };
  }
}

/** Asks the server to forget this device. Best effort: failures are ignored. */
async function forgetDevice(sub: PushSubscription): Promise<void> {
  try {
    await fetch("/api/sync", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
  } catch {
    // offline or the server isn’t reachable
  }
}

export async function disablePush(): Promise<PushResult> {
  try {
    const sub = await currentSubscription();
    if (sub) {
      await forgetDevice(sub);
      await sub.unsubscribe();
    }
    window.dispatchEvent(new Event(PUSH_CHANGED));
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t turn notifications off." };
  }
}

export async function sendTestPush(): Promise<PushResult> {
  const sub = await currentSubscription();
  if (!sub) return { ok: false, error: "Turn notifications on first." };

  try {
    const res = await fetch("/api/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 404) {
      return { ok: false, error: "The server part only runs on the deployed site, not locally." };
    }
    if (res.status === 410) {
      return {
        ok: false,
        error: "This device’s notification link has expired. Turn notifications off and on again.",
      };
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (data.error === "not_configured") {
      return { ok: false, error: "The server is missing its keys. Check the Vercel settings." };
    }
    return { ok: false, error: `The server couldn’t send it (error ${res.status}).` };
  } catch {
    return { ok: false, error: "Couldn’t reach the server. Check your connection." };
  }
}

/** Replaces this device's scheduled notifications of one kind on the server. */
export async function postJobs(kind: JobKind, jobs: ReminderJob[]): Promise<PushResult> {
  const sub = await currentSubscription();
  if (!sub) return { ok: false, error: "Turn notifications on first." };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), kind, jobs }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 404) {
      return { ok: false, error: "Reminders only sync on the deployed site, not locally." };
    }
    if (res.status === 503) {
      return { ok: false, error: "The reminder storage isn’t set up on the server yet." };
    }
    return { ok: false, error: `The server couldn’t save the reminders (error ${res.status}).` };
  } catch {
    return { ok: false, error: "Couldn’t reach the server. Check your connection." };
  }
}