"use client";

import { useMemo, useState } from "react";
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
import type { ParsedMatchEvent } from "@/types";

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
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const nowMs = useScheduleNow();
  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );
  const today = useMemo(() => new Date(nowMs), [nowMs]);

  const birthdayRows = useMemo(() => {
    const now = new Date(nowMs);
    const today = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const list: { id: string; label: string; subtitle: string; isToday: boolean }[] = [];
    const coachBirth = monthDayKey(coachProfile.dateOfBirth ?? "");
    if (coachBirth) {
      list.push({
        id: "coach",
        label: coachProfile.name.trim() || "Treinador",
        subtitle: "Treinador",
        isToday: coachBirth === today,
      });
    }
    for (const p of players) {
      const key = monthDayKey(p.dateOfBirth ?? "");
      if (!key) continue;
      list.push({
        id: `player-${p.id}`,
        label: p.name,
        subtitle: `Jogador · #${p.number}`,
        isToday: key === today,
      });
    }
    for (const s of staff) {
      const key = monthDayKey(s.dateOfBirth ?? "");
      if (!key) continue;
      list.push({
        id: `staff-${s.id}`,
        label: s.name,
        subtitle: `Staff · ${s.role}`,
        isToday: key === today,
      });
    }
    return list;
  }, [coachProfile.dateOfBirth, coachProfile.name, nowMs, players, staff]);

  const birthdaysToday = birthdayRows.filter((x) => x.isToday);

  const handleCreateLeagueSetup = () => {
    const teams = Number(setupTeamsDraft);
    const phases = Number(setupPhasesDraft);
    initializeLeagueSetup(teams, phases);
  };

  const handleProcessResultsText = async () => {
    const text = resultsOcrText.trim();
    if (!text) return;
    setOcrBusy(true);
    setOcrError(null);
    try {
      const res = await fetch("/api/league-results-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; events?: ParsedMatchEvent[] };
      if (!data.ok || !Array.isArray(data.events)) {
        setOcrError(data.error ?? "Could not parse image results.");
        return;
      }
      applyLeagueMatchEvents(data.events);
      setResultsOcrText("");
    } catch {
      setOcrError("Could not process results image.");
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Calendar & matchweek</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configura a liga, preenche a classificação por fase, atualiza por OCR e gere jogos futuros no calendário.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aniversários automáticos</CardTitle>
          <CardDescription>
            Quando a data coincide, o calendário assinala automaticamente com mensagem de parabéns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {birthdaysToday.length > 0 ? (
            birthdaysToday.map((row) => (
              <div key={row.id} className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                <p className="font-semibold text-emerald-200">Parabéns, {row.label}!</p>
                <p className="text-xs text-emerald-100/90">{row.subtitle}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">Hoje não há aniversários registados.</p>
          )}
          {birthdayRows.length === 0 && (
            <p className="text-xs text-zinc-500">
              Para ativar, adiciona data de nascimento no Perfil, Jogadores e Staff.
            </p>
          )}
        </CardContent>
      </Card>

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
                <Button type="button" size="sm" variant="secondary" onClick={() => saveLeagueTableSnapshot()}>
                  Guardar tabela
                </Button>
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
            <p className="text-sm font-semibold text-white">Resultados por print (upload/câmara)</p>
            <p className="mt-1 text-xs text-zinc-500">
              Carrega uma imagem ou usa câmara. Nesta versão, cola o texto OCR dos resultados para aplicar atualização
              automática da tabela.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input type="file" accept="image/*" />
              <Input type="file" accept="image/*" capture="environment" />
            </div>
            <textarea
              value={resultsOcrText}
              onChange={(e) => setResultsOcrText(e.target.value)}
              placeholder="Ex.: Equipa A 2-1 Equipa B"
              rows={4}
              className="mt-3 min-h-[96px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              {ocrError ? <p className="text-xs text-amber-300">{ocrError}</p> : <span />}
              <Button type="button" onClick={handleProcessResultsText} disabled={ocrBusy || !resultsOcrText.trim()}>
                {ocrBusy ? "A processar..." : "Aplicar resultados"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Calendário mensal</p>
              <div className="flex gap-2">
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
                const items = fixtures.filter((f) => isSameLocalDay(new Date(f.kickoff), day));
                const isToday = isSameLocalDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "h-20 rounded-lg border p-1.5 sm:p-2",
                      isToday
                        ? "border-accent/80 bg-accent/15 ring-2 ring-accent/60 ring-offset-2 ring-offset-zinc-950"
                        : "border-surface-border"
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
                    {items.slice(0, 2).map((f, i) => (
                      <p key={`${day.toISOString()}-${i}`} className="truncate text-[10px] text-zinc-200 sm:text-[11px]">
                        vs {f.opponent}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
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
