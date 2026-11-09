import { useCallback, useEffect, useState } from "react";
import { BellRing, CircleCheck, TriangleAlert, X } from "lucide-react";
import { useSheet } from "../hooks/useSheet";
import {
  disablePush,
  enablePush,
  getPushStatus,
  sendTestPush,
  type PushResult,
  type PushStatus,
} from "../lib/push";

interface Props {
  onClose: () => void;
}

interface Message {
  tone: "ok" | "error";
  text: string;
}

export default function NotificationsSheet({ onClose }: Props) {
  useSheet(onClose);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getPushStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (action: () => Promise<PushResult>, okText?: string) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    await refresh();
    if (!result.ok) setMessage({ tone: "error", text: result.error });
    else if (okText) setMessage({ tone: "ok", text: okText });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h2 id="notif-title">Notifications</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <p className="sheet-sub">Reminders and timer alerts, even when the app is closed.</p>

        {status === null && <p className="notif-note">Checking…</p>}

        {status === "needs-install" && (
          <>
            <p className="status status-warn">
              <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Notifications only work from the installed app.</span>
            </p>
            <ol className="notif-steps">
              <li>Open FocusFlow in Safari.</li>
              <li>Tap the Share button, then Add to Home Screen.</li>
              <li>Open FocusFlow from your Home Screen and tap the bell again.</li>
            </ol>
          </>
        )}

        {status === "unsupported" && (
          <p className="status status-warn">
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>This browser can’t receive notifications.</span>
          </p>
        )}

        {status === "not-configured" && (
          <p className="status status-warn">
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Notifications aren’t set up on this version of the app yet.</span>
          </p>
        )}

        {status === "denied" && (
          <p className="status status-warn">
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              Notifications are blocked. Open the iPhone Settings app, go to Notifications,
              choose FocusFlow, and allow them.
            </span>
          </p>
        )}

        {status === "off" && (
          <>
            <p className="notif-note">
              You’ll be asked to allow notifications. FocusFlow only sends reminders you set
              and timer alerts.
            </p>
            <button
              type="button"
              className="primary-btn"
              disabled={busy}
              onClick={() => void run(enablePush)}
            >
              <BellRing size={20} strokeWidth={1.75} aria-hidden="true" />
              Turn on notifications
            </button>
          </>
        )}

        {status === "on" && (
          <>
            <p className="status status-ok">
              <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Notifications are on for this device.</span>
            </p>
            <button
              type="button"
              className="secondary-btn"
              disabled={busy}
              onClick={() => void run(sendTestPush, "Test sent. It should arrive in a few seconds.")}
            >
              Send a test notification
            </button>
            <button
              type="button"
              className="quiet-btn"
              disabled={busy}
              onClick={() => void run(disablePush)}
            >
              Turn off
            </button>
          </>
        )}

        {message && (
          <p className={`status status-${message.tone}`} role="status">
            <span>{message.text}</span>
          </p>
        )}
      </div>
    </div>
  );
}