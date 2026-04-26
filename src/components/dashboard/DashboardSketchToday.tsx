"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PenLine } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";
function dayKey(iso: string): string {
  if (iso.length >= 10) return iso.slice(0, 10);
  return calendarDayLisbon(iso);
}

function todayKey(): string {
  return calendarDayLisbon(Date.now());
}

export function DashboardSketchToday() {
  const { trainingSessions, fixtures, sketchArea } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const t0 = todayKey();

  const lines = useMemo(() => {
    const out: { key: string; label: string; sub?: string }[] = [];
    for (const ev of sketchArea.calendarEvents) {
      if (ev.date !== t0) continue;
      const time = ev.timeStart ? ` · ${ev.timeStart}` : "";
      out.push({ key: `sk-${ev.id}`, label: ev.title, sub: `${ev.category.replace(/_/g, " ")}${time}` });
    }
    for (const s of trainingSessions) {
      if (dayKey(s.date) !== t0) continue;
      out.push({ key: `tr-${s.id}`, label: s.title, sub: `${s.durationMin} min · ${s.intensity}` });
    }
    for (const f of fixtures) {
      if (calendarDayLisbon(f.kickoff) !== t0) continue;
      const ko = new Date(f.kickoff).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      out.push({ key: `fx-${f.id}`, label: `vs ${f.opponent}`, sub: `${ko} · ${f.venue}` });
    }
    for (const task of sketchArea.tasks) {
      if (task.completed) continue;
      if (task.dueDate !== t0) continue;
      out.push({ key: `tk-${task.id}`, label: task.title, sub: isPt ? "Tarefa" : "Task" });
    }
    return out;
  }, [fixtures, sketchArea.calendarEvents, sketchArea.tasks, trainingSessions, t0, isPt]);

  const hasPlan = lines.length > 0;

  return (
    <Card hover className={hasPlan ? "" : "border-dashed border-zinc-700/60 bg-zinc-900/20"}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4 text-accent" strokeWidth={1.75} />
            {isPt ? "Hoje" : "Today"}
          </CardTitle>
          <p className="text-xs text-zinc-500">{t0}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:gap-3">
          <Link href="/app/calendar" className="text-xs font-medium text-accent hover:underline">
            {isPt ? "Calendário" : "Calendar"}
          </Link>
          <Link href="/app/sketch" className="text-xs font-medium text-zinc-400 hover:text-accent hover:underline">
            Sketch Area
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {hasPlan ? (
          <ul className="space-y-2">
            {lines.map((row) => (
              <li key={row.key} className="rounded-lg border border-surface-border/80 bg-surface-raised/20 px-3 py-2">
                <p className="text-sm font-medium text-white">{row.label}</p>
                {row.sub ? <p className="text-[11px] text-zinc-500">{row.sub}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            {isPt
              ? "Nada agendado para hoje. Usa o Calendário para jogos da equipa ou o Sketch Area para notas e eventos."
              : "Nothing scheduled for today. Use Calendar for team fixtures or Sketch Area for notes and events."}
          </p>
        )}
        {sketchArea.tasks.some((x) => !x.completed && x.dueDate && x.dueDate < t0) ? (
          <p className="mt-3 text-xs text-amber-400/90">
            {isPt ? "Tens tarefas em atraso no Sketch Area." : "You have overdue tasks in Sketch Area."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
