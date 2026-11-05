import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CircleCheck,
  Clock,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import PropertyRow from "./PropertyRow";
import { useSheet } from "../hooks/useSheet";
import { DEFAULT_BLOCK_MIN, defaultDue, formatDayLong, parseISO } from "../lib/calendar";
import { formatLocalDateTime, toISODate } from "../lib/dates";
import { estimateOptions, formatDurationLong } from "../lib/format";
import { openPicker } from "../lib/picker";
import {
  CALENDAR_OPTIONS,
  REMINDER_OPTIONS,
  formatOffset,
  minToTime,
  reminderOffset,
  scheduleStatus,
  shiftLocal,
  timeToMin,
} from "../lib/schedule";
import { useTasks } from "../store/tasksContext";
import type { Task } from "../types/task";

interface Props {
  task: Task;
  onClose: () => void;
  onSaved?: (date: string) => void;
}

export default function EditBlockSheet({ task, onClose, onSaved }: Props) {
  useSheet(onClose);
  const { tasks, updateTask } = useTasks();

  const scheduled = Boolean(task.dueTime);
  const initialDuration = task.estimateMinutes ?? DEFAULT_BLOCK_MIN;

  const [date, setDate] = useState(() => task.dueDate ?? toISODate(new Date()));
  const [start, setStart] = useState(
    () =>
      task.dueTime ??
      defaultDue(task.dueDate ?? toISODate(new Date()), new Date()).slice(11)
  );
  const [end, setEnd] = useState(() => minToTime(timeToMin(start) + initialDuration));
  const [calendar, setCalendar] = useState(task.calendar ?? "");
  const [offset, setOffset] = useState<number | null>(() => reminderOffset(task));
  const [touched, setTouched] = useState(false);

  const startMin = timeToMin(start);
  const endMin = timeToMin(end);
  const duration = endMin - startMin;
  const valid = duration > 0;

  const status = useMemo(
    () => scheduleStatus({ taskId: task.id, date, startMin, endMin, tasks }),
    [task.id, date, startMin, endMin, tasks]
  );

  const keepCustom = !touched && Boolean(task.reminderAt) && offset === null;
  const reminderValue = keepCustom ? "keep" : offset === null ? "none" : String(offset);
  const reminderText = keepCustom
    ? formatLocalDateTime(task.reminderAt)
    : offset === null
      ? "None"
      : formatOffset(offset);
  const reminderOptions =
    offset !== null && !REMINDER_OPTIONS.some((o) => o.minutes === offset)
      ? [...REMINDER_OPTIONS, { minutes: offset, label: formatOffset(offset) }].sort(
          (a, b) => a.minutes - b.minutes
        )
      : REMINDER_OPTIONS;

  const changeStart = (value: string) => {
    if (!value) return;
    const length = valid ? duration : initialDuration;
    setStart(value);
    setEnd(minToTime(timeToMin(value) + length));
  };

  const changeEnd = (value: string) => {
    if (value) setEnd(value);
  };

  const changeDuration = (minutes: number) => {
    if (minutes > 0) setEnd(minToTime(startMin + minutes));
  };

  const changeReminder = (value: string) => {
    setTouched(true);
    setOffset(value === "none" || value === "keep" ? null : Number(value));
  };

  const save = () => {
    if (!valid) return;
    let reminderAt = task.reminderAt;
    if (touched) {
      reminderAt = offset === null ? undefined : shiftLocal(date, start, -offset);
    } else if (offset !== null) {
      reminderAt = shiftLocal(date, start, -offset);
    }
    updateTask(task.id, {
      dueDate: date,
      dueTime: start,
      estimateMinutes: duration,
      calendar: calendar || undefined,
      reminderAt,
    });
    onSaved?.(date);
    onClose();
  };

  const remove = () => {
    updateTask(task.id, { dueTime: undefined, reminderAt: undefined });
    onClose();
  };

  const tag = task.tags[0];
  const StatusIcon = status.tone === "ok" ? CircleCheck : TriangleAlert;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-block-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h2 id="edit-block-title">
            {scheduled ? "Edit time block" : "Schedule time block"}
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <Link className="sheet-task" to={`/tasks/${task.id}`}>
          <span>{tag ? `${task.title} · ${tag}` : task.title}</span>
          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>

        <div className="field">
          <span className="field-label">Date</span>
          <div className="field-box">
            <span>
              {formatDayLong(date)} {parseISO(date).getFullYear()}
            </span>
            <CalendarDays className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
            <input
              className="prop-native"
              type="date"
              aria-label="Date"
              value={date}
              onClick={openPicker}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <span className="field-label">Starts</span>
            <div className="field-box">
              <span>{start}</span>
              <Clock className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              <input
                className="prop-native"
                type="time"
                aria-label="Start time"
                value={start}
                onClick={openPicker}
                onChange={(e) => changeStart(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <span className="field-label">Ends</span>
            <div className="field-box">
              <span>{end}</span>
              <Clock className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              <input
                className="prop-native"
                type="time"
                aria-label="End time"
                value={end}
                onClick={openPicker}
                onChange={(e) => changeEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <section className="prop-card" aria-label="Block details">
          <PropertyRow
            icon={Timer}
            label="Duration"
            value={valid ? formatDurationLong(duration) : "Check times"}
          >
            <select
              className="prop-native"
              aria-label="Duration"
              value={valid ? duration : 0}
              onChange={(e) => changeDuration(Number(e.target.value))}
            >
              {!valid && <option value={0}>Check times</option>}
              {estimateOptions(valid ? duration : undefined).map((m) => (
                <option key={m} value={m}>
                  {formatDurationLong(m)}
                </option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow icon={CalendarDays} label="Calendar" value={calendar || "Not set"}>
            <select
              className="prop-native"
              aria-label="Calendar"
              value={calendar}
              onChange={(e) => setCalendar(e.target.value)}
            >
              <option value="">Not set</option>
              {CALENDAR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow icon={Bell} label="Reminder" value={reminderText}>
            <select
              className="prop-native"
              aria-label="Reminder"
              value={reminderValue}
              onChange={(e) => changeReminder(e.target.value)}
            >
              {keepCustom && <option value="keep">{reminderText}</option>}
              <option value="none">None</option>
              {reminderOptions.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </PropertyRow>
        </section>

        <p className={`status status-${status.tone}`} role="status">
          <StatusIcon size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{status.text}</span>
        </p>

        <button type="button" className="primary-btn" disabled={!valid} onClick={save}>
          Save changes
        </button>

        {scheduled && (
          <button type="button" className="remove-block" onClick={remove}>
            Remove time block
          </button>
        )}
      </div>
    </div>
  );
}