import { useMemo } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import {
  buildCalendarEntries,
  buildEntriesByDay,
  monthHasEvents,
  monthTopicsFromEntries,
} from "@/lib/calendar-entries";

export function useCalendarEntries(viewMonth: Date) {
  const { fixtures, players, staff, coachProfile, sketchArea, trainingSessions } = useAppData();

  const entries = useMemo(
    () =>
      buildCalendarEntries({
        fixtures,
        players,
        staff,
        coachProfile,
        sketchArea,
        trainingSessions,
        viewMonth,
      }),
    [
      coachProfile.dateOfBirth,
      coachProfile.name,
      fixtures,
      players,
      sketchArea.calendarEvents,
      sketchArea.notes,
      sketchArea.tasks,
      staff,
      trainingSessions,
      viewMonth,
    ]
  );

  const entriesByDay = useMemo(() => buildEntriesByDay(entries), [entries]);

  const monthTopics = useMemo(
    () => monthTopicsFromEntries(entriesByDay, viewMonth),
    [entriesByDay, viewMonth]
  );

  const hasEventsThisMonth = useMemo(
    () => monthHasEvents(entriesByDay, viewMonth.getFullYear(), viewMonth.getMonth()),
    [entriesByDay, viewMonth]
  );

  return { entries, entriesByDay, monthTopics, hasEventsThisMonth };
}
