import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import AppHeader from "../components/AppHeader";
import SegmentedControl from "../components/SegmentedControl";
import Matrix from "../components/Matrix";
import { SAMPLE_TASKS } from "../lib/sampleTasks";
import type { Task } from "../types/task";

export default function MatrixScreen() {
  const [tasks] = useState<Task[]>(SAMPLE_TASKS);
  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <>
      <AppHeader />
      <main className="content">
        <SegmentedControl />

        <div className="summary">
          <p className="summary-text">
            {openCount} open {openCount === 1 ? "task" : "tasks"} · All projects
          </p>
          <button type="button" className="add-btn" aria-label="Add task">
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
    </>
  );
}