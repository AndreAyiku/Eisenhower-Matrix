import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Clock, Plus, Sparkles, X } from "lucide-react";
import AutoTextarea from "./AutoTextarea";
import Switch from "./Switch";
import { formatLocalDateTime, fromLocalInput } from "../lib/dates";
import { estimateOptions, formatEstimate } from "../lib/format";
import { newId } from "../lib/id";
import { openPicker } from "../lib/picker";
import {
  flagsLabel,
  suggestionReason,
  suggestPriority,
  type PriorityFlags,
} from "../lib/priority";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import { useTasks } from "../store/tasksContext";

interface Props {
  onClose: () => void;
}

export default function AddTaskSheet({ onClose }: Props) {
  const { addTask } = useTasks();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [estimate, setEstimate] = useState(0);
  const [manual, setManual] = useState<PriorityFlags | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const due = fromLocalInput(dueLocal);
  const suggestion = suggestPriority(due.date);
  const flags = manual ?? suggestion;
  const quadrant = QUADRANTS.find((q) => q.id === quadrantOf(flags))!;
  const hint = manual
    ? `You set this priority: ${flagsLabel(manual)}.`
    : `${suggestionReason(due.date)} Suggested: ${flagsLabel(suggestion)}.`;

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
                  onClick={() => setDueLocal("")}
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
                onChange={(e) => setDueLocal(e.target.value)}
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

        <section className="auto-card" aria-label="Automatic priority">
          <div className="auto-head">
            <span className="auto-title">
              <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
              {manual ? "Your priority" : "Automatic priority"}
            </span>
            <span className="chip chip-q" data-q={quadrant.id}>
              {quadrant.label}
            </span>
          </div>
          <p className="auto-text">{hint}</p>
          <button
            type="button"
            className="auto-link"
            aria-expanded={adjusting}
            onClick={() => setAdjusting((v) => !v)}
          >
            Adjust importance &amp; urgency
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>

          {adjusting && (
            <div className="adjust-panel">
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
              {manual && (
                <button type="button" className="auto-link" onClick={() => setManual(null)}>
                  Use automatic priority
                </button>
              )}
            </div>
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