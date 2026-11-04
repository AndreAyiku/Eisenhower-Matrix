import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { completedLabel } from "../lib/dates";
import { estimateOptions, formatEstimate } from "../lib/format";
import { newId } from "../lib/id";
import type { Subtask } from "../types/task";

interface Props {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export default function SubtaskList({ subtasks, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const total = subtasks.length;
  const doneCount = subtasks.filter((s) => s.done).length;
  const nextId = subtasks.find((s) => !s.done)?.id;

  const update = (id: string, patch: Partial<Subtask>) =>
    onChange(subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => onChange(subtasks.filter((s) => s.id !== id));

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onChange([...subtasks, { id: newId(), title, done: false }]);
    setDraft("");
  };

  const toggle = (s: Subtask) =>
    update(
      s.id,
      s.done
        ? { done: false, completedAt: undefined }
        : { done: true, completedAt: new Date().toISOString() }
    );

  const metaText = (s: Subtask) =>
    [
      s.id === nextId ? "Next step" : null,
      s.estimateMinutes ? formatEstimate(s.estimateMinutes) : "Add time",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <section className="steps" aria-labelledby="steps-heading">
      <div className="steps-heading">
        <h2 id="steps-heading">The smaller steps</h2>
        {total > 0 && (
          <span className="steps-count">
            {doneCount} / {total}
          </span>
        )}
      </div>

      <ul className="steps-list">
        {subtasks.map((s) => (
          <li key={s.id} className={`step${s.done ? " done" : ""}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={s.done}
              aria-label={s.done ? "Mark step as not done" : "Mark step as done"}
              className={`check${s.done ? " done" : ""}`}
              onClick={() => toggle(s)}
            >
              {s.done && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
            </button>

            <div className="step-content">
              <input
                className="step-title"
                value={s.title}
                placeholder="Step title"
                aria-label="Step title"
                onChange={(e) => update(s.id, { title: e.target.value })}
              />
              {s.done ? (
                <span className="step-meta">{completedLabel(s.completedAt)}</span>
              ) : (
                <span className="step-meta step-meta-edit">
                  {metaText(s)}
                  <select
                    className="prop-native"
                    aria-label="Estimated time for this step"
                    value={s.estimateMinutes ?? 0}
                    onChange={(e) =>
                      update(s.id, { estimateMinutes: Number(e.target.value) || undefined })
                    }
                  >
                    <option value={0}>No estimate</option>
                    {estimateOptions(s.estimateMinutes).map((m) => (
                      <option key={m} value={m}>
                        {formatEstimate(m)}
                      </option>
                    ))}
                  </select>
                </span>
              )}
            </div>

            <button
              type="button"
              className="step-remove"
              aria-label={`Remove step ${s.title}`}
              onClick={() => remove(s.id)}
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="add-step"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="check add" aria-hidden="true">
          <Plus size={14} strokeWidth={2} />
        </span>
        <input
          className="step-title"
          placeholder="Add a smaller step"
          aria-label="Add a smaller step"
          enterKeyHint="done"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
        />
      </form>
    </section>
  );
}