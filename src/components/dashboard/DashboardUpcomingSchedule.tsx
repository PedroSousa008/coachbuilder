"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { formatRelativeDay } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { cn } from "@/lib/utils";

function dayKey(iso: string): string {
  if (iso.length >= 10) return iso.slice(0, 10);
  return calendarDayLisbon(iso);
}

function todayKey(): string {
  return calendarDayLisbon(Date.now());
}

type ScheduleRow = {
  key: string;
  day: string;
  label: string;
  sub?: string;
  isToday: boolean;
};

export function DashboardUpcomingSchedule() {
  const { trainingSessions, fixtures, sketchArea } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const t0 = todayKey();

  const rows = useMemo(() => {
    const out: ScheduleRow[] = [];

    for (const ev of sketchArea.calendarEvents) {
      if (ev.date < t0) continue;
      const time = ev.timeStart ? ` · ${ev.timeStart}` : "";
      out.push({
        key: `sk-${ev.id}`,
        day: ev.date,
        label: ev.title,
        sub: `${ev.category.replace(/_/g, " ")}${time}`,
        isToday: ev.date === t0,
      });
    }
    for (const s of trainingSessions) {
      const d = dayKey(s.date);
      if (d < t0) continue;
      out.push({
        key: `tr-${s.id}`,
        day: d,
        label: s.title,
        sub: `${s.durationMin} min · ${s.intensity}`,
        isToday: d === t0,
      });
    }
    for (const f of fixtures) {
      const d = calendarDayLisbon(f.kickoff);
      if (d < t0) continue;
      const ko = new Date(f.kickoff).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      out.push({
        key: `fx-${f.id}`,
        day: d,
        label: `vs ${f.opponent}`,
        sub: `${ko} · ${f.venue}`,
        isToday: d === t0,
      });
    }
    for (const task of sketchArea.tasks) {
      if (task.completed || !task.dueDate || task.dueDate < t0) continue;
      out.push({
        key: `tk-${task.id}`,
        day: task.dueDate,
        label: task.title,
        sub: isPt ? "Tarefa" : "Task",
        isToday: task.dueDate === t0,
      });
    }

    return out
      .sort((a, b) => a.day.localeCompare(b.day) || a.label.localeCompare(b.label))
      .slice(0, 10);
  }, [fixtures, sketchArea.calendarEvents, sketchArea.tasks, trainingSessions, t0, isPt]);

  const hasOverdue = sketchArea.tasks.some((x) => !x.completed && x.dueDate && x.dueDate < t0);

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/[0.08]"
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">
            {isPt ? "Agenda próxima" : "Upcoming schedule"}
          </h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            {isPt ? "Calendário, treinos e tarefas" : "Calendar, training and tasks"}
          </p>
        </div>
        <Link
          href="/app/calendar"
          className="shrink-0 text-[13px] font-medium text-zinc-500 transition-colors duration-200 hover:text-accent"
        >
          {isPt ? "Calendário" : "Calendar"}
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {rows.length === 0 ? (
          <DashboardEmptyState
            icon={CalendarDays}
            title={isPt ? "Nada agendado" : "Nothing scheduled"}
            description={
              isPt
                ? "Ainda não há eventos futuros. Usa o Calendário para jogos ou o Sketch Area para notas e tarefas."
                : "No upcoming events yet. Use Calendar for fixtures or Sketch Area for notes and tasks."
            }
            actionLabel={isPt ? "Abrir calendário" : "Open calendar"}
            actionHref="/app/calendar"
            className="flex-1"
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.key}
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors duration-200",
                  row.isToday
                    ? "border-accent/20 bg-accent/[0.04]"
                    : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-white">{row.label}</p>
                    {row.sub ? <p className="mt-0.5 text-[13px] text-zinc-500">{row.sub}</p> : null}
                  </div>
                  <span className="shrink-0 text-[13px] text-zinc-600">
                    {row.isToday ? (isPt ? "Hoje" : "Today") : formatRelativeDay(row.day)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasOverdue ? (
          <p className="mt-4 text-[13px] text-amber-400/90">
            {isPt ? "Tens tarefas em atraso no Sketch Area." : "You have overdue tasks in Sketch Area."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
