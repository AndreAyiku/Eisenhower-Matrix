import type { CSSProperties } from "react";
import { Link } from "react-router";
import { Sun } from "lucide-react";
import {
  fmtMinShort,
  formatShortDay,
  layoutOverlaps,
  parseISO,
  weekdayShort,
  type Block,
} from "../lib/calendar";
import type { Task } from "../types/task";

const HOUR_H = 45;

interface Props {
  days: string[]; // 7 days, Monday first
  blocks: Block[];
  today: string;
  onPickDay: (iso: string) => void;
  onSelect: (task: Task) => void;
}

export default function WeekGrid({ days, blocks, today, onPickDay, onSelect }: Props) {
  const weekend = days.slice(5);
  const showWeekend = blocks.some((b) => weekend.includes(b.date));
  const shown = showWeekend ? days : days.slice(0, 5);

  const startHour = Math.min(9, ...blocks.map((b) => Math.floor(b.startMin / 60)));
  const endHour = Math.min(
    24,
    Math.max(17, ...blocks.map((b) => Math.ceil(b.endMin / 60)))
  );
  const gridH = (endHour - startHour) * HOUR_H;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const style = {
    "--cols": shown.length,
    "--hour-h": `${HOUR_H}px`,
    "--grid-h": `${gridH}px`,
  } as CSSProperties;

  return (
    <>
      <div className="week" style={style}>
        <div className="week-head">
          <span />
          {shown.map((iso) => (
            <button
              key={iso}
              type="button"
              className={`wk-day${iso === today ? " today" : ""}`}
              onClick={() => onPickDay(iso)}
              aria-label={`Open ${formatShortDay(iso)}`}
            >
              <span className="wk-dow">{weekdayShort(iso)}</span>
              <span className="wk-num">{parseISO(iso).getDate()}</span>
            </button>
          ))}
        </div>

        <div className="week-body">
          <div className="wk-axis" aria-hidden="true">
            {hours.map((h) => (
              <span
                key={h}
                className="wk-hour"
                style={{ top: (h - startHour) * HOUR_H }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {shown.map((iso) => (
            <div key={iso} className="wk-col">
              {layoutOverlaps(blocks.filter((b) => b.date === iso)).map((b) => {
                const top = ((b.startMin - startHour * 60) / 60) * HOUR_H;
                const height = Math.max(
                  ((b.endMin - b.startMin) / 60) * HOUR_H - 2,
                  18
                );
                return (
                  <Link
                    key={b.task.id}
                    to={`/tasks/${b.task.id}`}
                    className={`wk-block${b.task.completed ? " done" : ""}`}
                    style={{
                      top,
                      height,
                      left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / b.lanes}% - 4px)`,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelect(b.task);
                    }}
                  >
                    <span className="wk-block-title">{b.task.title}</span>
                    <span className="wk-block-time">
                      {fmtMinShort(b.startMin)}–{fmtMinShort(b.endMin)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!showWeekend && (
        <p className="week-note">
          <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {formatShortDay(days[5])} &amp; {formatShortDay(days[6])} · No blocks
            scheduled. Your weekend is clear.
          </span>
        </p>
      )}
    </>
  );
}