"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";

export type CoachMonthlyResultRow = {
  userId: string;
  coachName: string;
  team: string;
  monthLabel: string;
  sequence: string;
  games: number;
  wins: number;
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
  const [sortBy, setSortBy] = useState<"wins" | "goalsFor" | "goalsAgainst" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    const next = [...rows];
    next.sort((a, b) => {
      const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      if (diff !== 0) return sortDir === "desc" ? -diff : diff;
      return a.coachName.localeCompare(b.coachName, "pt-PT");
    });
    return next;
  }, [rows, sortBy, sortDir]);

  const toggleSort = (field: "wins" | "goalsFor" | "goalsAgainst") => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortBy(field);
    setSortDir("desc");
  };

  const sortIndicator = (field: "wins" | "goalsFor" | "goalsAgainst") => {
    if (sortBy !== field) return "↕";
    return sortDir === "desc" ? "↓" : "↑";
  };

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
                <th className="px-4 py-3">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("wins")}>
                    Vitórias <span className="text-[10px]">{sortIndicator("wins")}</span>
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("goalsFor")}>
                    Golos marcados <span className="text-[10px]">{sortIndicator("goalsFor")}</span>
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("goalsAgainst")}>
                    Golos sofridos <span className="text-[10px]">{sortIndicator("goalsAgainst")}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.userId} className="border-b border-surface-border/60">
                  <td className="px-4 py-3 font-medium text-zinc-200">{r.coachName}</td>
                  <td className="px-4 py-3">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{r.sequence}</td>
                  <td className="px-4 py-3">{r.games}</td>
                  <td className="px-4 py-3">{r.wins}</td>
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
