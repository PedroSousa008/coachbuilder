"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildUpcomingCalendarEvents,
  formatScheduleDayHeader,
  groupUpcomingEventsByDay,
} from "@/lib/dashboard-upcoming-events";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

export function DashboardUpcomingSchedule() {
  const { trainingSessions, fixtures, sketchArea } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const t0 = calendarDayLisbon(Date.now());

  const allEvents = useMemo(
    () =>
      buildUpcomingCalendarEvents({
        trainingSessions,
        fixtures,
        sketchArea,
        todayIso: t0,
      }),
    [fixtures, sketchArea, trainingSessions, t0]
  );

  const previewEvents = allEvents.slice(0, PREVIEW_LIMIT);
  const extraCount = Math.max(0, allEvents.length - PREVIEW_LIMIT);
  const grouped = useMemo(() => groupUpcomingEventsByDay(previewEvents), [previewEvents]);

  const hasOverdue = sketchArea.tasks.some((x) => !x.completed && x.dueDate && x.dueDate < t0);

  return (
    <Link
      href="/app/calendar"
      className={cn(
        "group flex h-full flex-col rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-[#141414] hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
      )}
    >
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {isPt ? "Agenda próxima" : "Upcoming schedule"}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {isPt ? "Pré-visualização do calendário" : "Calendar preview"}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {previewEvents.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-zinc-500">
              <CalendarDays className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-[15px] font-medium text-zinc-300">
              {isPt ? "Nada agendado" : "Nothing scheduled"}
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-500">
              {isPt
                ? "Os teus próximos treinos, jogos e tarefas aparecem aqui automaticamente."
                : "Your upcoming trainings, matches and tasks will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.day}>
                <p className="text-[13px] font-medium capitalize text-zinc-500">
                  {formatScheduleDayHeader(group.day, t0, isPt)}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.events.map((ev) => (
                    <li key={ev.id} className="flex gap-2 text-[15px] leading-snug">
                      <span className="text-zinc-600" aria-hidden>
                        •
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-200">{ev.title}</p>
                        {ev.timeLabel ? (
                          <p className="mt-0.5 text-[13px] tabular-nums text-zinc-500">{ev.timeLabel}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {extraCount > 0 ? (
              <p className="text-[13px] text-zinc-600">
                {isPt ? `+${extraCount} mais` : `+${extraCount} more`}
              </p>
            ) : null}
          </div>
        )}

        {hasOverdue ? (
          <p className="mt-4 text-[13px] text-amber-400/90">
            {isPt ? "Tens tarefas em atraso no Sketch Area." : "You have overdue tasks in Sketch Area."}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
