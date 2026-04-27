"use client";

import { useMemo, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import type { MatchFixture } from "@/types";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FixtureFormModal } from "@/components/calendar/FixtureFormModal";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { buildMonthGrid, isSameLocalDay } from "@/lib/coaching-professionals-calendar";
import { cn } from "@/lib/utils";
import { parseMatchEventsFromOcrText } from "@/lib/league-results-ocr-parse";
import type { SketchCalendarEventCategory } from "@/types";

const cellInputClass =
  "h-8 min-w-0 px-1.5 py-0 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function monthDayKey(isoDate: string): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function dayIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthInputFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateFromMonthInput(v: string): Date {
  const [ys, ms] = v.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return new Date();
  return new Date(y, m - 1, 1);
}

export function CalendarPageClient() {
  const {
    fixtures,
    addFixture,
    updateFixture,
    removeFixture,
    leagueTableLastFetched,
    leagueSetup,
    initializeLeagueSetup,
    setActiveLeaguePhase,
    updateLeagueTeamName,
    updateLeagueTeamStats,
    applyLeagueMatchEvents,
    saveLeagueTableSnapshot,
    clearLeagueStandingsStatsKeepNames,
    pastClubResults,
    updatePastClubResultNote,
    sketchArea,
    setSketchArea,
    coachProfile,
    players,
    staff,
  } = useAppData();

  const [fixtureModalOpen, setFixtureModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFixture | null>(null);
  const [setupTeamsDraft, setSetupTeamsDraft] = useState("10");
  const [setupPhasesDraft, setSetupPhasesDraft] = useState("1");
  const [resultsOcrText, setResultsOcrText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const resultsImageInputRef = useRef<HTMLInputElement>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTopic, setNewEventTopic] = useState<SketchCalendarEventCategory>("other");
  const [newEventDate, setNewEventDate] = useState(() => dayIsoLocal(new Date()));
  const [newEventNotes, setNewEventNotes] = useState("");
  const [printFromMonth, setPrintFromMonth] = useState(() => monthInputFromDate(new Date()));
  const [printToMonth, setPrintToMonth] = useState(() => monthInputFromDate(new Date()));
  const nowMs = useScheduleNow();
  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );
  const today = useMemo(() => new Date(nowMs), [nowMs]);

  const allCalendarEntries = useMemo(() => {
    const entries: Array<{ date: string; label: string; kind: "fixture" | "birthday" | "sketch_event" | "note" }> = [];
    for (const f of fixtures) {
      entries.push({
        date: dayIsoLocal(new Date(f.kickoff)),
        label: `Jogo: vs ${f.opponent}`,
        kind: "fixture",
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
          date: dayIsoLocal(d),
          label: `Aniversário do ${name} (${subtitle})`,
          kind: "birthday",
        });
      }
    };
    pushBirthday(coachProfile.name.trim() || "Treinador", "Treinador", coachProfile.dateOfBirth);
    for (const p of players) pushBirthday(p.name, `Jogador #${p.number}`, p.dateOfBirth);
    for (const s of staff) pushBirthday(s.name, `Staff ${s.role}`, s.dateOfBirth);
    for (const ev of sketchArea.calendarEvents) {
      entries.push({ date: ev.date, label: `Evento: ${ev.title}`, kind: "sketch_event" });
    }
    for (const note of sketchArea.notes) {
      if (!note.date) continue;
      entries.push({ date: note.date, label: `Nota Sketch: ${note.title}`, kind: "note" });
    }
    return entries;
  }, [coachProfile.dateOfBirth, coachProfile.name, fixtures, players, sketchArea.calendarEvents, sketchArea.notes, staff, viewMonth]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, Array<{ label: string; kind: "fixture" | "birthday" | "sketch_event" | "note" }>>();
    for (const e of allCalendarEntries) {
      const list = map.get(e.date) ?? [];
      list.push({ label: e.label, kind: e.kind });
      map.set(e.date, list);
    }
    return map;
  }, [allCalendarEntries]);

  const handleCreateLeagueSetup = () => {
    const teams = Number(setupTeamsDraft);
    const phases = Number(setupPhasesDraft);
    initializeLeagueSetup(teams, phases);
  };

  const handleApplyResults = async () => {
    if (!leagueSetup) {
      setOcrError("Cria primeiro a tabela da liga (setup).");
      return;
    }
    setOcrBusy(true);
    setOcrError(null);
    try {
      let combined = resultsOcrText;
      const file = resultsImageInputRef.current?.files?.[0];
      if (file) {
        try {
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("por+eng");
          const {
            data: { text },
          } = await worker.recognize(file);
          await worker.terminate();
          const extracted = (text ?? "").trim();
          if (extracted) {
            combined = combined.trim() ? `${combined.trim()}\n${extracted}` : extracted;
            setResultsOcrText(combined);
          }
        } catch {
          setOcrError(
            "Não foi possível ler a imagem (OCR). Corre `npm install` no projeto e tenta de novo, ou cola o texto reconhecido abaixo."
          );
          setOcrBusy(false);
          return;
        }
      }
      const trimmed = combined.trim();
      if (!trimmed) {
        setOcrError("Carrega uma imagem com a grelha de resultados ou cola o texto (ex.: SL Benfica 2-1 FC Porto).");
        setOcrBusy(false);
        return;
      }
      const events = parseMatchEventsFromOcrText(trimmed);
      if (!events.length) {
        setOcrError(
          "Não encontrei jogos no texto. Usa linhas como: Equipa A 2-1 Equipa B. Se aparecer hora (ex.: 20:30), o jogo é ignorado."
        );
        setOcrBusy(false);
        return;
      }
      applyLeagueMatchEvents(events);
      setResultsOcrText("");
      if (resultsImageInputRef.current) resultsImageInputRef.current.value = "";
    } catch {
      setOcrError("Erro ao aplicar resultados.");
    } finally {
      setOcrBusy(false);
    }
  };

  const handleCreateCustomEvent = () => {
    const title = newEventTitle.trim();
    if (!title || !newEventDate) return;
    const nowIso = new Date().toISOString();
    setSketchArea((prev) => ({
      ...prev,
      calendarEvents: [
        {
          id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          category: newEventTopic,
          date: newEventDate,
          notes: newEventNotes.trim() || undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...prev.calendarEvents,
      ],
    }));
    setEventModalOpen(false);
    setNewEventTitle("");
    setNewEventNotes("");
  };

  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    return entriesByDay.get(dayIsoLocal(selectedDay)) ?? [];
  }, [entriesByDay, selectedDay]);

  const printableMonths = useMemo(() => {
    const from = dateFromMonthInput(printFromMonth);
    const to = dateFromMonthInput(printToMonth);
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const out: Date[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const cap = 24;
    while (cursor <= end && out.length < cap) {
      out.push(new Date(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return out;
  }, [printFromMonth, printToMonth]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Calendar & matchweek</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configura a liga, preenche a classificação por fase, atualiza por OCR e gere jogos futuros no calendário.
        </p>
      </div>

      <FixtureFormModal
        open={fixtureModalOpen}
        onClose={() => {
          setFixtureModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={(input) => {
          if (editing) updateFixture(editing.id, input);
          else addFixture(input);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
            League table
          </CardTitle>
          <CardDescription>
            This table is now fully managed in-app (setup + manual edits + OCR result updates). With your club set in
            Profile, that row is highlighted and labelled in the table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!leagueSetup && (
            <div className="rounded-xl border border-surface-border bg-surface-raised/40 p-4">
              <p className="text-sm font-semibold text-white">Setup inicial da liga</p>
              <p className="mt-1 text-xs text-zinc-500">
                Define equipas e fases para criar automaticamente a tabela editável.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="setup-team-count">
                    Nº equipas
                  </label>
                  <Input
                    id="setup-team-count"
                    type="number"
                    min={2}
                    max={64}
                    value={setupTeamsDraft}
                    onChange={(e) => setSetupTeamsDraft(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="setup-phase-count">
                    Nº fases
                  </label>
                  <Input
                    id="setup-phase-count"
                    type="number"
                    min={1}
                    max={3}
                    value={setupPhasesDraft}
                    onChange={(e) => setSetupPhasesDraft(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleCreateLeagueSetup} className="w-full">
                    Criar tabela
                  </Button>
                </div>
              </div>
            </div>
          )}

          {leagueSetup && (
            <div className="space-y-4 rounded-xl border border-surface-border bg-surface-raised/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">Fase ativa</p>
                  {leagueSetup.phases.map((phase) => (
                    <Button
                      key={phase.id}
                      type="button"
                      size="sm"
                      variant={leagueSetup.activePhaseId === phase.id ? "primary" : "secondary"}
                      onClick={() => setActiveLeaguePhase(phase.id)}
                    >
                      {phase.name}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => saveLeagueTableSnapshot()}>
                    Guardar tabela
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm(
                          "Apagar todo o conteúdo estatístico (J, V, E, D, GM, GS, pontos) em todas as fases, mantendo só os nomes das equipas?"
                        )
                      ) {
                        return;
                      }
                      clearLeagueStandingsStatsKeepNames();
                    }}
                  >
                    Apagar conteúdo
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-surface-border">
                <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
                  <colgroup>
                    <col className="w-8" />
                    <col />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[11px]">
                      <th className="px-0.5 py-2 sm:px-1">#</th>
                      <th className="px-1 py-2">Nome</th>
                      <th className="px-0.5 py-2 text-center">J</th>
                      <th className="px-0.5 py-2 text-center">V</th>
                      <th className="px-0.5 py-2 text-center">E</th>
                      <th className="px-0.5 py-2 text-center">D</th>
                      <th className="px-0.5 py-2 text-center">GM</th>
                      <th className="px-0.5 py-2 text-center">GS</th>
                      <th className="px-0.5 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueSetup.phases
                      .find((p) => p.id === leagueSetup.activePhaseId)
                      ?.standings.rows.map((row, idx) => (
                        <tr key={row.teamId} className="border-b border-surface-border/60 last:border-0">
                          <td className="px-0.5 py-1.5 text-center text-zinc-400 tabular-nums sm:px-1">{idx + 1}</td>
                          <td className="min-w-0 px-1 py-1.5">
                            <Input
                              value={row.team}
                              onChange={(e) => updateLeagueTeamName(row.teamId, e.target.value)}
                              placeholder="Equipa"
                              className={cn(cellInputClass, "text-left")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.played}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { played: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.won}
                              onChange={(e) => updateLeagueTeamStats(row.teamId, { won: Number(e.target.value || 0) })}
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.drawn}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { drawn: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.lost}
                              onChange={(e) => updateLeagueTeamStats(row.teamId, { lost: Number(e.target.value || 0) })}
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.goalsFor}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { goalsFor: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.goalsAgainst}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { goalsAgainst: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 text-right text-[11px] font-semibold tabular-nums text-white sm:px-1 sm:text-xs">
                            {row.points}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <p className="text-sm font-semibold text-white">Resultados por print</p>
            <p className="mt-1 text-xs text-zinc-500">
              Um único upload de imagem (galeria ou câmara). Ao carregar em <strong>Aplicar resultados</strong> lemos o
              texto na app, encontramos jogos (casa golos fora), cruzamos nomes com a tabela (ex.: FC Porto ≈ Porto) e
              atualizamos J, V, E, D, golos e pontos. Define o <strong>clube</strong> no Perfil para guardar jogos
              passados só dessa equipa.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium text-zinc-500" htmlFor="results-image">
                Imagem (screenshot / foto)
              </label>
              <Input
                id="results-image"
                ref={resultsImageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1.5 cursor-pointer"
              />
            </div>
            <p className="mt-3 text-xs font-medium text-zinc-500">Texto (opcional — junta-se ao OCR da imagem)</p>
            <textarea
              value={resultsOcrText}
              onChange={(e) => setResultsOcrText(e.target.value)}
              placeholder="Ex.: SL Benfica 2-1 FC Porto"
              rows={4}
              className="mt-1.5 min-h-[96px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {ocrError ? <p className="text-xs text-amber-300">{ocrError}</p> : <span />}
              <Button type="button" onClick={() => void handleApplyResults()} disabled={ocrBusy}>
                {ocrBusy ? "A processar..." : "Aplicar resultados"}
              </Button>
            </div>
          </div>

          {eventModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-surface-border bg-zinc-950 p-4">
                <p className="text-base font-semibold text-white">Novo Evento</p>
                <p className="mt-1 text-xs text-zinc-500">Escolhe tópico, data e descrição.</p>
                <div className="mt-3 space-y-3">
                  <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Título" />
                  <label className="block text-xs text-zinc-500">
                    Tópico
                    <select
                      value={newEventTopic}
                      onChange={(e) => setNewEventTopic(e.target.value as SketchCalendarEventCategory)}
                      className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                    >
                      <option value="training">Treino</option>
                      <option value="match">Jogo</option>
                      <option value="meeting">Reunião</option>
                      <option value="opponent_analysis">Análise adversário</option>
                      <option value="player_review">Revisão jogador</option>
                      <option value="task_deadline">Prazo</option>
                      <option value="other">Outro</option>
                    </select>
                  </label>
                  <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                  <textarea
                    value={newEventNotes}
                    onChange={(e) => setNewEventNotes(e.target.value)}
                    rows={3}
                    placeholder="Observações"
                    className="min-h-[84px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEventModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleCreateCustomEvent} disabled={!newEventTitle.trim() || !newEventDate}>
                    Guardar evento
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="hidden print:block">
            <h3 className="mb-3 text-lg font-semibold text-black">Calendário para impressão</h3>
            {printableMonths.map((m) => {
              const cells = buildMonthGrid(m.getFullYear(), m.getMonth());
              return (
                <div key={m.toISOString()} className="mb-6 break-inside-avoid">
                  <p className="mb-2 text-sm font-semibold text-black">
                    {m.toLocaleString("pt-PT", { month: "long", year: "numeric" })}
                  </p>
                  <div className="grid grid-cols-7 gap-1 text-[10px]">
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                      <p key={`${m.toISOString()}-${d}`} className="font-semibold text-black">
                        {d}
                      </p>
                    ))}
                    {cells.map((day, idx) => {
                      if (!day) return <div key={`${m.toISOString()}-empty-${idx}`} className="h-16 border border-transparent" />;
                      const dayKey = dayIsoLocal(day);
                      const events = entriesByDay.get(dayKey) ?? [];
                      return (
                        <div key={`${m.toISOString()}-${day.toISOString()}`} className="h-16 border border-zinc-400 p-1">
                          <p className="text-[10px] font-semibold text-black">{day.getDate()}</p>
                          {events.slice(0, 2).map((ev, i) => (
                            <p key={`${dayKey}-${i}`} className="truncate text-[9px] text-black">
                              {ev.label}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Calendário mensal</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFixtureModalOpen(true);
                  }}
                >
                  Adicionar Jogo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setNewEventDate(dayIsoLocal(selectedDay ?? new Date(nowMs)));
                    setEventModalOpen(true);
                  }}
                >
                  Novo Evento
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                >
                  Mês anterior
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setViewMonth(new Date(nowMs))}>
                  Hoje
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                >
                  Próximo mês
                </Button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-surface-border/70 bg-zinc-900/35 p-2">
              <span className="text-xs text-zinc-400">Imprimir</span>
              <Input type="month" value={printFromMonth} onChange={(e) => setPrintFromMonth(e.target.value)} className="h-9 max-w-[170px]" />
              <span className="text-xs text-zinc-500">até</span>
              <Input type="month" value={printToMonth} onChange={(e) => setPrintToMonth(e.target.value)} className="h-9 max-w-[170px]" />
              <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
                Imprimir
              </Button>
            </div>
            <p className="mb-3 text-xs text-zinc-500">
              {viewMonth.toLocaleString("pt-PT", { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <p key={d} className="px-1 py-1 text-zinc-500 sm:px-2">
                  {d}
                </p>
              ))}
              {monthCells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-20 rounded-lg border border-transparent" />;
                const iso = dayIsoLocal(day);
                const items = entriesByDay.get(iso) ?? [];
                const isToday = isSameLocalDay(day, today);
                const isSelected = selectedDay ? isSameLocalDay(day, selectedDay) : false;
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "h-20 rounded-lg border p-1.5 text-left sm:p-2",
                      isToday
                        ? "border-accent/80 bg-accent/15 ring-2 ring-accent/60 ring-offset-2 ring-offset-zinc-950"
                        : "border-surface-border",
                      isSelected && "border-emerald-400/80 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-zinc-950"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-medium tabular-nums sm:text-[11px]",
                        isToday ? "text-accent" : "text-zinc-400"
                      )}
                    >
                      {day.getDate()}
                      {isToday ? <span className="ml-1 text-[9px] font-normal text-accent/90">· hoje</span> : null}
                    </p>
                    {items.slice(0, 2).map((it, i) => (
                      <p
                        key={`${day.toISOString()}-${i}`}
                        className={cn(
                          "truncate text-[10px] sm:text-[11px]",
                          it.kind === "birthday" && "text-emerald-200",
                          it.kind === "fixture" && "text-zinc-200",
                          it.kind === "sketch_event" && "text-sky-200",
                          it.kind === "note" && "text-amber-200"
                        )}
                      >
                        {it.label}
                      </p>
                    ))}
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <div className="mt-4 rounded-xl border border-surface-border bg-zinc-900/40 p-3">
                <p className="text-sm font-semibold text-white">
                  Detalhe do dia {selectedDay.toLocaleDateString("pt-PT")}
                </p>
                {selectedDayEntries.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">Sem eventos para este dia.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selectedDayEntries.map((e, idx) => (
                      <li key={`${e.label}-${idx}`} className="text-xs text-zinc-200">
                        {e.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <p className="text-sm font-semibold text-white">Jogos anteriores (Perfil)</p>
            <p className="mt-1 text-xs text-zinc-500">
              Só aparecem jogos em que o clube <strong>{coachProfile.club.trim() || "—"}</strong> participou, após
              aplicares resultados por OCR. Resultado a verde / cinzento / vermelho conforme vitória, empate ou
              derrota do teu clube.
            </p>
            {!coachProfile.club.trim() ? (
              <p className="mt-3 text-sm text-amber-200/90">Define o nome do clube no Perfil para ver esta lista.</p>
            ) : pastClubResults.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Ainda não há jogos guardados para este clube.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="px-2 py-2 font-medium">Casa</th>
                      <th className="px-2 py-2 font-medium">Fora</th>
                      <th className="px-2 py-2 font-medium">Resultado</th>
                      <th className="px-2 py-2 font-medium">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastClubResults.map((row) => (
                      <tr key={row.id} className="border-b border-surface-border/60 last:border-0">
                        <td className="px-2 py-2 text-zinc-200">{row.homeSide}</td>
                        <td className="px-2 py-2 text-zinc-200">{row.awaySide}</td>
                        <td
                          className={cn(
                            "px-2 py-2 font-semibold tabular-nums",
                            row.outcome === "W" && "text-emerald-300",
                            row.outcome === "D" && "text-zinc-400",
                            row.outcome === "L" && "text-red-400/90"
                          )}
                        >
                          {row.homeGoals} — {row.awayGoals}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.notes}
                            onChange={(e) => updatePastClubResultNote(row.id, e.target.value)}
                            placeholder="Notas"
                            className="h-8 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {leagueTableLastFetched && (
            <p className="text-xs text-zinc-600">
              Last updated: {new Date(leagueTableLastFetched).toLocaleString("en-GB")} · Updated from in-app table
              edits or result ingestion.
            </p>
          )}
          {!leagueSetup && (
            <p className="text-sm text-zinc-500">No table loaded yet. Run the setup above to create your league.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
