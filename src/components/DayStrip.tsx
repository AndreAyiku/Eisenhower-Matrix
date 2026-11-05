import { useRef } from "react";
import { formatDayLong, parseISO } from "../lib/calendar";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  days: string[];
  selected: string;
  today: string;
  onSelect: (iso: string) => void;
  onShiftWeek: (direction: -1 | 1) => void;
}

export default function DayStrip({ days, selected, today, onSelect, onShiftWeek }: Props) {
  const startX = useRef<number | null>(null);

  return (
    <div
      className="day-strip"
      role="group"
      aria-label="Choose a day"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) onShiftWeek(dx < 0 ? 1 : -1);
      }}
    >
      {days.map((iso) => {
        const d = parseISO(iso);
        const isSelected = iso === selected;
        return (
          <button
            key={iso}
            type="button"
            className={`day-pill${isSelected ? " selected" : ""}`}
            aria-pressed={isSelected}
            aria-label={formatDayLong(iso)}
            onClick={() => onSelect(iso)}
          >
            <span className="dow">{LETTERS[d.getDay()]}</span>
            <span className="num">{d.getDate()}</span>
            {iso === today && <span className="dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}