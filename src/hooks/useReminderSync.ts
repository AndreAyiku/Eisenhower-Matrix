import { useCallback, useEffect, useRef } from "react";
import { PUSH_CHANGED } from "../lib/push";
import { syncTaskReminders } from "../lib/reminders";
import { useTasks } from "../store/tasksContext";

export function useReminderSync(): void {
  const { tasks } = useTasks();
  const latest = useRef(tasks);

  useEffect(() => {
    latest.current = tasks;
  }, [tasks]);

  // Whenever tasks change (after a short pause), send the upcoming reminders.
  useEffect(() => {
    const timer = setTimeout(() => void syncTaskReminders(tasks), 1500);
    return () => clearTimeout(timer);
  }, [tasks]);

  const syncNow = useCallback((force: boolean) => {
    void syncTaskReminders(latest.current, force);
  }, []);

  // Also when the app comes back to the front, and when notifications are switched on.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") syncNow(false);
    };
    const onPushChanged = () => syncNow(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(PUSH_CHANGED, onPushChanged);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(PUSH_CHANGED, onPushChanged);
    };
  }, [syncNow]);
}