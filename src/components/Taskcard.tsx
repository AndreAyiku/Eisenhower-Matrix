import { Link } from "react-router";
import type { Task } from "../types/task";
import { formatDue } from "../lib/dates";

interface Props {
  task: Task;
}

export default function TaskCard({ task }: Props) {
  const meta = [
    formatDue(task.dueDate),
    task.estimateMinutes ? `${task.estimateMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="task">
      <Link className="task-link" to={`/tasks/${task.id}`}>
        <div className="task-title-row">
          <span className="task-dot" aria-hidden="true" />
          <span className="task-title">{task.title}</span>
        </div>
        <span className="task-meta">{meta}</span>
      </Link>
    </li>
  );
}