import { useCallback, useEffect, useState } from "react";
import {
  afterCompletion,
  loadSettings,
  loadState,
  logSession,
  modeMs,
  saveSettings,
  saveState,
  type FocusMode,
  type FocusSettings,
  type FocusState,
} from "../lib/focus";
import { playChime, unlockSound } from "../lib/sound";
import { useNow } from "./useNow";

export function useFocus() {
  const [settings, setSettings] = useState<FocusSettings>(loadSettings);
  const [state, setState] = useState<FocusState>(() => {
    const saved = loadState(settings);
    return { ...saved, session: Math.min(Math.max(saved.session, 1), settings.cycle) };
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

  const begin = useCallback(() => {
    unlockSound();
    const startedAt = Date.now();
    setState((prev) => {
      const total = modeMs(prev.mode, settings);
      return {
        ...prev,
        status: "running",
        totalMs: total,
        remainingMs: total,
        endsAt: startedAt + total,
        startedAt,
        notice: undefined,
      };
    });
  }, [settings]);

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

  const end = useCallback(() => {
    setState((prev) => {
      const total = modeMs(prev.mode, settings);
      return {
        mode: prev.mode,
        session: prev.session,
        status: "idle",
        taskId: prev.taskId,
        totalMs: total,
        remainingMs: total,
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
    setState((prev) => ({ ...prev, taskId }));
  }, []);

  const dismissNotice = useCallback(() => {
    setState((prev) => ({ ...prev, notice: undefined }));
  }, []);

  const updateSettings = useCallback((next: FocusSettings) => {
    setSettings(next);
    saveSettings(next);
    setState((prev) => {
      const session = Math.min(prev.session, next.cycle);
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
    setMode,
    setTask,
    dismissNotice,
    updateSettings,
  };
}