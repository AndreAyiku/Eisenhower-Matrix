import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import type { Task } from "../types/task";
import Quadrant from "./Quadrant";

interface Props {
  tasks: Task[];
}

export default function Matrix({ tasks }: Props) {
  const open = tasks.filter((t) => !t.completed);

  return (
    <div className="matrix">
      {QUADRANTS.map((def) => (
        <Quadrant
          key={def.id}
          def={def}
          tasks={open.filter((t) => quadrantOf(t) === def.id)}
        />
      ))}
    </div>
  );
}