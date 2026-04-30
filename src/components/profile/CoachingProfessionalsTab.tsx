"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Flame,
  Library,
  Lock,
  PlayCircle,
  Trophy,
} from "lucide-react";
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
import { getLessonVideoUrl } from "@/lib/coaching-lesson-assets";
import { completedDayKeysToProgramLessonIds, programLessonCatalogId } from "@/lib/coaching-program-day";
import {
  getLibraryEntry,
  loadPrivateLibrary,
  saveToPrivateLibrary,
  touchLibraryDownload,
  triggerBrowserDownload,
  type PrivateLibraryState,
} from "@/lib/coaching-private-library-storage";
import { CoachingDevelopmentTable } from "@/components/profile/CoachingDevelopmentTable";
import { getLessonDevelopment } from "@/lib/coaching-development-registry";

const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CoachingProfessionalsTab() {
  const { user, refreshUserFromCloud } = useAuth();
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = useState<Date | null>(null);
  const [challenge, setChallenge] = useState<CoachingChallengeState | null>(null);
  const [library, setLibrary] = useState<PrivateLibraryState | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const anchor = useMemo(() => parseAccountAnchor(user?.createdAt), [user?.createdAt]);
  const missingCreatedAt = Boolean(user && !anchor);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    setChallenge(loadCoachingChallenge(user.id));
    setLibrary(loadPrivateLibrary(user.id));
  }, [user?.id]);

  const challengeDisplay = useMemo(() => {
    if (!user?.id) return null;
    return challenge ?? loadCoachingChallenge(user.id);
  }, [challenge, user?.id]);

  const libraryDisplay = useMemo(() => {
    if (!user?.id) return null;
    return library ?? loadPrivateLibrary(user.id);
  }, [library, user?.id]);

  const selectedDayKey = useMemo(
    () => (selected && user?.id ? dayKeyLocal(startOfLocalDay(selected)) : null),
    [selected, user?.id]
  );

  const selectedDayNumEarly =
    selected && anchor ? dayNumberFromAnchor(anchor, selected) : null;

  const lessonVideoUrl = useMemo(() => {
    if (!selectedDayKey || !anchor) return null;
    return getLessonVideoUrl(selectedDayKey, anchor);
  }, [selectedDayKey, anchor]);

  const lessonCatalogEntry = useMemo(() => {
    if (selectedDayNumEarly == null || selectedDayNumEarly < 1) return null;
    return getLessonDevelopment(programLessonCatalogId(selectedDayNumEarly));
  }, [selectedDayNumEarly]);

  useEffect(() => {
    setVideoLoadFailed(false);
  }, [selectedDayKey]);

  useEffect(() => {
    if (!user?.id || !selected) {
      setNotesDraft("");
      return;
    }
    const ent = getLibraryEntry(user.id, dayKeyLocal(startOfLocalDay(selected)));
    setNotesDraft(ent?.notes ?? "");
  }, [user?.id, selected]);

  const tryRefreshMeta = useCallback(() => {
    void refreshUserFromCloud();
  }, [refreshUserFromCloud]);

  const completedKeysSet = useMemo(() => {
    if (!challengeDisplay) return new Set<string>();
    return new Set(challengeDisplay.completedDayKeys);
  }, [challengeDisplay]);

  const savedKeysSet = useMemo(() => {
    if (!libraryDisplay) return new Set<string>();
    return new Set(Object.keys(libraryDisplay.entries));
  }, [libraryDisplay]);

  const isDayMarkedComplete = useCallback(
    (d: Date) => completedKeysSet.has(dayKeyLocal(startOfLocalDay(d))),
    [completedKeysSet]
  );

  const isDaySavedToLibrary = useCallback(
    (d: Date) => savedKeysSet.has(dayKeyLocal(startOfLocalDay(d))),
    [savedKeysSet]
  );

  const selectedCompleted = Boolean(selected && user?.id && isDayMarkedComplete(selected));
  const selectedSaved = Boolean(selected && user?.id && isDaySavedToLibrary(selected));

  const onMarkWatched = useCallback(() => {
    if (!user?.id || !selected) return;
    const next = markLessonWatched(user.id, selected);
    if (next) setChallenge(next);
  }, [user?.id, selected]);

  const onSaveToLibrary = useCallback(() => {
    if (!user?.id || !selected) return;
    const next = saveToPrivateLibrary(user.id, selected, notesDraft);
    setLibrary(next);
  }, [user?.id, selected, notesDraft]);

  const onDownloadLessonPack = useCallback(() => {
    if (!user?.id || !selected || selectedDayKey == null || selectedDayNumEarly == null) return;
    const videoUrl = getLessonVideoUrl(selectedDayKey, anchor);
    const payload = {
      app: "CoachBuilder",
      kind: "coaching-by-professionals-lesson",
      dayKey: selectedDayKey,
      dayNumber: selectedDayNumEarly,
      programLessonId: programLessonCatalogId(selectedDayNumEarly),
      dateLabel: selected.toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      notes: notesDraft,
      videoUrl,
      exportedAt: new Date().toISOString(),
    };
    triggerBrowserDownload(
      `CoachBuilder-lesson-${selectedDayKey}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
    if (getLibraryEntry(user.id, selectedDayKey)) {
      setLibrary(touchLibraryDownload(user.id, selectedDayKey));
    }
  }, [user?.id, selected, selectedDayKey, selectedDayNumEarly, notesDraft, anchor]);

  const onDownloadVideoOrInfo = useCallback(async () => {
    if (!user?.id || !selected || selectedDayKey == null || selectedDayNumEarly == null) return;
    const videoUrl = getLessonVideoUrl(selectedDayKey, anchor);
    if (videoUrl) {
      try {
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const ext = blob.type.includes("mp4") ? "mp4" : "bin";
        downloadBlob(`CoachBuilder-lesson-${selectedDayKey}.${ext}`, blob);
        if (getLibraryEntry(user.id, selectedDayKey)) {
          setLibrary(touchLibraryDownload(user.id, selectedDayKey));
        }
      } catch {
        triggerBrowserDownload(
          `CoachBuilder-lesson-${selectedDayKey}-video-info.txt`,
          `Não foi possível descarregar o ficheiro de vídeo automaticamente.\nOrigem: ${videoUrl}\nDia: ${selectedDayKey}\n`,
          "text/plain;charset=utf-8"
        );
      }
      return;
    }
    const body = [
      "CoachBuilder — Coaching by Professionals",
      `Day ${selectedDayNumEarly} (${selectedDayKey})`,
      "",
      "Os ficheiros de vídeo serão associados aqui quando as lições forem publicadas na app.",
      "Até lá, usa 'Descarregar pack da lição (JSON)' para exportar os metadados deste dia e as tuas notas.",
      "",
      "--- Your notes ---",
      notesDraft.trim() || "(no notes yet)",
    ].join("\n");
    triggerBrowserDownload(`CoachBuilder-lesson-${selectedDayKey}-video-info.txt`, body, "text/plain;charset=utf-8");
    if (getLibraryEntry(user.id, selectedDayKey)) {
      setLibrary(touchLibraryDownload(user.id, selectedDayKey));
    }
  }, [user?.id, selected, selectedDayKey, selectedDayNumEarly, notesDraft, anchor]);

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

  const streak = challengeDisplay ? getCurrentStreak(challengeDisplay) : 0;
  const progressPct = challengeDisplay ? getProgressPercentInLevel(challengeDisplay) : 0;

  const watchedProgramLessonIds = useMemo(() => {
    if (!anchor || !challengeDisplay) return [];
    return completedDayKeysToProgramLessonIds(challengeDisplay.completedDayKeys, anchor);
  }, [anchor, challengeDisplay]);

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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent/90">Aprendizagem diária</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Coaching by Professionals
            </h2>
          </div>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-300">
          <p>
            O Coaching by Professionals Challenges é um sistema de aprendizagem diária criado para ajudar treinadores a
            evoluir de forma consistente através de lições curtas e impactantes, com ensinamentos de alguns dos maiores
            treinadores, jogadores e mentes do futebol de sempre.
          </p>
          <p>
            Todos os dias é lançado um novo desafio em vídeo. Os vídeos são curtos e fáceis de acompanhar, tornando
            realista aprender algo valioso todos os dias.
          </p>
        </div>
        {missingCreatedAt ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <p className="font-medium text-amber-50">Sincronização da data da conta</p>
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

      <section className="space-y-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
        <header className="border-b border-white/10 pb-6">
          <h3 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">Sistema de desafios</h3>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Sequência, nível, calendário, vídeo diário e biblioteca privada. O Dia 1 é o dia em que criaste a conta;
            o vídeo de cada dia corresponde ao mesmo slot do programa para todos (day-001, day-002, ...). A Tabela de
            Desenvolvimento associa essas conclusões aos IDs de lição <code className="text-zinc-400">day-NNN</code>.
          </p>
        </header>

        {!anchor ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
            O calendário diário fica disponível quando a data de criação da conta estiver sincronizada. Usa
            &quot;Sincronizar conta&quot; acima se necessário.
          </div>
        ) : challengeDisplay ? (
          <>
            <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] via-zinc-900/60 to-zinc-950/90 p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl space-y-3">
                  <h4 className="font-display text-lg font-semibold text-white sm:text-xl">
                    Vê a lição de hoje — mantém a tua sequência ativa
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Cada vez que abres um dia e marcas a lição como vista, a tua barra de progresso avança. Constrói o
                    teu nível de treinador e a tua consistência ao longo do tempo. Se falhares um dia, perdes essa
                    oportunidade de estender a sequência, com a mesma lógica de desafios diários das melhores apps e jogos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 lg:justify-end">
                  <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                      Sequência
                    </span>
                    <span className="mt-1 font-display text-2xl font-bold text-white">{streak}</span>
                    <span className="text-[10px] text-zinc-500">dias</span>
                  </div>
                  <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <Trophy className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                      Melhor
                    </span>
                    <span className="mt-1 font-display text-2xl font-bold text-white">{challengeDisplay.longestStreak}</span>
                    <span className="text-[10px] text-zinc-500">dias</span>
                  </div>
                  <div className="flex min-w-[7rem] flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Nível treinador</span>
                    <span className="mt-1 font-display text-2xl font-bold text-accent">{challengeDisplay.level}</span>
                    <span className="text-[10px] text-zinc-500">+{XP_PER_LESSON} XP / lição</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Progresso para o próximo nível</span>
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
            </div>

            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-display text-lg font-semibold text-white">Calendário</h4>
                  <p className="text-sm text-zinc-500">
                    Toca num dia para abrir a lição. Visto verde = lição contada no desafio; marcador = guardado na tua
                    biblioteca privada.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-[10rem] text-center font-medium capitalize text-zinc-200">{monthLabel}</span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Mês seguinte"
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
                    const saved = state === "available" && isDaySavedToLibrary(d);

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
                      if (saved && !done && !isSel) {
                        cls += " border-sky-500/35 bg-sky-500/10";
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
                              : `${saved ? "Guardado · " : ""}${done ? "Completo · " : ""}Dia ${dayNum}`
                        }
                      >
                        {saved ? (
                          <Bookmark
                            className="absolute left-1 top-1 h-3.5 w-3.5 fill-sky-400/30 text-sky-400"
                            aria-label="Guardado na biblioteca"
                          />
                        ) : null}
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
            </div>

            {selected ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h4 className="font-display text-lg font-semibold text-white">Vídeo do dia</h4>
                {selectedDayNumEarly != null ? (
                  <div className="mt-4 space-y-6">
                    <p className="text-sm text-zinc-400">
                      <span className="text-zinc-200">Dia {selectedDayNumEarly}</span>
                      {" · "}
                      {selected.toLocaleDateString("pt-PT", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {lessonCatalogEntry?.title ? (
                      <p className="max-w-2xl text-sm font-medium leading-snug text-zinc-100">
                        {lessonCatalogEntry.title}
                      </p>
                    ) : null}
                    {lessonVideoUrl && !videoLoadFailed ? (
                      <video
                        key={lessonVideoUrl}
                        className="aspect-video w-full max-w-2xl rounded-xl border border-white/10 bg-black object-contain shadow-lg"
                        controls
                        playsInline
                        preload="metadata"
                        src={lessonVideoUrl}
                        onError={() => setVideoLoadFailed(true)}
                      />
                    ) : lessonVideoUrl && videoLoadFailed ? (
                      <div className="flex aspect-video max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 text-center text-sm text-amber-100/90">
                        <p>Não foi possível carregar o vídeo.</p>
                        <p className="text-xs text-amber-200/80">
                          Esperado no servidor:{" "}
                          <code className="rounded bg-black/30 px-1 py-0.5 text-amber-50">
                            public/coaching-daily-videos/
                            {selectedDayNumEarly != null ? programLessonCatalogId(selectedDayNumEarly) : "day-NNN"}
                            /lesson.mp4
                          </code>{" "}
                          (nome exacto <span className="font-medium">lesson.mp4</span>, minúsculas). Volta a fazer
                          deploy depois de o adicionares ao repositório ou ao CDN.
                        </p>
                      </div>
                    ) : (
                      <div className="flex aspect-video max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-zinc-950/80 px-4 text-center text-zinc-500">
                        <PlayCircle className="h-14 w-14 text-zinc-600" aria-hidden />
                        <p className="text-sm">
                          {selectedDayNumEarly != null && selectedDayNumEarly > 365
                            ? "Ainda não há slot de vídeo para este dia do programa (só existem 365 lições numeradas)."
                            : "Sem vídeo para este dia. Verifica a data de criação da conta (sincronizar) ou o dia seleccionado."}
                        </p>
                      </div>
                    )}

                    <div className="max-w-2xl space-y-3">
                      {selectedCompleted ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
                          <Check className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                          <span>Lição marcada como vista — progresso atualizado.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={onMarkWatched}
                          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-accent/90 sm:w-auto"
                        >
                          Vi esta lição — contar para o meu progresso
                        </button>
                      )}
                      <p className="text-xs text-zinc-500">
                        Carrega quando terminares a lição para avançar a barra, a sequência e as competências deste dia.
                      </p>
                    </div>

                    <div className="max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                          <Library className="h-5 w-5 text-accent" aria-hidden />
                        </div>
                        <div>
                          <h5 className="font-display text-sm font-semibold text-white">O teu dispositivo e biblioteca privada</h5>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            Faz download desta lição para acesso offline, escreve as tuas notas e guarda tudo na tua
                            biblioteca privada. Ao guardar, este dia passa a mostrar o marcador no calendário (além do
                            visto verde quando estiver concluído).
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          onClick={onDownloadLessonPack}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1]"
                        >
                          <FileText className="h-4 w-4 shrink-0" aria-hidden />
                          Descarregar pack da lição (JSON)
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDownloadVideoOrInfo()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1]"
                        >
                          <Download className="h-4 w-4 shrink-0" aria-hidden />
                          {getLessonVideoUrl(selectedDayKey ?? "", anchor) ? "Descarregar ficheiro de vídeo" : "Descarregar info de vídeo / offline"}
                        </button>
                      </div>

                      <div>
                        <label htmlFor="coaching-lesson-notes" className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Notas (privadas)
                        </label>
                        <textarea
                          id="coaching-lesson-notes"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={5}
                          placeholder="Escreve reflexões, pistas para a tua equipa ou aprendizagens-chave..."
                          className="w-full resize-y rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={onSaveToLibrary}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 sm:w-auto"
                      >
                        <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
                        Guardar na minha biblioteca privada
                      </button>
                      {selectedSaved ? (
                        <p className="flex items-center gap-2 text-sm text-sky-300/90">
                          <Bookmark className="h-4 w-4 fill-sky-400/40" aria-hidden />
                          Guardado — este dia já mostra o marcador no calendário.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">
                Seleciona um dia no calendário para abrir o vídeo, marcar a lição e usar downloads e notas.
              </p>
            )}
          </>
        ) : null}
      </section>

      {anchor && challengeDisplay ? (
        <section className="space-y-8 rounded-2xl border border-white/10 bg-zinc-950/40 p-6 sm:p-10">
          <header className="border-b border-white/10 pb-6">
            <h3 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Skill Development Table
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Usa as mesmas lições por dia de programa do Sistema de desafios (dia 1 = criação da tua conta); as
              competências atualizam quando marcas esses dias como vistos.
            </p>
          </header>
          <CoachingDevelopmentTable watchedLessonIds={watchedProgramLessonIds} />
        </section>
      ) : null}
    </div>
  );
}
