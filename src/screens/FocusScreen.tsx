import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  Pause,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { FocusRing, SessionDots } from "../components/FocusVisuals";
import FocusSettingsSheet from "../components/FocusSettingsSheet";
import NumberStepper from "../components/NumberStepper";
import TaskPickerSheet from "../components/TaskPickerSheet";
import { useFocus } from "../hooks/useFocus";
import { formatEstimate } from "../lib/format";
import {
  LIMITS,
  MAX_SESSIONS,
  breakAfter,
  defaultTask,
  describeBreaks,
  formatClock,
  formatElapsed,
  formatSessionLength,
  makePlan,
  maxSessions,
  modeMs,
  planSessionMs,
  planSummary,
  resolvePlan,
  type Plan,
} from "../lib/focus";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import { useTasks } from "../store/tasksContext";

export default function FocusScreen() {
  const {
    settings,
    state,
    remainingMs,
    totalMs,
    begin,
    pause,
    resume,
    end,
    skipBreak,
    chooseBreak,
    setTask,
    choosePlan,
    resetPlan,
    dismissNotice,
    updateSettings,
  } = useFocus();
  const { tasks, updateTask } = useTasks();
  const location = useLocation();
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [snapNote, setSnapNote] = useState<string | null>(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closeAdjust = useCallback(() => setAdjustOpen(false), []);

  // Pick up the task chosen on the task page ("Start focus session").
  const appliedRef = useRef(false);
  const requestedId = (location.state as { taskId?: string } | null)?.taskId;
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    if (requestedId && state.status === "idle") setTask(requestedId);
  }, [requestedId, state.status, setTask]);

  // Keep the screen awake while a session is running (where the phone allows it).
  const lockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (state.status !== "running" || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) void sentinel.release();
        else lockRef.current = sentinel;
      } catch {
        // not allowed right now
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lockRef.current?.release().catch(() => undefined);
      lockRef.current = null;
    };
  }, [state.status]);

  // ---------- What we're working on ----------
  const chosen =
    typeof state.taskId === "string"
      ? tasks.find((t) => t.id === state.taskId && !t.completed)
      : undefined;
  const activeTask = state.taskId === null ? undefined : (chosen ?? defaultTask(tasks));
  const nextStep = activeTask?.subtasks.find((s) => !s.done);
  const quadrant = activeTask
    ? QUADRANTS.find((q) => q.id === quadrantOf(activeTask))
    : undefined;
  const estimate = activeTask?.estimateMinutes;

  const running = state.status !== "idle";
  const isFocus = state.mode === "focus";

  // The plan is frozen while a timer runs, and follows the task otherwise.
  const idlePlan = resolvePlan(activeTask, state.plan, settings);
  const plan: Plan | null = running ? (state.plan ?? null) : idlePlan;
  const sessionsTotal = plan ? plan.sessions : 1;
  const session = Math.min(Math.max(state.session, 1), sessionsTotal);
  const planLength = plan ? formatSessionLength(plan.totalMin, plan.sessions) : "";

  const idleTotalMs = isFocus ? planSessionMs(idlePlan) : modeMs(state.mode, settings);
  const displayTotalMs = running ? totalMs : idleTotalMs;
  const displayRemainingMs = running ? remainingMs : idleTotalMs;
  const elapsedMs = displayTotalMs - displayRemainingMs;
  const progress = displayTotalMs > 0 ? elapsedMs / displayTotalMs : 0;

  const goBack = () =>
    location.key !== "default" ? navigate(-1) : navigate("/tasks", { replace: true });

  const confirmEnd = () => {
    if (
      window.confirm(
        "End this session? The time you’ve focused so far is kept, and you can start the session again."
      )
    ) {
      end();
    }
  };

  // ---------- Running or paused ----------
  if (running) {
    const paused = state.status === "paused";
    return (
      <div className="app focus running">
        <header className="header">
          <div className="header-top">
            <button type="button" className="icon-btn" aria-label="Back" onClick={goBack}>
              <ArrowLeft size={22} strokeWidth={1.75} />
            </button>
          </div>
          <h1 className="title">{isFocus ? "Stay with this moment." : "Rest for a moment."}</h1>
        </header>

        <main className="content focus-content">
          <p className="quiet-line">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              {isFocus ? "Distractions quieted. You’re in focus." : "Step away from the screen."}
            </span>
          </p>

          <FocusRing progress={progress}>
            <span className="ring-time" role="timer" aria-live="off">
              {formatClock(displayRemainingMs)}
            </span>
            <span className="ring-sub">
              {paused ? "paused" : `remaining in this ${isFocus ? "session" : "break"}`}
            </span>
          </FocusRing>

          <div className="running-task">
            <h2>{isFocus ? (activeTask?.title ?? "Free focus") : "Break time"}</h2>
            <p>
              {isFocus
                ? (nextStep?.title ?? (activeTask ? "Stay with it" : "No task selected"))
                : `Session ${session} of ${sessionsTotal} done`}
            </p>
          </div>

          <SessionDots total={sessionsTotal} filled={session} variant="round" />

          <div className="session-actions">
            {paused ? (
              <button type="button" className="session-btn primary" onClick={resume}>
                <Play size={20} strokeWidth={1.75} aria-hidden="true" />
                Resume
              </button>
            ) : (
              <button type="button" className="session-btn primary" onClick={pause}>
                <Pause size={20} strokeWidth={1.75} aria-hidden="true" />
                Pause
              </button>
            )}
            {isFocus ? (
              <button type="button" className="session-btn secondary" onClick={confirmEnd}>
                End session
              </button>
            ) : (
              <button type="button" className="session-btn secondary" onClick={skipBreak}>
                End break
              </button>
            )}
          </div>

          <p className="elapsed-note">
            {paused ? (
              <>Paused. Resume when you’re ready.</>
            ) : isFocus ? (
              <>
                {formatElapsed(elapsedMs)} of uninterrupted attention.
                <br />
                That’s something worth protecting.
              </>
            ) : (
              <>{formatElapsed(elapsedMs)} of rest. Come back refreshed.</>
            )}
          </p>
        </main>
      </div>
    );
  }

  // ---------- Ready ----------
  const suggested = breakAfter(session, settings);
  const summary = planSummary(idlePlan, settings);
  const maxN = maxSessions(estimate);
  const showSessions = isFocus && session === 1;

  const rhythm = [
    idlePlan.fixedTotal ? null : `${settings.focusMin} min focus`,
    `${settings.shortMin} min short`,
    `${settings.longMin} min long`,
  ]
    .filter(Boolean)
    .join(" · ");

  const sessionLine = isFocus
    ? `Session ${session} of ${sessionsTotal} · ${planLength}${sessionsTotal > 1 ? " each" : ""}`
    : `After session ${session} of ${sessionsTotal}`;

  const stepperHint =
    estimate && maxN < MAX_SESSIONS
      ? `Up to ${maxN} for this task: each session needs at least ${LIMITS.focus.min} minutes.`
      : `Choose 1 to ${maxN} sessions.`;

  const summaryText =
    idlePlan.sessions === 1
      ? `One ${planLength} session. No breaks needed.`
      : `${idlePlan.sessions} sessions of ${planLength} each · ${describeBreaks(summary.shorts, summary.longs)} suggested · about ${formatEstimate(summary.withBreaksMin)} with breaks`;

  const handleClamp = (typed: number, snapped: number) => {
    if (typed > snapped) {
      setSnapNote(
        estimate
          ? `${typed} sessions is too many: each session needs at least ${LIMITS.focus.min} minutes, so the most for a ${formatEstimate(estimate)} task is ${snapped}.`
          : `The most you can plan is ${snapped} sessions.`
      );
    } else {
      setSnapNote("You need at least 1 session.");
    }
  };

  const doneTask = state.planDone
    ? tasks.find((t) => t.id === state.planDone && !t.completed)
    : undefined;

  return (
    <div className="app focus">
      <AppHeader eyebrow="Focus / Pomodoro" title="One thing at a time." />

      <main className="content focus-content">
        <div className="rhythm">
          <span className="rhythm-text">{rhythm}</span>
          <button type="button" className="adjust-btn" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
            Adjust
          </button>
        </div>

        {state.notice && (
          <p className="focus-notice" role="status">
            <span>{state.notice}</span>
            <button type="button" aria-label="Dismiss" onClick={dismissNotice}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </p>
        )}

        {doneTask && (
          <section className="done-card" aria-label="Task finished?">
            <p>Mark “{doneTask.title}” as done?</p>
            <div className="done-actions">
              <button
                type="button"
                className="session-btn primary"
                onClick={() => {
                  updateTask(doneTask.id, { completed: true });
                  dismissNotice();
                }}
              >
                Mark as done
              </button>
              <button type="button" className="session-btn secondary" onClick={dismissNotice}>
                Not yet
              </button>
            </div>
          </section>
        )}

        <FocusRing progress={0}>
          <span className="ring-time">{formatClock(displayRemainingMs)}</span>
          <span className="ring-sub">Ready when you are</span>
        </FocusRing>

        <SessionDots total={sessionsTotal} filled={session} variant="bars" />

        <p className="session-line">
          {sessionLine}
          {isFocus && session > 1 && (
            <>
              {" · "}
              <button type="button" className="link-btn" onClick={resetPlan}>
                Start over
              </button>
            </>
          )}
        </p>

        {isFocus ? (
          <>
            <section className="working-card" aria-label="Working on">
              <div className="working-top">
                <span className="working-label">Working on</span>
                {quadrant && (
                  <span className="chip chip-q" data-q={quadrant.id}>
                    {quadrant.label}
                  </span>
                )}
              </div>
              <h2 className="working-title">
                {activeTask ? activeTask.title : "No specific task"}
              </h2>
              <p className="working-next">
                {activeTask
                  ? nextStep
                    ? `Next: ${nextStep.title}`
                    : "No smaller steps yet"
                  : "Free focus"}{" "}
                ·{" "}
                <button type="button" className="link-btn" onClick={() => setPickerOpen(true)}>
                  Change task
                </button>
              </p>
            </section>

            {showSessions && (
              <section className="sessions-card" aria-label="Sessions">
                <NumberStepper
                  label="Number of sessions"
                  hint={stepperHint}
                  value={idlePlan.sessions}
                  min={1}
                  max={maxN}
                  unit={idlePlan.sessions === 1 ? "session" : "sessions"}
                  onChange={(n) => {
                    setSnapNote(null);
                    choosePlan(makePlan(activeTask, n, settings));
                  }}
                  onClamp={handleClamp}
                />
                {snapNote && (
                  <p className="snap-note" role="status">
                    {snapNote}
                  </p>
                )}
                <p className="split-summary">{summaryText}</p>
                {!idlePlan.fixedTotal && (
                  <p className="split-hint">
                    {activeTask
                      ? "This task has no estimated time, so each session is your focus length. Add an estimate to the task to split its time instead."
                      : "No task selected, so each session is your focus length."}
                  </p>
                )}
              </section>
            )}
          </>
        ) : (
          <section className="break-choice" aria-label="Choose your break">
            <div className="break-grid" role="radiogroup" aria-label="Break length">
              {(["short", "long"] as const).map((kind) => {
                const min = kind === "short" ? settings.shortMin : settings.longMin;
                const on = state.mode === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`break-opt${on ? " on" : ""}`}
                    onClick={() => chooseBreak(kind)}
                  >
                    {suggested === kind && <span className="break-tag">Suggested</span>}
                    <span className="break-name">
                      {kind === "short" ? "Short break" : "Long break"}
                    </span>
                    <span className="break-len">{min} min</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button type="button" className="primary-btn" onClick={() => begin(idlePlan, activeTask?.id ?? null)}>
          <Play size={20} strokeWidth={1.75} aria-hidden="true" />
          {isFocus ? "Begin focus" : "Begin break"}
        </button>

        {!isFocus && (
          <button type="button" className="quiet-btn skip-btn" onClick={skipBreak}>
            Skip break
          </button>
        )}
      </main>

      <BottomNav />

      {pickerOpen && (
        <TaskPickerSheet
          tasks={tasks}
          selectedId={state.taskId === null ? null : activeTask?.id}
          onSelect={setTask}
          onClose={closePicker}
        />
      )}
      {adjustOpen && (
        <FocusSettingsSheet
          settings={settings}
          onSave={updateSettings}
          onClose={closeAdjust}
        />
      )}
    </div>
  );
}