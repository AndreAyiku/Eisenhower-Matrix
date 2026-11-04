import { Bell, Settings2 } from "lucide-react";

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export default function AppHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <header className="header">
      <div className="header-top">
        <span className="eyebrow">{eyebrow}</span>
        <div className="icon-actions">
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={22} strokeWidth={1.75} />
          </button>
          <button type="button" className="icon-btn" aria-label="Settings">
            <Settings2 size={22} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <h1 className="title">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}