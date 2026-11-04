import { useCallback, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import AddTaskSheet from "../components/AddTaskSheet";
import AppHeader from "../components/AppHeader";
import SegmentedControl from "../components/SegmentedControl";
import Matrix from "../components/Matrix";
import { useTasks } from "../store/tasksContext";

export default function MatrixScreen() {
  const { tasks } = useTasks();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <>
      <AppHeader
        eyebrow="Prioritise / Eisenhower"
        title="What matters most."
        subtitle="Importance creates impact. Urgency sets the pace."
      />
      <main className="content">
        <SegmentedControl />

        <div className="summary">
          <p className="summary-text">
            {openCount} open {openCount === 1 ? "task" : "tasks"} · All projects
          </p>
          <button
            type="button"
            className="add-btn"
            aria-label="Add task"
            onClick={() => setSheetOpen(true)}
          >
            <Plus size={22} strokeWidth={1.75} />
          </button>
        </div>

        <Matrix tasks={tasks} />

        <p className="guidance">
          <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>
            AI suggests a quadrant. You always have the final say. Tap a task to
            adjust its priority.
          </span>
        </p>
      </main>

      {sheetOpen && <AddTaskSheet onClose={closeSheet} />}
    </>
  );
}