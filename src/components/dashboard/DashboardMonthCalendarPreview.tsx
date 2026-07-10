"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { useCalendarEntries } from "@/hooks/useCalendarEntries";
import { buildMonthGrid, isSameLocalDay } from "@/lib/coaching-professionals-calendar";
import {
  CALENDAR_ENTRY_DOT_CLASS,
  dayIsoLocal,
  type CalendarEntryKind,
} from "@/lib/calendar-entries";
import { cn } from "@/lib/utils";

const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function uniqueKinds(items: { kind: CalendarEntryKind }[]): CalendarEntryKind[] {
  const seen = new Set<CalendarEntryKind>();
  const out: CalendarEntryKind[] = [];
  for (const item of items) {
    if (seen.has(item.kind)) continue;
    seen.add(item.kind);
    out.push(item.kind);
    if (out.length >= 3) break;
  }
  return out;
}

export function DashboardMonthCalendarPreview() {
  const router = useRouter();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const nowMs = useScheduleNow();
  const today = useMemo(() => new Date(nowMs), [nowMs]);
  const viewMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const { entriesByDay, hasEventsThisMonth } = useCalendarEntries(viewMonth);
  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );
  const weekdays = isPt ? WEEKDAYS_PT : WEEKDAYS_EN;

  const openCalendar = (date?: string) => {
    router.push(date ? `/app/calendar?date=${date}` : "/app/calendar");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openCalendar()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCalendar();
        }
      }}
      className={cn(
        "group flex h-full cursor-pointer flex-col rounded-[20px] border border-white/[0.06] bg-[#111111]",
        "shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-[#141414]",
        "hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/50"
      )}
      aria-label={isPt ? "Abrir calendário" : "Open calendar"}
    >
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {viewMonth.toLocaleString(isPt ? "pt-PT" : "en-GB", { month: "long", year: "numeric" })}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {isPt ? "Pré-visualização mensal" : "Monthly preview"}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="grid grid-cols-7 gap-x-2 gap-y-1">
          {weekdays.map((label) => (
            <p
              key={label}
              className="pb-2 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600"
            >
              {label}
            </p>
          ))}

          {monthCells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} aria-hidden className="h-11" />;
            }

            const iso = dayIsoLocal(day);
            const items = entriesByDay.get(iso) ?? [];
            const isToday = isSameLocalDay(day, today);
            const dotKinds = uniqueKinds(items);

            return (
              <button
                key={iso}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCalendar(iso);
                }}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-xl transition-colors",
                  isToday
                    ? "bg-accent/15 ring-1 ring-accent/50"
                    : items.length > 0
                      ? "bg-white/[0.03] hover:bg-white/[0.06]"
                      : "hover:bg-white/[0.04]"
                )}
                aria-label={
                  isPt
                    ? `${day.getDate()} de ${viewMonth.toLocaleString("pt-PT", { month: "long" })}${items.length ? `, ${items.length} eventos` : ""}`
                    : `${day.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}${items.length ? `, ${items.length} events` : ""}`
                }
              >
                <span
                  className={cn(
                    "text-[13px] font-medium tabular-nums",
                    isToday ? "text-accent" : "text-zinc-400"
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {dotKinds.map((kind) => (
                    <span
                      key={kind}
                      className={cn("h-1 w-1 rounded-full", CALENDAR_ENTRY_DOT_CLASS[kind])}
                      aria-hidden
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {!hasEventsThisMonth ? (
          <p className="mt-5 text-center text-[13px] text-zinc-500">
            {isPt ? "Sem eventos agendados neste mês." : "No events scheduled this month."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
