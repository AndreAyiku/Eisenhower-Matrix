import type { QuadrantId, Task } from "../types/task";
import { quadrantOf } from "./quadrants";

export type FocusMode = "focus" | "short" | "long";
export type FocusStatus = "idle" | "running" | "paused";

export interface FocusSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cycle: number; // a long break is suggested after every Nth session
}

export const DEFAULT_SETTINGS: FocusSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cycle: 4,
};

const DEV = import.meta.env.DEV;

export const LIMITS = {
  focus: { min: DEV ? 1 : 5, max: 180 },
  short: { min: DEV ? 1 : 5, max: 10 },
  long: { min: DEV ? 1 : 10, max: 20 },
  cycle: { min: 2, max: 6 },
};

export const MAX_SESSIONS = 10;

/** How a task's focus time is split into sessions. */
export interface Plan {
  taskId: string | null;
  sessions: number;
  totalMin: number; // total focus time across all sessions
  fixedTotal: boolean; // true when totalMin comes from the task's estimate
}

export interface FocusState {
  mode: FocusMode;
  session: number; // 1-based position in the plan
  status: FocusStatus;
  taskId?: string | null; // undefined = automatic, null = no task
  plan?: Plan | null;
  planDone?: string; // id of a task whose plan just finished
  totalMs: number;
  remainingMs: number;
  endsAt?: number; // epoch ms, while running
  startedAt?: number; // epoch ms
  notice?: string;
}

export interface FocusLogEntry {
  id: string;
  taskId?: string;
  startedAt: string;
  minutes: number;
}

const SETTINGS_KEY = "ff-focus-settings-v1";
const STATE_KEY = "ff-focus-state-v2";
const LOG_KEY = "ff-focus-log-v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export function modeMs(mode: FocusMode, s: FocusSettings): number {
  const min = mode === "focus" ? s.focusMin : mode === "short" ? s.shortMin : s.longMin;
  return min * 60000;
}

function clampTo(value: unknown, range: { min: number; max: number }, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(range.max, Math.max(range.min, n));
}

export function clampSettings(s: FocusSettings): FocusSettings {
  return {
    focusMin: clampTo(s.focusMin, LIMITS.focus, DEFAULT_SETTINGS.focusMin),
    shortMin: clampTo(s.shortMin, LIMITS.short, DEFAULT_SETTINGS.shortMin),
    longMin: clampTo(s.longMin, LIMITS.long, DEFAULT_SETTINGS.longMin),
    cycle: clampTo(s.cycle, LIMITS.cycle, DEFAULT_SETTINGS.cycle),
  };
}

export function loadSettings(): FocusSettings {
  return clampSettings({
    ...DEFAULT_SETTINGS,
    ...(read<Partial<FocusSettings>>(SETTINGS_KEY) ?? {}),
  });
}

export function saveSettings(s: FocusSettings): void {
  write(SETTINGS_KEY, s);
}

export function initialState(settings: FocusSettings): FocusState {
  const total = modeMs("focus", settings);
  return { mode: "focus", session: 1, status: "idle", totalMs: total, remainingMs: total };
}

function validPlan(p: unknown): Plan | null {
  if (!p || typeof p !== "object") return null;
  const x = p as Partial<Plan>;
  if (typeof x.sessions !== "number" || typeof x.totalMin !== "number") return null;
  if (typeof x.fixedTotal !== "boolean") return null;
  if (x.taskId !== null && typeof x.taskId !== "string") return null;
  if (x.sessions < 1 || x.sessions > MAX_SESSIONS || x.totalMin <= 0) return null;
  return x as Plan;
}

export function loadState(settings: FocusSettings): FocusState {
  const saved = read<FocusState>(STATE_KEY);
  const modes = ["focus", "short", "long"];
  const statuses = ["idle", "running", "paused"];
  if (!saved || !modes.includes(saved.mode) || !statuses.includes(saved.status)) {
    return initialState(settings);
  }
  return { ...initialState(settings), ...saved, plan: validPlan(saved.plan) };
}

export function saveState(s: FocusState): void {
  write(STATE_KEY, s);
}

export function loadLog(): FocusLogEntry[] {
  const log = read<FocusLogEntry[]>(LOG_KEY);
  return Array.isArray(log) ? log : [];
}

/** Adds a finished focus session. Safe to call twice for the same session. */
export function logSession(entry: FocusLogEntry): void {
  const log = loadLog();
  if (log.some((e) => e.id === entry.id)) return;
  write(LOG_KEY, [...log, entry]);
}

// ---------- Planning sessions ----------

/** The most sessions allowed: each must be at least the minimum focus length. */
export function maxSessions(estimateMin?: number): number {
  if (!estimateMin) return MAX_SESSIONS;
  return Math.max(1, Math.min(MAX_SESSIONS, Math.floor(estimateMin / LIMITS.focus.min)));
}

function clampSessions(n: number, estimateMin?: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(maxSessions(estimateMin), Math.max(1, v));
}

/** Fewest sessions that keep each one within the preferred focus length. */
export function defaultSessions(task: Task | undefined, settings: FocusSettings): number {
  const estimate = task?.estimateMinutes;
  if (!estimate) return 1;
  return clampSessions(Math.ceil(estimate / Math.max(settings.focusMin, 1)), estimate);
}

export function makePlan(task: Task | undefined, sessions: number, settings: FocusSettings): Plan {
  const estimate = task?.estimateMinutes;
  const n = clampSessions(sessions, estimate);
  if (task && estimate) {
    return { taskId: task.id, sessions: n, totalMin: estimate, fixedTotal: true };
  }
  return { taskId: task?.id ?? null, sessions: n, totalMin: n * settings.focusMin, fixedTotal: false };
}

/** The saved plan if it still fits the task, otherwise a fresh default. */
export function resolvePlan(
  task: Task | undefined,
  saved: Plan | null | undefined,
  settings: FocusSettings
): Plan {
  const id = task?.id ?? null;
  const fixed = Boolean(task?.estimateMinutes);
  if (
    saved &&
    saved.taskId === id &&
    saved.fixedTotal === fixed &&
    (!fixed || saved.totalMin === task?.estimateMinutes)
  ) {
    return makePlan(task, saved.sessions, settings);
  }
  return makePlan(task, defaultSessions(task, settings), settings);
}

export function planSessionMs(plan: Plan): number {
  return Math.round((plan.totalMin * 60000) / plan.sessions);
}

/** "15 min" or "22m 30s". */
export function formatSessionLength(totalMin: number, sessions: number): string {
  const totalSec = Math.round((totalMin * 60) / sessions);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${m} min`;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
}

/** The break we suggest after a session: long after every Nth, short otherwise. */
export function breakAfter(session: number, settings: FocusSettings): "short" | "long" {
  return session % settings.cycle === 0 ? "long" : "short";
}

export function planSummary(plan: Plan, settings: FocusSettings) {
  let shorts = 0;
  let longs = 0;
  for (let k = 1; k < plan.sessions; k++) {
    if (breakAfter(k, settings) === "long") longs++;
    else shorts++;
  }
  return {
    shorts,
    longs,
    withBreaksMin: plan.totalMin + shorts * settings.shortMin + longs * settings.longMin,
  };
}

export function describeBreaks(shorts: number, longs: number): string {
  const parts: string[] = [];
  if (shorts) parts.push(`${shorts} short ${shorts === 1 ? "break" : "breaks"}`);
  if (longs) parts.push(`${longs} long ${longs === 1 ? "break" : "breaks"}`);
  return parts.length ? parts.join(" + ") : "no breaks";
}

// ---------- What happens when a timer reaches zero ----------

export function afterCompletion(state: FocusState, settings: FocusSettings): FocusState {
  const plan = state.plan ?? null;
  const sessionsTotal = plan ? plan.sessions : 1;

  if (state.mode === "focus") {
    if (state.session >= sessionsTotal) {
      const total = modeMs("focus", settings);
      return {
        mode: "focus",
        session: 1,
        status: "idle",
        taskId: state.taskId,
        plan: null,
        planDone: plan?.taskId ?? undefined,
        totalMs: total,
        remainingMs: total,
        notice:
          sessionsTotal === 1
            ? "Focus session complete. Nice work."
            : `All ${sessionsTotal} sessions done. Nice work.`,
      };
    }

    const mode = breakAfter(state.session, settings);
    const total = modeMs(mode, settings);
    return {
      mode,
      session: state.session,
      status: "idle",
      taskId: state.taskId,
      plan,
      totalMs: total,
      remainingMs: total,
      notice: `Session ${state.session} of ${sessionsTotal} complete. Choose your break.`,
    };
  }

  // A break just ended.
  const session = Math.min(state.session + 1, sessionsTotal);
  const total = modeMs("focus", settings);
  return {
    mode: "focus",
    session,
    status: "idle",
    taskId: state.taskId,
    plan,
    totalMs: total,
    remainingMs: total,
    notice: `Break over. Ready for session ${session} of ${sessionsTotal}?`,
  };
}

// ---------- Choosing a task ----------

const ORDER: Record<QuadrantId, number> = { do: 0, schedule: 1, delegate: 2, eliminate: 3 };

export function sortForFocus(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.completed)
    .sort(
      (a, b) =>
        ORDER[quadrantOf(a)] - ORDER[quadrantOf(b)] ||
        (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99") ||
        (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99")
    );
}

export function defaultTask(tasks: Task[]): Task | undefined {
  return sortForFocus(tasks)[0];
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}