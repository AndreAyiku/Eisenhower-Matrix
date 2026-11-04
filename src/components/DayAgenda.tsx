import type { ReactNode } from "react";
import { Link } from "react-router";
import { fmtMin, type Block } from "../lib/calendar";
import { formatEstimate } from "../lib/format";
import type { Task } from "../types/task";

interface Props {
  blocks: Block[];
  unscheduled: Task[];
  showNow: boolean;
  nowMin: number;
}

interface CardProps {
  block: Block;
  nowPct: number | null;
  nowLabel: string;
}

function BlockCard({ block, nowPct, nowLabel }: CardProps) {
  const { task } = block;
  const tag = task.tags[0];
  const meta = `${fmtMin(block.startMin)}–${fmtMin(block.endMin)}${tag ? ` · ${tag}` : ""}`;

  return (
    <Link
      to={`/tasks/${task.id}`}
      className={`agenda-card ${task.completed ? "done" : "task"}`}
    >
      <span className="agenda-title">{task.title}</span>
      <span className="agenda-meta">{meta}</span>
      {nowPct !== null && (
        <span className="now-line" style={{ top: `${nowPct}%` }}>
          <span className="now-label">{nowLabel}</span>
        </span>
      )}
    </Link>
  );
}

export default function DayAgenda({ blocks, unscheduled, showNow, nowMin }: Props) {
  const nowLabel = fmtMin(nowMin);
  const insideIndex = showNow
    ? blocks.findIndex((b) => nowMin >= b.startMin && nowMin < b.endMin)
    : -1;

  let gapIndex: number | null = null;
  if (showNow && insideIndex === -1 && blocks.length > 0) {
    const next = blocks.findIndex((b) => b.startMin > nowMin);
    gapIndex = next === -1 ? blocks.length : next;
  }

  const nowRow = (
    <li key="now" className="agenda-row now-row" aria-label={`Now, ${nowLabel}`}>
      <span className="now-time">{nowLabel}</span>
      <span className="now-rule" aria-hidden="true" />
    </li>
  );

  const rows: ReactNode[] = [];
  blocks.forEach((block, i) => {
    if (gapIndex === i) rows.push(nowRow);
    const pct =
      i === insideIndex
        ? Math.min(
            90,
            Math.max(
              50,
              ((nowMin - block.startMin) / (block.endMin - block.startMin)) * 100
            )
          )
        : null;
    rows.push(
      <li key={block.task.id} className="agenda-row">
        <span className="agenda-time">{fmtMin(block.startMin)}</span>
        <BlockCard block={block} nowPct={pct} nowLabel={nowLabel} />
      </li>
    );
  });
  if (gapIndex === blocks.length) rows.push(nowRow);

  return (
    <>
      {blocks.length > 0 && <ul className="agenda">{rows}</ul>}

      {unscheduled.length > 0 && (
        <section aria-label="No time set">
          <h3 className="unsched-title">No time set</h3>
          <ul className="agenda">
            {unscheduled.map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`} className="agenda-card unsched">
                  <span className="agenda-title">{task.title}</span>
                  <span className="agenda-meta">
                    {task.estimateMinutes
                      ? formatEstimate(task.estimateMinutes)
                      : "Add a due time to place it"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocks.length === 0 && unscheduled.length === 0 && (
        <p className="cal-empty">
          Nothing planned for this day. Give a task a due date and time and it
          will show up here.
        </p>
      )}
    </>
  );
}