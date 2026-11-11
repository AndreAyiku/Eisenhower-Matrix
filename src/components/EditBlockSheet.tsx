import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Clock,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import PropertyRow from "./PropertyRow";
import ReminderField from "./ReminderField";
import { useSheet } from "../hooks/useSheet";
import { DEFAULT_BLOCK_MIN, defaultDue, formatDayLong, parseISO } from "../lib/calendar";
import { toISODate } from "../lib/dates";
import { estimateOptions, formatDurationLong } from "../lib/format";
import { openPicker } from "../lib/picker";
import { describeRepeat } from "../lib/recurrence";
import { CALENDAR_OPTIONS, minToTime, scheduleStatus, timeToMin } from "../lib/schedule";
import { useTasks } from "../store/tasksContext";
import type { ReminderRule, Task } from "../types/task";

interface Props {
  task: Task;
  onClose: () => void;
  onSaved?: (date: string) => void;
}

export default function EditBlockSheet({ task, onClose, onSaved }: Props) {
  useSheet(onClose);
  const { tasks, updateTask } = useTasks();

  const recurring = Boolean(task.repeat);
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
  const [reminders, setReminders] = useState<ReminderRule[]>(task.reminders ?? []);

  const startMin = timeToMin(start);
  const endMin = timeToMin(end);
  const duration = endMin - startMin;
  const valid = duration > 0;

  const status = useMemo(
    () => scheduleStatus({ taskId: task.id, date, startMin, endMin, tasks }),
    [task.id, date, startMin, endMin, tasks]
  );

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

  const save = () => {
    if (!valid) return;
    updateTask(task.id, {
      ...(recurring ? {} : { dueDate: date }),
      dueTime: start,
      estimateMinutes: duration,
      calendar: calendar || undefined,
      reminders,
    });
    if (!recurring) onSaved?.(date);
    onClose();
  };

  // Taking the time off keeps the day. Reminders "before the due time" no longer apply.
  const remove = () => {
    updateTask(task.id, {
      dueTime: undefined,
      reminders: (task.reminders ?? []).filter((r) => r.type !== "before"),
    });
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

        {recurring ? (
          <p className="notif-note">
            {describeRepeat(task.repeat)}. Changes here apply to every time it repeats. To
            move the whole series, change its due date on the task page.
          </p>
        ) : (
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
        )}

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

          <ReminderField
            variant="row"
            dueDate={date}
            dueTime={start}
            repeat={task.repeat}
            value={reminders}
            onChange={setReminders}
          />
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