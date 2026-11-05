import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddTaskSheet from "../components/AddTaskSheet";
import AppHeader from "../components/AppHeader";
import DayAgenda from "../components/DayAgenda";
import DayStrip from "../components/DayStrip";
import EditBlockSheet from "../components/EditBlockSheet";
import SegmentedControl from "../components/SegmentedControl";
import WeekGrid from "../components/WeekGrid";
import { useNow } from "../hooks/useNow";
import {
  addDays,
  blocksForDay,
  defaultDue,
  formatDayLong,
  formatMonthYear,
  formatWeekRange,
  parseISO,
  timeZoneLabel,
  unscheduledForDay,
  weekDays,
} from "../lib/calendar";
import { toISODate } from "../lib/dates";
import { useTasks } from "../store/tasksContext";
import type { Task } from "../types/task";

type View = "Day" | "Week";
const TABS = ["Day", "Week"];

export default function CalendarScreen() {
  const { tasks } = useTasks();
  const now = useNow();
  const today = toISODate(now);

  const [view, setView] = useState<View>("Day");
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const closeEditor = useCallback(() => setEditing(null), []);

  const days = useMemo(() => weekDays(selected), [selected]);
  const weekRange = formatWeekRange(days);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const tz = timeZoneLabel();

  const shiftWeek = (direction: -1 | 1) =>
    setSelected((s) => addDays(s, direction * 7));

  const weekBlocks = useMemo(
    () => days.flatMap((d) => blocksForDay(tasks, d)),
    [tasks, days]
  );

  return (
    <>
      <AppHeader
        eyebrow={`Organise / ${view === "Day" ? formatMonthYear(selected) : weekRange}`}
        title={view === "Day" ? "Time, with intention." : "A week with balance."}
      />

      <main className="content">
        <SegmentedControl
          tabs={TABS}
          active={view}
          onChange={(tab) => setView(tab as View)}
        />

        {view === "Day" ? (
          <>
            <DayStrip
              days={days}
              selected={selected}
              today={today}
              onSelect={setSelected}
              onShiftWeek={shiftWeek}
            />

            <div className="day-heading">
              <h2>{formatDayLong(selected)}</h2>
              <div className="day-meta">
                {tz && <span>{tz} ·</span>}
                <button type="button" className="text-btn" onClick={() => setSheetOpen(true)}>
                  + Add
                </button>
              </div>
            </div>

            <DayAgenda
              blocks={blocksForDay(tasks, selected)}
              unscheduled={unscheduledForDay(tasks, selected)}
              showNow={selected === today}
              nowMin={nowMin}
              onSelect={setEditing}
            />
          </>
        ) : (
          <>
            <div className="week-range">
              <h2>
                {weekRange} {parseISO(days[6]).getFullYear()}
              </h2>
              <div className="week-nav">
                <button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)}>
                  <ChevronLeft size={18} strokeWidth={1.75} />
                </button>
                <button type="button" aria-label="Next week" onClick={() => shiftWeek(1)}>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <WeekGrid
              days={days}
              blocks={weekBlocks}
              today={today}
              onPickDay={(iso) => {
                setSelected(iso);
                setView("Day");
              }}
              onSelect={setEditing}
            />
          </>
        )}
      </main>

      {sheetOpen && (
        <AddTaskSheet onClose={closeSheet} initialDue={defaultDue(selected, now)} />
      )}

      {editing && (
        <EditBlockSheet
          key={editing.id}
          task={editing}
          onClose={closeEditor}
          onSaved={setSelected}
        />
      )}
    </>
  );
}