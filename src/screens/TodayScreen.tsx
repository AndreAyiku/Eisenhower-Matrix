import { useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { useNow } from "../hooks/useNow";
import { fmtMin, formatDayLong } from "../lib/calendar";
import { toISODate } from "../lib/dates";
import { quadrantOf } from "../lib/quadrants";
import {
  bigThree,
  dayProgress,
  focusedMinutesToday,
  formatFocused,
  greeting,
  nextBlock,
  shortSpan,
  taskMeta,
} from "../lib/today";
import { useTasks } from "../store/tasksContext";
import type { Task } from "../types/task";

export default function TodayScreen() {
  const { tasks, updateTask, completeTask } = useTasks();
  const now = useNow();
  const today = toISODate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Finished one-off tasks stay in place (struck through) until you leave this screen.
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  // Repeating tasks that were just marked done, as they were before, so they can be undone.
  const [advanced, setAdvanced] = useState<Map<string, Task>>(() => new Map());

  const { done, total } = dayProgress(tasks, today);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const focused = focusedMinutesToday(today);
  const view = tasks.map((t) => advanced.get(t.id) ?? t);
  const big = bigThree(view, kept);
  const next = nextBlock(tasks, today, nowMin);

  const caption =
    total === 0
      ? "Nothing due today."
      : done === total
        ? "Everything planned for today is done."
        : done > 0
          ? "A little progress adds up."
          : "Start with one small thing.";

  const isDone = (task: Task) => task.completed || advanced.has(task.id);

  const toggle = (task: Task) => {
    const before = advanced.get(task.id);
    if (before) {
      updateTask(task.id, {
        dueDate: before.dueDate,
        dueTime: before.dueTime,
        subtasks: before.subtasks,
        lastDoneAt: before.lastDoneAt,
      });
      setAdvanced((prev) => {
        const copy = new Map(prev);
        copy.delete(task.id);
        return copy;
      });
      return;
    }
    if (task.repeat && task.dueDate && !task.completed) {
      setAdvanced((prev) => new Map(prev).set(task.id, task));
      completeTask(task.id);
      return;
    }
    if (!task.completed) setKept((prev) => new Set(prev).add(task.id));
    updateTask(task.id, { completed: !task.completed });
  };

  const when = next
    ? next.startMin > nowMin
      ? `In ${shortSpan(next.startMin - nowMin)}`
      : `Now, ends in ${shortSpan(next.endMin - nowMin)}`
    : "";
  const detail = next
    ? [next.task.calendar ? `${next.task.calendar} calendar` : null, ...next.task.tags]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <>
      <AppHeader
        eyebrow={formatDayLong(today)}
        title={greeting(now.getHours())}
        subtitle="A clear plan. Space for what matters."
      />

      <main className="content">
        <section className="today-card" aria-label="Today’s progress">
          <div className="today-stats">
            <div className="stat-main">
              <p className="stat-count">
                <span className="stat-done">{done}</span> / {total}{" "}
                {total === 1 ? "task" : "tasks"}
              </p>
              <p className="stat-sub">{caption}</p>
            </div>
            <div className="stat-right">
              <p className="stat-time">{formatFocused(focused)}</p>
              <p className="stat-sub">focused today</p>
            </div>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-label="Tasks done today"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </section>

        <section className="today-section" aria-labelledby="big-three">
          <div className="section-head">
            <h2 id="big-three">Your big three</h2>
            <Link to="/tasks">View matrix</Link>
          </div>

          {big.length === 0 ? (
            <p className="cal-empty">You’re all caught up. Add a task from the Tasks tab.</p>
          ) : (
            <ul className="big-list">
              {big.map((task) => {
                const finished = isDone(task);
                return (
                  <li
                    key={task.id}
                    className={`big-row${finished ? " done" : ""}`}
                    data-q={quadrantOf(task)}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={finished}
                      aria-label={
                        finished
                          ? `Mark ${task.title} as not done`
                          : `Mark ${task.title} as done`
                      }
                      className="big-check"
                      onClick={() => toggle(task)}
                    >
                      <span className={`check${finished ? " done" : ""}`}>
                        {finished && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                      </span>
                    </button>
                    <Link className="big-main" to={`/tasks/${task.id}`}>
                      <span className="big-title">{task.title}</span>
                      <span className="big-meta">{taskMeta(task, today)}</span>
                    </Link>
                    <span className="big-dot" aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="today-section" aria-labelledby="up-next">
          <div className="section-head">
            <h2 id="up-next">Up next</h2>
            <Link to="/calendar">Calendar</Link>
          </div>

          {next ? (
            <Link to={`/tasks/${next.task.id}`} className="agenda-card task">
              <span className="agenda-title">{next.task.title}</span>
              <span className="agenda-meta">
                {fmtMin(next.startMin)}–{fmtMin(next.endMin)} · {when}
              </span>
              {detail && <span className="agenda-meta">{detail}</span>}
            </Link>
          ) : (
            <p className="cal-empty">
              Nothing else scheduled today. Give a task a due time and it will show up
              here.
            </p>
          )}
        </section>
      </main>
    </>
  );
}