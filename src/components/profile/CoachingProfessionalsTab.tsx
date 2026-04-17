"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildMonthGrid,
  getDayCellState,
  dayNumberFromAnchor,
  isSameLocalDay,
  parseAccountAnchor,
  startOfLocalDay,
} from "@/lib/coaching-professionals-calendar";

const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function CoachingProfessionalsTab() {
  const { user, refreshUserFromCloud } = useAuth();
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = useState<Date | null>(null);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const anchor = useMemo(() => parseAccountAnchor(user?.createdAt), [user?.createdAt]);
  const missingCreatedAt = Boolean(user && !anchor);

  useEffect(() => {
    if (!anchor) return;
    const now = startOfLocalDay(new Date());
    if (getDayCellState(now, anchor, now) === "available") {
      setSelected((prev) => prev ?? now);
    }
  }, [anchor]);

  const tryRefreshMeta = useCallback(() => {
    void refreshUserFromCloud();
  }, [refreshUserFromCloud]);

  const monthLabel = useMemo(
    () =>
      new Date(view.y, view.m, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    [view.y, view.m]
  );

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);

  const prevMonth = useCallback(() => {
    setView((v) => {
      const d = new Date(v.y, v.m - 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setView((v) => {
      const d = new Date(v.y, v.m + 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }, []);

  const onPickDay = useCallback(
    (d: Date) => {
      if (!anchor) return;
      const state = getDayCellState(d, anchor, today);
      if (state !== "available") return;
      setSelected(d);
    },
    [anchor, today]
  );

  const selectedDayNum =
    selected && anchor ? dayNumberFromAnchor(anchor, selected) : null;

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
        Inicia sessão para aceder ao Coaching by Professionals.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent/90">Daily learning</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Coaching by Professionals
            </h2>
          </div>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-300">
          <p>
            The Coaching by Professionals Challenges is a daily learning system created to help coaches improve
            consistently through short, powerful lessons from some of the greatest managers, players, and football
            minds of all time.
          </p>
          <p>
            Every day, a new video challenge is released. These videos are short and easy to consume — making it
            realistic for any coach to learn something valuable every single day.
          </p>
        </div>
        {missingCreatedAt ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <p className="font-medium text-amber-50">Account date syncing</p>
            <p className="mt-1 text-amber-100/80">
              Para alinhar o calendário ao dia em que criaste a conta, sincroniza a sessão.
            </p>
            <button
              type="button"
              onClick={tryRefreshMeta}
              className="mt-3 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-50 hover:bg-amber-500/30"
            >
              Sincronizar conta
            </button>
          </div>
        ) : null}
      </section>

      {!anchor ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
          O calendário diário fica disponível quando a data de criação da conta estiver sincronizada. Usa
          &quot;Sincronizar conta&quot; acima se necessário.
        </div>
      ) : null}

      {anchor ? (
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">Calendar</h3>
            <p className="text-sm text-zinc-500">
              O teu percurso começa no dia em que criaste a conta. Só podes abrir o dia de hoje ou dias já passados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[10rem] text-center font-medium capitalize text-zinc-200">{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:text-xs">
            {WEEKDAYS_PT.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (!d) {
                return <div key={`pad-${i}`} className="aspect-square min-h-[2.5rem] sm:min-h-[3rem]" />;
              }
              const state = getDayCellState(d, anchor, today);
              const isToday = isSameLocalDay(d, today);
              const isSel = selected && isSameLocalDay(d, selected);
              const dayNum = dayNumberFromAnchor(anchor, d);

              const base =
                "relative flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-xl border text-sm font-medium transition sm:min-h-[3rem]";
              let cls = `${base} `;
              if (state === "before_account") {
                cls += "cursor-not-allowed border-transparent bg-white/[0.02] text-zinc-700";
              } else if (state === "locked_future") {
                cls +=
                  "cursor-not-allowed border-white/5 bg-zinc-900/40 text-zinc-600";
              } else {
                cls += isSel
                  ? "border-accent bg-accent/15 text-white shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.5)]"
                  : "cursor-pointer border-white/10 bg-white/[0.04] text-zinc-200 hover:border-accent/40 hover:bg-white/[0.07]";
                if (isToday && !isSel) {
                  cls += " ring-1 ring-accent/50";
                }
              }

              return (
                <button
                  key={d.getTime()}
                  type="button"
                  disabled={state !== "available"}
                  onClick={() => onPickDay(d)}
                  className={cls}
                  title={
                    state === "before_account"
                      ? "Antes da tua conta"
                      : state === "locked_future"
                        ? "Dia futuro"
                        : `Dia ${dayNum}`
                  }
                >
                  <span>{d.getDate()}</span>
                  {state === "locked_future" ? (
                    <Lock className="absolute bottom-1 right-1 h-3 w-3 text-zinc-600" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>
      ) : null}

      {anchor ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="font-display text-lg font-semibold text-white">Video of the day</h3>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-500">
              Escolhe um dia disponível no calendário para ver o vídeo desse dia.
            </p>
          ) : selectedDayNum != null ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-200">Day {selectedDayNum}</span>
                {" · "}
                {selected.toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="flex aspect-video max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-zinc-950/80 text-zinc-500">
                <PlayCircle className="h-14 w-14 text-zinc-600" aria-hidden />
                <p className="text-sm">Video content will appear here.</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
