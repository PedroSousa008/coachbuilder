"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Minus,
  Printer,
  Shield,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import {
  availabilityLabelPt,
  buildMonthlyReportBundle,
  deltaTone,
  DISCIPLINE_LABELS_PT,
  monthLabelPt,
  selectableMonthKeys,
  type MonthKey,
  type MonthlyComparisonPoint,
  type MonthlyDisciplineStatus,
} from "@/lib/sketch-monthly-report";
import type { SketchMonthlyReportNotes } from "@/types";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  accent = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "red" | "amber" | "default";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent === "green" && "border-emerald-500/30 bg-emerald-500/5",
        accent === "red" && "border-red-500/30 bg-red-500/5",
        accent === "amber" && "border-amber-500/30 bg-amber-500/5",
        accent === "default" && "border-surface-border bg-surface-raised/20"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function disciplineBadge(status: MonthlyDisciplineStatus) {
  if (status === "suspended") {
    return <Badge className="border-red-500/40 bg-red-500/15 text-red-200">{DISCIPLINE_LABELS_PT.suspended}</Badge>;
  }
  if (status === "risk") {
    return <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-200">{DISCIPLINE_LABELS_PT.risk}</Badge>;
  }
  return <Badge variant="muted">{DISCIPLINE_LABELS_PT.clean}</Badge>;
}

function availabilityBadge(label: string) {
  if (label === "Lesionado") {
    return <Badge className="border-red-500/40 bg-red-500/10 text-red-200">{label}</Badge>;
  }
  if (label === "Indisponível") {
    return <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">{label}</Badge>;
  }
  return <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">{label}</Badge>;
}

function outcomeBadge(outcome: "win" | "draw" | "loss") {
  if (outcome === "win") return <Badge className="bg-emerald-500/20 text-emerald-200">V</Badge>;
  if (outcome === "draw") return <Badge variant="muted">E</Badge>;
  return <Badge className="bg-red-500/20 text-red-200">D</Badge>;
}

function ComparisonBars({
  title,
  points,
  valueKey,
  higherIsBetter = true,
}: {
  title: string;
  points: MonthlyComparisonPoint[];
  valueKey: keyof Pick<MonthlyComparisonPoint, "wins" | "goalsFor" | "goalsAgainst" | "totalMinutes">;
  higherIsBetter?: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p[valueKey] as number));
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {points.map((p, i) => {
        const val = p[valueKey] as number;
        const prev = i > 0 ? (points[i - 1]![valueKey] as number) : null;
        const tone = prev === null ? "flat" : deltaTone(higherIsBetter ? val : -val, higherIsBetter ? prev : -prev);
        return (
          <div key={p.monthKey} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{p.label}</span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                {val}
                {prev !== null ? (
                  tone === "up" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : tone === "down" ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-zinc-500" />
                  )
                ) : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  tone === "up" && "bg-emerald-500",
                  tone === "down" && "bg-red-500",
                  tone === "flat" && "bg-accent"
                )}
                style={{ width: `${Math.round((val / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const QUAL_FIELDS: { key: keyof Omit<SketchMonthlyReportNotes, "monthKey" | "updatedAt">; label: string }[] = [
  { key: "teamForm", label: "Forma da equipa no mês" },
  { key: "bestPhase", label: "Melhor fase do mês" },
  { key: "worstPhase", label: "Pior fase do mês" },
  { key: "strengths", label: "Principais pontos fortes" },
  { key: "problems", label: "Principais problemas" },
];

export function SketchMonthlyReportPanel() {
  const { players, tacticMatches, savedTactics, sketchArea, setSketchArea } = useAppData();
  const today = useMemo(() => calendarDayLisbon(Date.now()), []);
  const monthOptions = useMemo(() => selectableMonthKeys(tacticMatches, today), [tacticMatches, today]);

  const defaultMonth = monthOptions[0] ?? today.slice(0, 7);
  const [selectedMonths, setSelectedMonths] = useState<MonthKey[]>([defaultMonth]);

  const bundle = useMemo(() => {
    if (selectedMonths.length === 0) return null;
    return buildMonthlyReportBundle({
      selectedMonths,
      players,
      tacticMatches,
      savedTactics,
    });
  }, [selectedMonths, players, tacticMatches, savedTactics]);

  const notesByMonth = useMemo(() => {
    const map = new Map<string, SketchMonthlyReportNotes>();
    for (const n of sketchArea.monthlyReportNotes ?? []) {
      map.set(n.monthKey, n);
    }
    return map;
  }, [sketchArea.monthlyReportNotes]);

  const toggleMonth = (mk: MonthKey) => {
    setSelectedMonths((prev) => {
      if (prev.includes(mk)) {
        const next = prev.filter((x) => x !== mk);
        return next.length > 0 ? next : prev;
      }
      return [...prev, mk].sort();
    });
  };

  const updateNotes = useCallback(
    (monthKey: MonthKey, field: keyof Omit<SketchMonthlyReportNotes, "monthKey" | "updatedAt">, value: string) => {
      setSketchArea((prev) => {
        const list = [...(prev.monthlyReportNotes ?? [])];
        const idx = list.findIndex((n) => n.monthKey === monthKey);
        const existing = idx >= 0 ? list[idx]! : { monthKey, updatedAt: new Date().toISOString() };
        const next: SketchMonthlyReportNotes = {
          ...existing,
          [field]: value,
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) list[idx] = next;
        else list.push(next);
        return { ...prev, monthlyReportNotes: list };
      });
    },
    [setSketchArea]
  );

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 print:space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sketch-monthly-report-print, #sketch-monthly-report-print * { visibility: visible; }
          #sketch-monthly-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; background: white; color: #111; }
          #sketch-monthly-report-print .no-print { display: none !important; }
          #sketch-monthly-report-print .text-white { color: #111 !important; }
          #sketch-monthly-report-print .text-zinc-400, #sketch-monthly-report-print .text-zinc-500 { color: #444 !important; }
        }
      `}</style>

      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Relatório mensal</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Análise competitiva individual e coletiva com base nos jogos registados em Táticas. Seleciona um ou mais meses
            para comparar evolução ao longo da época.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={handlePrint} disabled={!bundle}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Card className="no-print border-surface-border bg-surface-raised/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <CalendarRange className="h-4 w-4 text-accent" />
            Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-zinc-500">Seleciona 1 ou mais meses (calendário Europe/Lisbon).</p>
          <div className="flex flex-wrap gap-2">
            {monthOptions.map((mk) => {
              const on = selectedMonths.includes(mk);
              return (
                <button
                  key={mk}
                  type="button"
                  onClick={() => toggleMonth(mk)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition-colors",
                    on
                      ? "border-accent/50 bg-accent/15 text-white"
                      : "border-surface-border bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  )}
                >
                  {monthLabelPt(mk)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div id="sketch-monthly-report-print" className="space-y-6">
        {!bundle ? (
          <p className="text-sm text-zinc-500">Seleciona pelo menos um mês.</p>
        ) : (
          <>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">{bundle.periodLabel}</h3>
              <p className="text-sm text-zinc-500">
                {bundle.combined.team.games} jogos no período · fonte: Táticas
              </p>
            </div>

            {/* 1. Jogos e resultados */}
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <Trophy className="h-4 w-4 text-accent" />
                1. Jogos e resultados
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <StatCard label="Jogos" value={bundle.combined.team.games} />
                <StatCard label="Vitórias" value={bundle.combined.team.wins} accent="green" />
                <StatCard label="Empates" value={bundle.combined.team.draws} />
                <StatCard label="Derrotas" value={bundle.combined.team.losses} accent="red" />
                <StatCard label="Golos marcados" value={bundle.combined.team.goalsFor} accent="green" />
                <StatCard label="Golos sofridos" value={bundle.combined.team.goalsAgainst} accent="red" />
                <StatCard
                  label="Diferença"
                  value={bundle.combined.team.goalDiff > 0 ? `+${bundle.combined.team.goalDiff}` : bundle.combined.team.goalDiff}
                  accent={bundle.combined.team.goalDiff > 0 ? "green" : bundle.combined.team.goalDiff < 0 ? "red" : "default"}
                />
                <StatCard label="Média marcados/jogo" value={bundle.combined.team.avgGoalsFor.toFixed(2)} />
                <StatCard label="Média sofridos/jogo" value={bundle.combined.team.avgGoalsAgainst.toFixed(2)} />
                <StatCard label="Sem sofrer" value={bundle.combined.team.cleanSheets} accent="green" />
                <StatCard label="Sem marcar" value={bundle.combined.team.scorelessGames} accent="amber" />
              </div>

              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-surface-border bg-zinc-900/80 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Adversário</th>
                      <th className="px-3 py-2">Resultado</th>
                      <th className="px-3 py-2">Competição</th>
                      <th className="px-3 py-2">Sistema / tática</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {bundle.combined.matches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                          Sem jogos neste período. Regista jogos em Táticas com a data correcta.
                        </td>
                      </tr>
                    ) : (
                      bundle.combined.matches.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2 text-zinc-300">{m.dateYmd}</td>
                          <td className="px-3 py-2 text-white">{m.opponent}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-2">
                              {outcomeBadge(m.outcome)}
                              <span className="font-medium text-zinc-200">{m.result}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-zinc-400">{m.competition}</td>
                          <td className="px-3 py-2 text-zinc-400">{m.tacticLabel}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. Tabela jogadores */}
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <Users className="h-4 w-4 text-accent" />
                2. Tabela mensal dos jogadores
              </h4>
              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-surface-border bg-zinc-900/80 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Jogador</th>
                      <th className="px-3 py-2 text-center">J</th>
                      <th className="px-3 py-2 text-center">G</th>
                      <th className="px-3 py-2 text-center">A</th>
                      <th className="px-3 py-2 text-center">Am</th>
                      <th className="px-3 py-2 text-center">Vm</th>
                      <th className="px-3 py-2 text-center">Min</th>
                      <th className="px-3 py-2 text-center">G/90</th>
                      <th className="px-3 py-2 text-center">A/90</th>
                      <th className="px-3 py-2 text-center">Part. golos</th>
                      <th className="px-3 py-2">Disciplina</th>
                      <th className="px-3 py-2">Disponibilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {bundle.combined.players.map((row) => {
                      const pl = players.find((p) => p.id === row.playerId);
                      const avail = pl ? availabilityLabelPt(pl.availability) : "—";
                      return (
                        <tr key={row.playerId} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2 font-medium text-white">{playerName(row.playerId)}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.games}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.goals}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.assists}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.yellowCards}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.redCards}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.minutes}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.goalsPer90.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-zinc-300">{row.assistsPer90.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-medium text-accent">{row.goalInvolvement}</td>
                          <td className="px-3 py-2">{disciplineBadge(row.discipline)}</td>
                          <td className="px-3 py-2">{avail !== "—" ? availabilityBadge(avail) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="flex items-start gap-2 text-xs text-zinc-500">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Disciplina: amarelos acumulados em todos os jogos (Táticas) até ao fim do período; limiares de risco 4, 7,
                10, 13, 16; suspensão a cada 5 amarelos ou vermelho no período.
              </p>
            </section>

            {/* 3. Análise coletiva */}
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                <BarChart3 className="h-4 w-4 text-accent" />
                3. Análise coletiva da equipa
              </h4>
              <p className="text-xs text-zinc-500">Preenchimento manual (persistido no workspace). Futuro: sugestões com AI.</p>
              {(bundle.selectedMonths.length === 1 ? bundle.selectedMonths : bundle.selectedMonths).map((mk) => {
                const notes = notesByMonth.get(mk) ?? { monthKey: mk, updatedAt: "" };
                return (
                  <Card key={mk} className="border-surface-border bg-surface-raised/15">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zinc-300">{monthLabelPt(mk)}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {QUAL_FIELDS.map(({ key, label }) => (
                        <label key={`${mk}-${key}`} className="block space-y-1 md:col-span-2">
                          <span className="text-xs text-zinc-500">{label}</span>
                          <textarea
                            className="min-h-[72px] w-full rounded-xl border border-surface-border bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none print:border-zinc-300 print:bg-white print:text-black"
                            value={(notes[key] as string | undefined) ?? ""}
                            onChange={(e) => updateNotes(mk, key, e.target.value)}
                            placeholder="Escreve a tua análise…"
                          />
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            {/* 4. Comparação */}
            {bundle.comparison.length > 1 ? (
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  4. Comparação entre meses
                </h4>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-surface-border bg-surface-raised/15">
                    <CardContent className="pt-5">
                      <ComparisonBars title="Vitórias por mês" points={bundle.comparison} valueKey="wins" />
                    </CardContent>
                  </Card>
                  <Card className="border-surface-border bg-surface-raised/15">
                    <CardContent className="pt-5">
                      <ComparisonBars title="Golos marcados" points={bundle.comparison} valueKey="goalsFor" />
                    </CardContent>
                  </Card>
                  <Card className="border-surface-border bg-surface-raised/15">
                    <CardContent className="pt-5">
                      <ComparisonBars
                        title="Golos sofridos"
                        points={bundle.comparison}
                        valueKey="goalsAgainst"
                        higherIsBetter={false}
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-surface-border bg-surface-raised/15">
                    <CardContent className="pt-5">
                      <ComparisonBars title="Minutos totais (plantel)" points={bundle.comparison} valueKey="totalMinutes" />
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-surface-border bg-zinc-900/80 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Mês</th>
                        <th className="px-3 py-2 text-center">V-E-D</th>
                        <th className="px-3 py-2 text-center">GM</th>
                        <th className="px-3 py-2 text-center">GS</th>
                        <th className="px-3 py-2 text-center">Minutos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {bundle.comparison.map((c, i) => {
                        const prev = i > 0 ? bundle.comparison[i - 1]! : null;
                        return (
                          <tr key={c.monthKey}>
                            <td className="px-3 py-2 text-white">{c.label}</td>
                            <td className="px-3 py-2 text-center text-zinc-300">
                              {c.wins}-{c.draws}-{c.losses}
                            </td>
                            <td className="px-3 py-2 text-center text-emerald-300">{c.goalsFor}</td>
                            <td className="px-3 py-2 text-center text-red-300">{c.goalsAgainst}</td>
                            <td
                              className={cn(
                                "px-3 py-2 text-center",
                                (() => {
                                  const minTone = prev ? deltaTone(c.totalMinutes, prev.totalMinutes) : "flat";
                                  return minTone === "up"
                                    ? "text-emerald-300"
                                    : minTone === "down"
                                      ? "text-red-300"
                                      : "text-zinc-300";
                                })()
                              )}
                            >
                              {c.totalMinutes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

