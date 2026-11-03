import { Bell, Settings2 } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="header">
      <div className="header-top">
        <span className="eyebrow">Prioritise / Eisenhower</span>
        <div className="icon-actions">
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={22} strokeWidth={1.75} />
          </button>
          <button type="button" className="icon-btn" aria-label="Settings">
            <Settings2 size={22} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <h1 className="title">What matters most.</h1>
      <p className="subtitle">Importance creates impact. Urgency sets the pace.</p>
    </header>
  );
}