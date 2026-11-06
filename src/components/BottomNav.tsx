import { NavLink } from "react-router";
import { CalendarDays, House, LayoutGrid, Timer, type LucideIcon } from "lucide-react";

const ITEMS: { label: string; to: string; Icon: LucideIcon }[] = [
  { label: "Today", to: "/today", Icon: House },
  { label: "Tasks", to: "/tasks", Icon: LayoutGrid },
  { label: "Calendar", to: "/calendar", Icon: CalendarDays },
  { label: "Focus", to: "/focus", Icon: Timer },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav-wrap" aria-label="Main">
      <div className="bottom-nav">
        {ITEMS.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}