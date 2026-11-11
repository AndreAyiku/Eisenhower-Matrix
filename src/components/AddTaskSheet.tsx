import { useState, type FormEvent } from "react";
import { CalendarDays, Clock, Plus, X } from "lucide-react";
import AutoTextarea from "./AutoTextarea";
import ReminderField from "./ReminderField";
import RepeatField from "./RepeatField";
import Switch from "./Switch";
import { useSheet } from "../hooks/useSheet";
import { formatLocalDateTime, fromLocalInput } from "../lib/dates";
import { estimateOptions, formatEstimate } from "../lib/format";
import { newId } from "../lib/id";
import { openPicker } from "../lib/picker";
import { suggestionReason, suggestPriority, type PriorityFlags } from "../lib/priority";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import { useTasks } from "../store/tasksContext";
import type { ReminderRule, RepeatRule } from "../types/task";

interface Props {
  onClose: () => void;
  initialDue?: string;
}

export default function AddTaskSheet({ onClose, initialDue }: Props) {
  useSheet(onClose);
  const { addTask } = useTasks();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [dueLocal, setDueLocal] = useState(initialDue ?? "");
  const [estimate, setEstimate] = useState(0);
  const [repeat, setRepeat] = useState<RepeatRule | undefined>(undefined);
  const [reminders, setReminders] = useState<ReminderRule[]>([]);
  const [manual, setManual] = useState<PriorityFlags | null>(null);

  const due = fromLocalInput(dueLocal);
  const flags = manual ?? suggestPriority(due.date);
  const quadrant = QUADRANTS.find((q) => q.id === quadrantOf(flags))!;

  const changeDue = (value: string) => {
    setDueLocal(value);
    const { date } = fromLocalInput(value);
    setRepeat((r) => (r && date ? { ...r, anchor: date } : undefined));
    if (!date) setReminders([]);
  };

  const changeRepeat = (rule?: RepeatRule) => {
    setRepeat(rule);
    if (rule) setReminders((r) => r.filter((x) => x.type !== "custom"));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) return;
    const now = new Date().toISOString();
    addTask({
      id: newId(),
      title,
      notes: notes.trim() || undefined,
      important: flags.important,
      urgent: flags.urgent,
      completed: false,
      tags: [],
      dueDate: due.date,
      dueTime: due.time,
      repeat: due.date && repeat ? { ...repeat, anchor: due.date } : undefined,
      reminders: due.date ? reminders : [],
      estimateMinutes: estimate || undefined,
      subtasks: [],
      createdAt: now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h2 id="sheet-title">Capture a task</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <p className="sheet-sub">Get it out of your head. We’ll help with the rest.</p>

        <label className="field">
          <span className="field-label">Task name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What needs doing?"
            enterKeyHint="done"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">Notes</span>
          <AutoTextarea
            className="field-input field-textarea"
            value={notes}
            onValueChange={setNotes}
            placeholder="Optional details"
          />
        </label>

        <div className="field-row">
          <div className="field">
            <span className="field-label">Due</span>
            <div className="field-box">
              <span className={dueLocal ? "" : "placeholder"}>
                {dueLocal ? formatLocalDateTime(dueLocal) : "No date"}
              </span>
              {dueLocal ? (
                <button
                  type="button"
                  className="field-clear"
                  aria-label="Clear due date"
                  onClick={() => changeDue("")}
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              ) : (
                <CalendarDays className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              )}
              <input
                className="prop-native"
                type="datetime-local"
                aria-label="Due date"
                value={dueLocal}
                onClick={openPicker}
                onChange={(e) => changeDue(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <span className="field-label">Duration</span>
            <div className="field-box">
              <span className={estimate ? "" : "placeholder"}>
                {estimate ? formatEstimate(estimate) : "Not set"}
              </span>
              <Clock className="field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              <select
                className="prop-native"
                aria-label="Duration"
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value))}
              >
                <option value={0}>Not set</option>
                {estimateOptions(estimate).map((m) => (
                  <option key={m} value={m}>
                    {formatEstimate(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <RepeatField variant="field" dueDate={due.date} value={repeat} onChange={changeRepeat} />

        <ReminderField
          variant="field"
          dueDate={due.date}
          dueTime={due.time}
          repeat={repeat}
          value={reminders}
          onChange={setReminders}
        />

        <section className="field" aria-label="Priority">
          <div className="priority-head">
            <span className="field-label">Priority</span>
            <span className="chip chip-q" data-q={quadrant.id}>
              {quadrant.label}
            </span>
          </div>
          <div className="priority-card">
            <div className="priority-row">
              <div className="priority-text">
                <span className="priority-label">Important</span>
                <span className="priority-hint">Moves your goals forward</span>
              </div>
              <Switch
                label="Important"
                checked={flags.important}
                onChange={(v) => setManual({ ...flags, important: v })}
              />
            </div>
            <div className="priority-row">
              <div className="priority-text">
                <span className="priority-label">Urgent</span>
                <span className="priority-hint">Needs attention soon</span>
              </div>
              <Switch
                label="Urgent"
                checked={flags.urgent}
                onChange={(v) => setManual({ ...flags, urgent: v })}
              />
            </div>
          </div>
          {!manual && (
            <span className="field-hint">
              {suggestionReason(due.date)} We set these for you. Change them any time.
            </span>
          )}
        </section>

        <button type="submit" className="primary-btn" disabled={!name.trim()}>
          <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
          Add task
        </button>
      </form>
    </div>
  );
}