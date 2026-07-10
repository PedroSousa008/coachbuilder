import type {
  CoachProfileState,
  MatchFixture,
  Player,
  SketchAreaState,
  StaffMember,
  TrainingSession,
} from "@/types";

export type CalendarEntryKind =
  | "fixture"
  | "birthday"
  | "sketch_event"
  | "note"
  | "training"
  | "task";

export interface CalendarEntry {
  id: string;
  date: string;
  label: string;
  kind: CalendarEntryKind;
  deletable: boolean;
}

export function dayIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthDayKey(isoDate: string): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function trainingSessionDay(iso: string): string {
  if (iso.length >= 10) return iso.slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayIsoLocal(d);
}

export function buildCalendarEntries(params: {
  fixtures: MatchFixture[];
  players: Player[];
  staff: StaffMember[];
  coachProfile: Pick<CoachProfileState, "name" | "dateOfBirth">;
  sketchArea: Pick<SketchAreaState, "calendarEvents" | "notes" | "tasks">;
  trainingSessions: TrainingSession[];
  viewMonth: Date;
}): CalendarEntry[] {
  const { fixtures, players, staff, coachProfile, sketchArea, trainingSessions, viewMonth } = params;
  const entries: CalendarEntry[] = [];

  for (const f of fixtures) {
    entries.push({
      id: f.id,
      date: dayIsoLocal(new Date(f.kickoff)),
      label: `Jogo: vs ${f.opponent}`,
      kind: "fixture",
      deletable: true,
    });
  }

  const pushBirthday = (name: string, subtitle: string, dob?: string) => {
    const k = monthDayKey(dob ?? "");
    if (!k) return;
    const [mm, dd] = k.split("-");
    const month = Number(mm);
    const day = Number(dd);
    for (let y = viewMonth.getFullYear() - 2; y <= viewMonth.getFullYear() + 4; y++) {
      const d = new Date(y, month - 1, day);
      if (Number.isNaN(d.getTime())) continue;
      entries.push({
        id: `birthday-${subtitle}-${name}-${y}-${month}-${day}`,
        date: dayIsoLocal(d),
        label: `Aniversário do ${name} (${subtitle})`,
        kind: "birthday",
        deletable: false,
      });
    }
  };

  pushBirthday(coachProfile.name.trim() || "Treinador", "Treinador", coachProfile.dateOfBirth);
  for (const p of players) pushBirthday(p.name, `Jogador #${p.number}`, p.dateOfBirth);
  for (const s of staff) pushBirthday(s.name, `Staff ${s.role}`, s.dateOfBirth);

  for (const ev of sketchArea.calendarEvents) {
    entries.push({
      id: ev.id,
      date: ev.date,
      label: `Evento: ${ev.title}`,
      kind: "sketch_event",
      deletable: true,
    });
  }

  for (const note of sketchArea.notes) {
    if (!note.date) continue;
    entries.push({
      id: note.id,
      date: note.date,
      label: `Nota Sketch: ${note.title}`,
      kind: "note",
      deletable: true,
    });
  }

  for (const s of trainingSessions) {
    entries.push({
      id: `training-${s.id}`,
      date: trainingSessionDay(s.date),
      label: `Treino: ${s.title}`,
      kind: "training",
      deletable: false,
    });
  }

  for (const task of sketchArea.tasks) {
    if (task.completed || !task.dueDate) continue;
    entries.push({
      id: `task-${task.id}`,
      date: task.dueDate,
      label: `Tarefa: ${task.title}`,
      kind: "task",
      deletable: false,
    });
  }

  return entries;
}

export function buildEntriesByDay(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

export function monthHasEvents(
  entriesByDay: Map<string, CalendarEntry[]>,
  year: number,
  month: number
): boolean {
  for (const date of entriesByDay.keys()) {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() === year && d.getMonth() === month) return true;
  }
  return false;
}

export function monthTopicsFromEntries(
  entriesByDay: Map<string, CalendarEntry[]>,
  viewMonth: Date
): Array<{ date: string; label: string; kind: CalendarEntryKind }> {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const out: Array<{ date: string; label: string; kind: CalendarEntryKind }> = [];
  for (const [date, list] of entriesByDay.entries()) {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;
    for (const item of list) out.push({ date: item.date, label: item.label, kind: item.kind });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

/** Subtle dot colors for compact calendar previews. */
export const CALENDAR_ENTRY_DOT_CLASS: Record<CalendarEntryKind, string> = {
  fixture: "bg-zinc-300",
  birthday: "bg-emerald-400/80",
  sketch_event: "bg-sky-400/80",
  note: "bg-amber-400/80",
  training: "bg-violet-400/80",
  task: "bg-orange-400/80",
};
