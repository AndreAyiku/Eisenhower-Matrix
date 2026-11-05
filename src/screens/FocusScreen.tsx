import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Pause, Play, ShieldCheck, X } from "lucide-react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { FocusRing, SessionDots } from "../components/FocusVisuals";
import FocusSettingsSheet from "../components/FocusSettingsSheet";
import SegmentedControl from "../components/SegmentedControl";
import TaskPickerSheet from "../components/TaskPickerSheet";
import { useFocus } from "../hooks/useFocus";
import { formatEstimate } from "../lib/format";
import {
  breakAfter,
  defaultTask,
  describeBreaks,
  formatClock,
  formatElapsed,
  formatSessionLength,
  modeMs,
  planSessionMs,
  planSummary,
  resolvePlan,
  sessionOptions,
  type FocusMode,
} from "../lib/focus";
import { QUADRANTS, quadrantOf } from "../lib/quadrants";
import { useTasks } from "../store/tasksContext";

const MODE_LABEL: Record<FocusMode, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};
const LABEL_MODE: Record<string, FocusMode> = {
  Focus: "focus",
  "Short break": "short",
  "Long break": "long",
};
const TABS = Object.values(MODE_LABEL);

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
    setMode,
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

  const running = state.status !== "idle";
  const isFocus = state.mode === "focus";

  // The plan is frozen while a session runs, and follows the task otherwise.
  const livePlan = running ? (state.plan ?? null) : resolvePlan(activeTask, state.plan, settings);
  const sessionsTotal = livePlan ? livePlan.sessions : settings.cycle;
  const session = Math.min(Math.max(state.session, 1), sessionsTotal);
  const planLength = livePlan ? formatSessionLength(livePlan.estimateMin, livePlan.sessions) : null;

  const modeTotalMs = modeMs(state.mode, settings);
  const idleTotalMs = isFocus && livePlan ? planSessionMs(livePlan) : modeTotalMs;
  const displayTotalMs = running ? totalMs : idleTotalMs;
  const displayRemainingMs = running ? remainingMs : idleTotalMs;
  const elapsedMs = displayTotalMs - displayRemainingMs;
  const progress = displayTotalMs > 0 ? elapsedMs / displayTotalMs : 0;
  const modeMin = Math.round(modeTotalMs / 60000);

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
  const showSplit = isFocus && livePlan !== null && session === 1;
  const summary = livePlan
    ? planSummary(livePlan.estimateMin, livePlan.sessions, settings)
    : null;

  let sessionLine: string;
  if (!isFocus) {
    sessionLine = `After session ${session} of ${sessionsTotal}`;
  } else if (livePlan) {
    const last = session >= livePlan.sessions;
    const breakMin = breakAfter(session, settings) === "long" ? settings.longMin : settings.shortMin;
    sessionLine =
      `Session ${session} of ${livePlan.sessions} · ${planLength}${livePlan.sessions > 1 ? " each" : ""}` +
      (last ? "" : ` · ${breakMin}-minute break afterwards`);
  } else {
    const breakMin = session >= settings.cycle ? settings.longMin : settings.shortMin;
    sessionLine = `Session ${session} of ${settings.cycle} · ${breakMin}-minute break afterwards`;
  }

  const doneTask = state.planDone
    ? tasks.find((t) => t.id === state.planDone && !t.completed)
    : undefined;

  return (
    <div className="app focus">
      <AppHeader eyebrow="Focus / Pomodoro" title="One thing at a time." />

      <main className="content focus-content">
        <SegmentedControl
          tabs={TABS}
          active={MODE_LABEL[state.mode]}
          onChange={(label) => setMode(LABEL_MODE[label])}
        />

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
          {isFocus && livePlan && session > 1 && (
            <>
              {" · "}
              <button type="button" className="link-btn" onClick={resetPlan}>
                Start over
              </button>
            </>
          )}
        </p>

        {isFocus && (
          <section className="working-card" aria-label="Working on">
            <div className="working-top">
              <span className="working-label">Working on</span>
              {quadrant && (
                <span className="chip chip-q" data-q={quadrant.id}>
                  {quadrant.label}
                </span>
              )}
            </div>
            <h2 className="working-title">{activeTask ? activeTask.title : "No specific task"}</h2>
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
        )}

        {isFocus && !livePlan && activeTask && (
          <p className="split-hint">
            Give this task an estimated time to split it into sessions.
          </p>
        )}

        {showSplit && livePlan && summary && (
          <section className="split" aria-label="Split into sessions">
            <h3 className="split-title">Split it into sessions</h3>
            <div className="split-grid" role="radiogroup" aria-label="Number of sessions">
              {sessionOptions(livePlan.estimateMin).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === livePlan.sessions}
                  className={`split-opt${n === livePlan.sessions ? " on" : ""}`}
                  onClick={() => choosePlan({ ...livePlan, sessions: n })}
                >
                  <span className="split-n">
                    {n} {n === 1 ? "session" : "sessions"}
                  </span>
                  <span className="split-len">
                    {formatSessionLength(livePlan.estimateMin, n)}
                    {n === 1 ? "" : " each"}
                  </span>
                </button>
              ))}
            </div>
            <p className="split-summary">
              {livePlan.sessions === 1
                ? `One ${planLength} session. No breaks.`
                : `${livePlan.sessions} sessions of ${planLength} · ${describeBreaks(summary.shorts, summary.longs)} · ${formatEstimate(summary.totalMin)} in all`}
            </p>
          </section>
        )}

        <button
          type="button"
          className="primary-btn"
          onClick={() => begin(livePlan, activeTask?.id ?? null)}
        >
          <Play size={20} strokeWidth={1.75} aria-hidden="true" />
          {isFocus ? "Begin focus" : "Begin break"}
        </button>

        {!isFocus && (
          <button type="button" className="quiet-btn skip-btn" onClick={skipBreak}>
            Skip break
          </button>
        )}

        <div className="focus-foot">
          <span>
            {isFocus
              ? livePlan
                ? `${formatEstimate(livePlan.estimateMin)} planned`
                : `${settings.focusMin} min focus · ${settings.shortMin} min break`
              : `${modeMin} min break · ${settings.focusMin} min focus`}
          </span>
          <button type="button" className="text-btn" onClick={() => setAdjustOpen(true)}>
            Adjust
          </button>
        </div>
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