"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Lock, PlayCircle, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildMonthGrid,
  getDayCellState,
  dayNumberFromAnchor,
  isSameLocalDay,
  parseAccountAnchor,
  startOfLocalDay,
} from "@/lib/coaching-professionals-calendar";
import {
  dayKeyLocal,
  getCurrentStreak,
  getProgressPercentInLevel,
  loadCoachingChallenge,
  markLessonWatched,
  type CoachingChallengeState,
  XP_PER_LEVEL,
  XP_PER_LESSON,
} from "@/lib/coaching-challenge-storage";

const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function CoachingProfessionalsTab() {
  const { user, refreshUserFromCloud } = useAuth();
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = useState<Date | null>(null);
  const [challenge, setChallenge] = useState<CoachingChallengeState | null>(null);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const anchor = useMemo(() => parseAccountAnchor(user?.createdAt), [user?.createdAt]);
  const missingCreatedAt = Boolean(user && !anchor);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    setChallenge(loadCoachingChallenge(user.id));
  }, [user?.id]);

  const challengeDisplay = useMemo(() => {
    if (!user?.id) return null;
    return challenge ?? loadCoachingChallenge(user.id);
  }, [challenge, user?.id]);

  const tryRefreshMeta = useCallback(() => {
    void refreshUserFromCloud();
  }, [refreshUserFromCloud]);

  const completedKeysSet = useMemo(() => {
    if (!challengeDisplay) return new Set<string>();
    return new Set(challengeDisplay.completedDayKeys);
  }, [challengeDisplay]);

  const isDayMarkedComplete = useCallback(
    (d: Date) => completedKeysSet.has(dayKeyLocal(startOfLocalDay(d))),
    [completedKeysSet]
  );

  const selectedCompleted = Boolean(selected && user?.id && isDayMarkedComplete(selected));

  const onMarkWatched = useCallback(() => {
    if (!user?.id || !selected) return;
    const next = markLessonWatched(user.id, selected);
    if (next) setChallenge(next);
  }, [user?.id, selected]);

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

  const streak = challengeDisplay ? getCurrentStreak(challengeDisplay) : 0;
  const progressPct = challengeDisplay ? getProgressPercentInLevel(challengeDisplay) : 0;

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

      {anchor && challengeDisplay ? (
        <section className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] via-zinc-900/60 to-zinc-950/90 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent/90">Challenge System</p>
              <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
                Watch today&apos;s lesson — keep your streak alive
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Each time you open a day and mark the lesson as watched, your progress bar advances. Build your coaching
                level and consistency over time. Skip a day and you miss that chance to push your streak further — the
                same drive as daily challenges in top apps and games.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <span className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                  Streak
                </span>
                <span className="mt-1 font-display text-2xl font-bold text-white">{streak}</span>
                <span className="text-[10px] text-zinc-500">days</span>
              </div>
              <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <span className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                  Best
                </span>
                <span className="mt-1 font-display text-2xl font-bold text-white">{challengeDisplay.longestStreak}</span>
                <span className="text-[10px] text-zinc-500">days</span>
              </div>
              <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Coach level</span>
                <span className="mt-1 font-display text-2xl font-bold text-accent">{challengeDisplay.level}</span>
                <span className="text-[10px] text-zinc-500">+{XP_PER_LESSON} XP / lesson</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Progress to next level</span>
              <span>
                {challengeDisplay.xpInLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>
      ) : null}

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
                Toca num dia para abrir a lição. O vídeo só aparece depois de escolheres o dia.
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
                const done = state === "available" && isDayMarkedComplete(d);

                const base =
                  "relative flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-xl border text-sm font-medium transition sm:min-h-[3rem]";
                let cls = `${base} `;
                if (state === "before_account") {
                  cls += "cursor-not-allowed border-transparent bg-white/[0.02] text-zinc-700";
                } else if (state === "locked_future") {
                  cls += "cursor-not-allowed border-white/5 bg-zinc-900/40 text-zinc-600";
                } else {
                  cls += isSel
                    ? "border-accent bg-accent/15 text-white shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.5)]"
                    : "cursor-pointer border-white/10 bg-white/[0.04] text-zinc-200 hover:border-accent/40 hover:bg-white/[0.07]";
                  if (done && !isSel) {
                    cls += " border-emerald-500/35 bg-emerald-500/10";
                  }
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
                    {done ? (
                      <Check className="absolute bottom-1 right-1 h-3.5 w-3.5 text-emerald-400" aria-label="Completo" />
                    ) : null}
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

      {anchor && selected ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="font-display text-lg font-semibold text-white">Video of the day</h3>
          {selectedDayNum != null ? (
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

              <div className="max-w-2xl">
                {selectedCompleted ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                    <span>Lesson marked as watched — progress updated.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onMarkWatched}
                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-accent/90 sm:w-auto"
                  >
                    I watched this lesson — count toward my progress
                  </button>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  Opens after you pick a day above. Tap when you&apos;ve watched the lesson to advance your bar and
                  streak.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
