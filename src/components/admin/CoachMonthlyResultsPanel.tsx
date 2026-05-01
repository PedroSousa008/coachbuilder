"use client";

import { Card, CardContent } from "@/components/ui/Card";

export type CoachMonthlyResultRow = {
  userId: string;
  coachName: string;
  team: string;
  monthLabel: string;
  sequence: string;
  games: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type CoachResultsPayload = {
  ok?: boolean;
  monthLabel?: string;
  generatedAt?: string;
  rows?: CoachMonthlyResultRow[];
  error?: string;
};

export function CoachMonthlyResultsPanel({
  payload,
  title = "Resultados do mês passado",
}: {
  payload: CoachResultsPayload | null;
  title?: string;
}) {
  const rows = payload?.rows ?? [];
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Fonte: jogos registados nas táticas + resultados por print no calendário (Jogos anteriores) + jogos
          importados com marcador.
        </p>
        {payload?.monthLabel ? <p className="mt-1 text-xs text-zinc-600">Período: {payload.monthLabel}</p> : null}
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Treinador</th>
                <th className="px-4 py-3">Equipa</th>
                <th className="px-4 py-3">Resultados</th>
                <th className="px-4 py-3">Jogos</th>
                <th className="px-4 py-3">Golos marcados</th>
                <th className="px-4 py-3">Golos sofridos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-surface-border/60">
                  <td className="px-4 py-3 font-medium text-zinc-200">{r.coachName}</td>
                  <td className="px-4 py-3">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{r.sequence}</td>
                  <td className="px-4 py-3">{r.games}</td>
                  <td className="px-4 py-3">{r.goalsFor}</td>
                  <td className="px-4 py-3">{r.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Sem dados de jogos no mês passado para os treinadores com workspace cloud.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
