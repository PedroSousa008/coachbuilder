"use client";

import { useMemo } from "react";
import type { CoachCareerSeason, Tactic, TacticMatch } from "@/types";
import type { Player } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { computeCoachPerformance, tacticLabel } from "@/lib/tactics-match-stats";
import {
  aggregateCareerSeasons,
  combineTacticsAndCareer,
  sortSeasonsChronologically,
} from "@/lib/coach-career-aggregates";

function PerfCell({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={`mt-2 font-display text-xl font-semibold tabular-nums ${
          danger ? "text-red-400/90" : accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type Props = {
  savedTactics: Tactic[];
  tacticMatches: TacticMatch[];
  players: Player[];
  careerSeasons: CoachCareerSeason[] | undefined;
};

export function PerformanceTab({ savedTactics, tacticMatches, players, careerSeasons }: Props) {
  const coachPerf = useMemo(
    () => computeCoachPerformance(savedTactics, tacticMatches, players),
    [savedTactics, tacticMatches, players]
  );
  const careerAgg = useMemo(() => aggregateCareerSeasons(careerSeasons), [careerSeasons]);
  const combined = useMemo(() => combineTacticsAndCareer(coachPerf, careerAgg), [coachPerf, careerAgg]);
  const sortedSeasons = useMemo(
    () => sortSeasonsChronologically(careerSeasons ?? []),
    [careerSeasons]
  );

  const maxBar = useMemo(() => {
    let m = 1;
    for (const s of sortedSeasons) {
      m = Math.max(m, s.stats.played, s.stats.wins);
    }
    return m;
  }, [sortedSeasons]);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="font-display text-lg font-semibold text-white">Visão global</h3>
          <p className="text-sm text-zinc-500">
            Combina jogos registados nas <span className="text-zinc-400">Táticas</span> com as{" "}
            <span className="text-zinc-400">épocas da Carreira</span> para uma fotografia completa.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PerfCell label="Jogos (total)" value={combined.matches} accent />
          <PerfCell label="Vitórias" value={combined.wins} accent />
          <PerfCell label="Empates" value={combined.draws} />
          <PerfCell label="Derrotas" value={combined.losses} danger />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <PerfCell label="Golos marcados" value={combined.goalsFor} />
          <PerfCell label="Golos sofridos" value={combined.goalsAgainst} />
          <PerfCell label="% vitórias (global)" value={`${combined.winRate}%`} accent />
        </div>
      </section>

      <Card className="border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90">
        <CardHeader>
          <CardTitle className="text-white">Das táticas</CardTitle>
          <p className="text-sm text-zinc-500">
            Agregado automático a partir dos jogos que registas nas formações. Actualiza em tempo real.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PerfCell label="Vitórias" value={coachPerf.wins} accent />
            <PerfCell label="Empates" value={coachPerf.draws} />
            <PerfCell label="Derrotas" value={coachPerf.losses} danger />
            <PerfCell label="% vitórias" value={`${coachPerf.winRate}%`} accent />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PerfCell label="Golos marcados" value={coachPerf.goalsFor} />
            <PerfCell label="Golos sofridos" value={coachPerf.goalsAgainst} />
            <PerfCell
              label="Diferença"
              value={coachPerf.goalDiff >= 0 ? `+${coachPerf.goalDiff}` : coachPerf.goalDiff}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PerfCell label="Jogos sem sofrer" value={coachPerf.cleanSheets} />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Forma (últimos 5)</p>
              <p className="mt-2 font-medium text-white">
                {coachPerf.formLast5.length ? coachPerf.formLast5.join(" · ") : "—"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tática mais utilizada</p>
              <p className="mt-2 text-sm font-medium leading-snug text-zinc-200">
                {coachPerf.mostUsedTactic ? tacticLabel(coachPerf.mostUsedTactic.tactic) : "—"}
              </p>
              {coachPerf.mostUsedTactic ? (
                <p className="mt-1 text-xs text-zinc-500">{coachPerf.mostUsedTactic.matches} jogos</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Melhor taxa de vitória (mín. 1 jogo)</p>
              <p className="mt-2 text-sm font-medium leading-snug text-zinc-200">
                {coachPerf.bestTacticByWinRate ? tacticLabel(coachPerf.bestTacticByWinRate.tactic) : "—"}
              </p>
              {coachPerf.bestTacticByWinRate ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {coachPerf.bestTacticByWinRate.winRate}% · {coachPerf.bestTacticByWinRate.matches} jogos
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Melhor marcador (todas as táticas)</p>
            <p className="mt-2 text-sm font-medium text-white">
              {coachPerf.topScorer
                ? `${coachPerf.topScorer.player.name} — ${coachPerf.topScorer.goals} golos`
                : "Ainda sem golos registados"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-gradient-to-br from-emerald-950/20 to-zinc-950/90">
        <CardHeader>
          <CardTitle className="text-white">Da carreira</CardTitle>
          <p className="text-sm text-zinc-500">
            Soma das estatísticas que introduzes na aba <span className="text-emerald-400/90">Carreira</span>, por época
            desportiva.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {careerAgg.seasonsCount === 0 ? (
            <p className="text-sm text-zinc-500">
              Ainda sem épocas na Carreira. Quando adicionares temporadas, os totais aparecem aqui e alimentam a visão
              global.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PerfCell label="Épocas" value={careerAgg.seasonsCount} accent />
                <PerfCell label="Jogos" value={careerAgg.played} />
                <PerfCell label="Vitórias" value={careerAgg.wins} accent />
                <PerfCell label="% vitórias" value={`${careerAgg.winRate}%`} accent />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <PerfCell label="Empates" value={careerAgg.draws} />
                <PerfCell label="Derrotas" value={careerAgg.losses} danger />
                <PerfCell label="Pontos (soma)" value={careerAgg.points} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <PerfCell label="Golos marcados" value={careerAgg.goalsFor} />
                <PerfCell label="Golos sofridos" value={careerAgg.goalsAgainst} />
                <PerfCell label="Títulos (épocas)" value={careerAgg.titles} accent />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="text-white">Evolução por época</CardTitle>
          <p className="text-sm text-zinc-500">Percentagem de vitórias por época (barra relativa ao máximo no gráfico).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSeasons.length === 0 ? (
            <p className="text-sm text-zinc-500">Adiciona épocas na Carreira para ver a evolução.</p>
          ) : (
            <div className="space-y-4">
              {sortedSeasons.map((s) => {
                const rate =
                  s.stats.played > 0 ? Math.round((s.stats.wins / s.stats.played) * 100) : 0;
                const w = maxBar > 0 ? Math.max(8, Math.round((s.stats.wins / maxBar) * 100)) : 0;
                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span className="font-medium text-zinc-200">
                        {s.seasonLabel} · {s.club || "—"} · {s.ageGroup}
                      </span>
                      <span>
                        {s.stats.wins}V {s.stats.draws}E {s.stats.losses}D · {rate}% vit.
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
