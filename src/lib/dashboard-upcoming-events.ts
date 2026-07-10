import { calendarDayLisbon } from "@/lib/lisbon-date";
import type { Fixture, SketchAreaState, TrainingSession } from "@/types";

export type UpcomingCalendarEvent = {
  id: string;
  sortMs: number;
  day: string;
  title: string;
  timeLabel?: string;
};

function dayKey(iso: string): string {
  if (iso.length >= 10) return iso.slice(0, 10);
  return calendarDayLisbon(iso);
}

function formatTimeRange(start?: string, end?: string): string | undefined {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return undefined;
}

function parseDayStartMs(day: string, time?: string): number {
  const iso = time ? `${day}T${time}:00` : `${day}T12:00:00`;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : new Date(`${day}T12:00:00`).getTime();
}

export function formatScheduleDayHeader(dayIso: string, todayIso: string, isPt: boolean): string {
  if (dayIso === todayIso) return isPt ? "Hoje" : "Today";
  const today = new Date(`${todayIso}T12:00:00`);
  const target = new Date(`${dayIso}T12:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) return dayIso;
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 1) return isPt ? "Amanhã" : "Tomorrow";
  return target.toLocaleDateString(isPt ? "pt-PT" : "en-GB", { weekday: "long" });
}

export function buildUpcomingCalendarEvents(params: {
  trainingSessions: TrainingSession[];
  fixtures: Fixture[];
  sketchArea: SketchAreaState;
  todayIso?: string;
}): UpcomingCalendarEvent[] {
  const { trainingSessions, fixtures, sketchArea } = params;
  const t0 = params.todayIso ?? calendarDayLisbon(Date.now());
  const out: UpcomingCalendarEvent[] = [];

  for (const ev of sketchArea.calendarEvents) {
    if (ev.date < t0) continue;
    out.push({
      id: `sk-${ev.id}`,
      day: ev.date,
      sortMs: parseDayStartMs(ev.date, ev.timeStart),
      title: ev.title,
      timeLabel: formatTimeRange(ev.timeStart, ev.timeEnd),
    });
  }

  for (const s of trainingSessions) {
    const d = dayKey(s.date);
    if (d < t0) continue;
    out.push({
      id: `tr-${s.id}`,
      day: d,
      sortMs: parseDayStartMs(d),
      title: s.title,
      timeLabel: `${s.durationMin} min`,
    });
  }

  for (const f of fixtures) {
    const d = calendarDayLisbon(f.kickoff);
    if (d < t0) continue;
    const ko = new Date(f.kickoff);
    const timeLabel = Number.isFinite(ko.getTime())
      ? ko.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : undefined;
    out.push({
      id: `fx-${f.id}`,
      day: d,
      sortMs: ko.getTime(),
      title: `vs ${f.opponent}`,
      timeLabel,
    });
  }

  for (const note of sketchArea.notes) {
    if (!note.date || note.date < t0) continue;
    out.push({
      id: `nt-${note.id}`,
      day: note.date,
      sortMs: parseDayStartMs(note.date),
      title: note.title,
    });
  }

  for (const task of sketchArea.tasks) {
    if (task.completed || !task.dueDate || task.dueDate < t0) continue;
    out.push({
      id: `tk-${task.id}`,
      day: task.dueDate,
      sortMs: parseDayStartMs(task.dueDate),
      title: task.title,
    });
  }

  return out.sort((a, b) => a.sortMs - b.sortMs || a.title.localeCompare(b.title));
}

/** Group sorted events by day for compact preview rendering. */
export function groupUpcomingEventsByDay(
  events: UpcomingCalendarEvent[]
): { day: string; events: UpcomingCalendarEvent[] }[] {
  const groups: { day: string; events: UpcomingCalendarEvent[] }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.day === ev.day) last.events.push(ev);
    else groups.push({ day: ev.day, events: [ev] });
  }
  return groups;
}
