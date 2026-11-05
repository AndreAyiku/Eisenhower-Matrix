import { Check, X } from "lucide-react";
import { useSheet } from "../hooks/useSheet";
import { formatDue } from "../lib/dates";
import { sortForFocus } from "../lib/focus";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import type { Task } from "../types/task";

interface Props {
  tasks: Task[];
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export default function TaskPickerSheet({ tasks, selectedId, onSelect, onClose }: Props) {
  useSheet(onClose);
  const open = sortForFocus(tasks);

  const choose = (id: string | null) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h2 id="picker-title">Choose a task</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <ul className="picker-list">
          <li>
            <button type="button" className="picker-row" onClick={() => choose(null)}>
              <span className="picker-text">
                <span className="picker-title">No specific task</span>
                <span className="picker-meta">Just focus</span>
              </span>
              {selectedId === null && <Check size={18} strokeWidth={2} aria-label="Selected" />}
            </button>
          </li>
          {open.map((task) => {
            const q = QUADRANTS.find((x) => x.id === quadrantOf(task))!;
            return (
              <li key={task.id}>
                <button type="button" className="picker-row" onClick={() => choose(task.id)}>
                  <span className="picker-text">
                    <span className="picker-title">{task.title}</span>
                    <span className="picker-meta">
                      {q.label} · {formatDue(task.dueDate)}
                      {task.estimateMinutes ? ` · ${task.estimateMinutes} min` : ""}
                    </span>
                  </span>
                  {selectedId === task.id && (
                    <Check size={18} strokeWidth={2} aria-label="Selected" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {open.length === 0 && (
          <p className="cal-empty">No open tasks yet. Add one from the Tasks tab.</p>
        )}
      </div>
    </div>
  );
}