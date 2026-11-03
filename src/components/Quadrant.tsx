import type { QuadrantDef } from "../lib/quadrants";
import type { Task } from "../types/task";
import TaskCard from "./Taskcard";

interface Props {
  def: QuadrantDef;
  tasks: Task[];
}

export default function Quadrant({ def, tasks }: Props) {
  return (
    <section className="quadrant" data-q={def.id}>
      <header className="quadrant-title">
        <h2>{def.label}</h2>
        <span className="quadrant-count">{tasks.length}</span>
      </header>
      <p className="quadrant-hint">{def.hint}</p>
      {tasks.length === 0 ? (
        <p className="quadrant-empty">Nothing here</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}