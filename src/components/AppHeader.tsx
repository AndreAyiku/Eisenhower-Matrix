import { useCallback, useState } from "react";
import { Bell } from "lucide-react";
import NotificationsSheet from "./NotificationsSheet";

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export default function AppHeader({ eyebrow, title, subtitle }: Props) {
  const [notifOpen, setNotifOpen] = useState(false);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  return (
    <>
      <header className="header">
        <div className="header-top">
          <span className="eyebrow">{eyebrow}</span>
          <div className="icon-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen(true)}
            >
              <Bell size={22} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <h1 className="title">{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </header>

      {notifOpen && <NotificationsSheet onClose={closeNotif} />}
    </>
  );
}