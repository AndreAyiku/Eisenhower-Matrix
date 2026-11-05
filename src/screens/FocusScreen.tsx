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
import { defaultTask, formatClock, formatElapsed, type FocusMode } from "../lib/focus";
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
    setMode,
    setTask,
    dismissNotice,
    updateSettings,
  } = useFocus();
  const { tasks } = useTasks();
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

  const chosen =
    typeof state.taskId === "string"
      ? tasks.find((t) => t.id === state.taskId && !t.completed)
      : undefined;
  const activeTask = state.taskId === null ? undefined : (chosen ?? defaultTask(tasks));
  const nextStep = activeTask?.subtasks.find((s) => !s.done);
  const quadrant = activeTask
    ? QUADRANTS.find((q) => q.id === quadrantOf(activeTask))
    : undefined;

  const isFocus = state.mode === "focus";
  const elapsedMs = totalMs - remainingMs;
  const progress = totalMs > 0 ? elapsedMs / totalMs : 0;
  const modeMin =
    state.mode === "focus"
      ? settings.focusMin
      : state.mode === "short"
        ? settings.shortMin
        : settings.longMin;
  const afterBreakMin = state.session >= settings.cycle ? settings.longMin : settings.shortMin;

  const goBack = () =>
    location.key !== "default" ? navigate(-1) : navigate("/tasks", { replace: true });

  const confirmEnd = () => {
    if (window.confirm("End this session? Time spent so far won’t be counted.")) end();
  };

  // ---------- Running or paused ----------
  if (state.status !== "idle") {
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
              {formatClock(remainingMs)}
            </span>
            <span className="ring-sub">
              {paused
                ? "paused"
                : `remaining in this ${isFocus ? "session" : "break"}`}
            </span>
          </FocusRing>

          <div className="running-task">
            <h2>{isFocus ? (activeTask?.title ?? "Free focus") : "Break time"}</h2>
            <p>
              {isFocus
                ? (nextStep?.title ?? (activeTask ? "Stay with it" : "No task selected"))
                : `Session ${state.session} of ${settings.cycle} done`}
            </p>
          </div>

          <SessionDots total={settings.cycle} filled={state.session} variant="round" />

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
            <button type="button" className="session-btn secondary" onClick={confirmEnd}>
              End session
            </button>
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

        <FocusRing progress={0}>
          <span className="ring-time">{formatClock(remainingMs)}</span>
          <span className="ring-sub">Ready when you are</span>
        </FocusRing>

        <SessionDots total={settings.cycle} filled={state.session} variant="bars" />

        <p className="session-line">
          {isFocus
            ? `Session ${state.session} of ${settings.cycle} · ${afterBreakMin}-minute break afterwards`
            : `After session ${state.session} of ${settings.cycle}`}
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

        <button type="button" className="primary-btn" onClick={begin}>
          <Play size={20} strokeWidth={1.75} aria-hidden="true" />
          {isFocus ? "Begin focus" : "Begin break"}
        </button>

        <div className="focus-foot">
          <span>
            {isFocus
              ? `${settings.focusMin} min focus · ${settings.shortMin} min break`
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