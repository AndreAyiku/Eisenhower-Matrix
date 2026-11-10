import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Play, Timer } from "lucide-react";
import AutoTextarea from "../components/AutoTextarea";
import PropertyRow from "../components/PropertyRow";
import ReminderField from "../components/ReminderField";
import SubtaskList from "../components/SubtaskList";
import Switch from "../components/Switch";
import { formatDateTime, fromLocalInput, toLocalInput } from "../lib/dates";
import { estimateOptions, formatEstimate } from "../lib/format";
import { openPicker } from "../lib/picker";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import { useTasks } from "../store/tasksContext";
import type { Task } from "../types/task";

/** Stable text version of a task, used to tell whether anything changed. */
function snapshot(task: Task): string {
  return JSON.stringify(task, (key, value: unknown) => {
    if (key === "updatedAt") return undefined;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      );
    }
    return value;
  });
}

/** Tidy a draft before saving: no blank title, no blank steps. */
function cleaned(task: Task): Task {
  return {
    ...task,
    title: task.title.trim() || "Untitled task",
    subtasks: task.subtasks
      .filter((s) => s.title.trim())
      .map((s) => ({ ...s, title: s.title.trim() })),
  };
}

export default function TaskDetailScreen() {
  const { taskId } = useParams();
  const { getTask } = useTasks();
  const stored = taskId ? getTask(taskId) : undefined;

  if (!stored) return <Navigate to="/tasks" replace />;
  return <TaskEditor key={stored.id} stored={stored} />;
}

function TaskEditor({ stored }: { stored: Task }) {
  const { updateTask, deleteTask } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();

  const [draft, setDraft] = useState<Task>(stored);

  const dirty = snapshot(draft) !== snapshot(stored);

  const patch = (p: Partial<Task>) => setDraft((d) => ({ ...d, ...p }));

  const goBack = () =>
    location.key !== "default" ? navigate(-1) : navigate("/tasks", { replace: true });

  const handleBack = () => {
    if (dirty && !window.confirm("Discard your changes?")) return;
    goBack();
  };

  const save = () => {
    const next = cleaned(draft);
    updateTask(next.id, next);
    goBack();
  };

  const discard = () => setDraft(stored);

  const toggleDone = () => {
    const next = cleaned({ ...draft, completed: !draft.completed });
    updateTask(next.id, next);
    if (next.completed) goBack();
    else setDraft(next);
  };

  const remove = () => {
    if (window.confirm("Delete this task? This can’t be undone.")) {
      deleteTask(draft.id);
    }
  };

  const quadrantId = quadrantOf(draft);
  const quadrant = QUADRANTS.find((q) => q.id === quadrantId)!;

  const dueText = formatDateTime(draft.dueDate, draft.dueTime);
  const urgentHint = draft.dueDate
    ? `Due ${dueText.startsWith("Today") ? "today" + dueText.slice(5) : dueText}`
    : "Needs attention soon";

  return (
    <div className="app detail">
      <header className="header">
        <div className="header-top">
          <button type="button" className="icon-btn" aria-label="Back" onClick={handleBack}>
            <ArrowLeft size={22} strokeWidth={1.75} />
          </button>
        </div>
        <AutoTextarea
          singleLine
          className="title-input"
          aria-label="Task title"
          placeholder="Task title"
          value={draft.title}
          onValueChange={(v) => patch({ title: v })}
        />
      </header>

      <main className="detail-body">
        <div className="chips">
          <span className="chip chip-q" data-q={quadrantId}>
            {quadrant.label}
          </span>
          {draft.tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>

        <AutoTextarea
          className="notes-input"
          aria-label="Notes"
          placeholder="Add notes"
          value={draft.notes ?? ""}
          onValueChange={(v) => patch({ notes: v || undefined })}
        />

        <section className="priority-card" aria-label="Priority">
          <div className="priority-row">
            <div className="priority-text">
              <span className="priority-label">Important</span>
              <span className="priority-hint">Moves your goals forward</span>
            </div>
            <Switch
              label="Important"
              checked={draft.important}
              onChange={(v) => patch({ important: v })}
            />
          </div>
          <div className="priority-row">
            <div className="priority-text">
              <span className="priority-label">Urgent</span>
              <span className="priority-hint">{urgentHint}</span>
            </div>
            <Switch
              label="Urgent"
              checked={draft.urgent}
              onChange={(v) => patch({ urgent: v })}
            />
          </div>
        </section>

        <section className="props" aria-label="Task properties">
          <PropertyRow
            icon={Timer}
            label="Estimated time"
            value={draft.estimateMinutes ? formatEstimate(draft.estimateMinutes) : "Not set"}
          >
            <select
              className="prop-native"
              aria-label="Estimated time"
              value={draft.estimateMinutes ?? 0}
              onChange={(e) =>
                patch({ estimateMinutes: Number(e.target.value) || undefined })
              }
            >
              <option value={0}>Not set</option>
              {estimateOptions(draft.estimateMinutes).map((m) => (
                <option key={m} value={m}>
                  {formatEstimate(m)}
                </option>
              ))}
            </select>
          </PropertyRow>

          <PropertyRow
            icon={CalendarDays}
            label="Due date"
            value={dueText}
            hasValue={Boolean(draft.dueDate)}
            onClear={() => patch({ dueDate: undefined, dueTime: undefined, reminder: undefined })}
            clearLabel="Clear due date"
          >
            <input
              className="prop-native"
              type="datetime-local"
              aria-label="Due date"
              value={toLocalInput(draft.dueDate, draft.dueTime)}
              onClick={openPicker}
              onChange={(e) => {
                const { date, time } = fromLocalInput(e.target.value);
                patch({ dueDate: date, dueTime: time });
              }}
            />
          </PropertyRow>

          <ReminderField
            variant="row"
            dueDate={draft.dueDate}
            dueTime={draft.dueTime}
            value={draft.reminder}
            onChange={(reminder) => patch({ reminder })}
          />
        </section>

        <SubtaskList
          subtasks={draft.subtasks}
          onChange={(subtasks) => patch({ subtasks })}
        />

        <div className="detail-footer">
          {dirty ? (
            <>
              <button type="button" className="primary-btn" onClick={save}>
                Save changes
              </button>
              <div className="quiet-actions">
                <button type="button" className="quiet-btn" onClick={discard}>
                  Discard changes
                </button>
              </div>
            </>
          ) : (
            <>
              <Link className="primary-btn" to="/focus" state={{ taskId: draft.id }}>
                <Play size={20} strokeWidth={1.75} aria-hidden="true" />
                Start focus session
              </Link>
              <div className="quiet-actions">
                <button type="button" className="quiet-btn" onClick={toggleDone}>
                  {draft.completed ? "Mark as not done" : "Mark as done"}
                </button>
                <button type="button" className="quiet-btn danger" onClick={remove}>
                  Delete task
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}