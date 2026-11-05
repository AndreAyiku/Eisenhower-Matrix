import { useCallback, useEffect, useState } from "react";
import {
  afterCompletion,
  clampSettings,
  loadSettings,
  loadState,
  logSession,
  modeMs,
  planSessionMs,
  saveSettings,
  saveState,
  type FocusMode,
  type FocusSettings,
  type FocusState,
  type Plan,
} from "../lib/focus";
import { playChime, unlockSound } from "../lib/sound";
import { useNow } from "./useNow";

export function useFocus() {
  const [settings, setSettings] = useState<FocusSettings>(loadSettings);
  const [state, setState] = useState<FocusState>(() => {
    const saved = loadState(settings);
    const sessions = saved.plan?.sessions ?? settings.cycle;
    return { ...saved, session: Math.min(Math.max(saved.session, 1), sessions) };
  });

  const now = useNow(state.status === "running" ? 250 : 60000);
  const nowMs = now.getTime();

  useEffect(() => {
    saveState(state);
  }, [state]);

  // When the running timer reaches zero (also handles "ran out while away").
  useEffect(() => {
    if (state.status !== "running" || state.endsAt === undefined) return;
    if (state.endsAt > nowMs) return;
    const endsAt = state.endsAt;

    if (state.mode === "focus") {
      const startedAt = state.startedAt ?? endsAt - state.totalMs;
      logSession({
        id: String(startedAt),
        taskId: state.taskId ?? undefined,
        startedAt: new Date(startedAt).toISOString(),
        minutes: Math.round(state.totalMs / 60000),
      });
    }
    if (nowMs - endsAt < 5000) playChime();

    setState((prev) =>
      prev.status === "running" && prev.endsAt === endsAt
        ? afterCompletion(prev, settings)
        : prev
    );
  }, [state, nowMs, settings]);

  // Only meaningful while a session or break is running or paused.
  const totalMs = state.status === "idle" ? modeMs(state.mode, settings) : state.totalMs;
  let remainingMs: number;
  if (state.status === "running" && state.endsAt !== undefined) {
    remainingMs = state.endsAt - nowMs;
  } else if (state.status === "paused") {
    remainingMs = state.remainingMs;
  } else {
    remainingMs = totalMs;
  }
  remainingMs = Math.max(0, Math.min(totalMs, remainingMs));

  const begin = useCallback(
    (plan: Plan | null, taskId: string | null) => {
      unlockSound();
      const startedAt = Date.now();
      setState((prev) => {
        const sessions = plan ? plan.sessions : settings.cycle;
        const session = Math.min(Math.max(prev.session, 1), sessions);
        const total =
          prev.mode === "focus"
            ? plan
              ? planSessionMs(plan)
              : modeMs("focus", settings)
            : modeMs(prev.mode, settings);
        return {
          ...prev,
          plan,
          taskId,
          session,
          status: "running",
          totalMs: total,
          remainingMs: total,
          endsAt: startedAt + total,
          startedAt,
          notice: undefined,
          planDone: undefined,
        };
      });
    },
    [settings]
  );

  const pause = useCallback(() => {
    const at = Date.now();
    setState((prev) =>
      prev.status === "running" && prev.endsAt !== undefined
        ? {
            ...prev,
            status: "paused",
            remainingMs: Math.max(0, prev.endsAt - at),
            endsAt: undefined,
          }
        : prev
    );
  }, []);

  const resume = useCallback(() => {
    unlockSound();
    const at = Date.now();
    setState((prev) =>
      prev.status === "paused"
        ? { ...prev, status: "running", endsAt: at + prev.remainingMs }
        : prev
    );
  }, []);

  // Ends a focus session early. The time already focused is kept in the history.
  const end = useCallback(() => {
    const at = Date.now();
    if (state.mode === "focus" && state.status !== "idle") {
      const remaining =
        state.status === "running" && state.endsAt !== undefined
          ? state.endsAt - at
          : state.remainingMs;
      const elapsed = state.totalMs - Math.max(0, remaining);
      if (elapsed >= 60000) {
        const startedAt = state.startedAt ?? at - elapsed;
        logSession({
          id: String(startedAt),
          taskId: state.taskId ?? undefined,
          startedAt: new Date(startedAt).toISOString(),
          minutes: Math.round(elapsed / 60000),
        });
      }
    }
    setState((prev) => {
      const total = modeMs(prev.mode, settings);
      return {
        mode: prev.mode,
        session: prev.session,
        status: "idle",
        taskId: prev.taskId,
        plan: prev.plan,
        totalMs: total,
        remainingMs: total,
      };
    });
  }, [state, settings]);

  // Ends or skips a break and moves on to the next focus session.
  const skipBreak = useCallback(() => {
    setState((prev) => {
      if (prev.mode === "focus") return prev;
      const next = afterCompletion(prev, settings);
      const sessionsTotal = next.plan ? next.plan.sessions : settings.cycle;
      return {
        ...next,
        notice: `Break ended early. Ready for session ${next.session} of ${sessionsTotal}?`,
      };
    });
  }, [settings]);

  const setMode = useCallback(
    (mode: FocusMode) => {
      setState((prev) => {
        if (prev.status !== "idle") return prev;
        const total = modeMs(mode, settings);
        return { ...prev, mode, totalMs: total, remainingMs: total, notice: undefined };
      });
    },
    [settings]
  );

  const setTask = useCallback((taskId: string | null) => {
    setState((prev) => {
      const switchingAway = prev.plan && prev.plan.taskId !== taskId;
      return switchingAway
        ? { ...prev, taskId, plan: null, session: 1, planDone: undefined }
        : { ...prev, taskId };
    });
  }, []);

  const choosePlan = useCallback((plan: Plan) => {
    setState((prev) => (prev.status === "idle" ? { ...prev, plan } : prev));
  }, []);

  const resetPlan = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "idle") return prev;
      const total = modeMs("focus", settings);
      return {
        ...prev,
        mode: "focus",
        session: 1,
        plan: null,
        planDone: undefined,
        notice: undefined,
        totalMs: total,
        remainingMs: total,
      };
    });
  }, [settings]);

  const dismissNotice = useCallback(() => {
    setState((prev) => ({ ...prev, notice: undefined, planDone: undefined }));
  }, []);

  const updateSettings = useCallback((raw: FocusSettings) => {
    const next = clampSettings(raw);
    setSettings(next);
    saveSettings(next);
    setState((prev) => {
      const session = Math.min(prev.session, prev.plan?.sessions ?? next.cycle);
      if (prev.status !== "idle") return { ...prev, session };
      const total = modeMs(prev.mode, next);
      return { ...prev, session, totalMs: total, remainingMs: total };
    });
  }, []);

  return {
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
  };
}