"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { INFERRED_TEAM_ESCALAO_LABELS, normalizeEscalaoFilterKey } from "@/lib/coach-team-escalao";

const ESCALAO_FILTER_KEYS = [...INFERRED_TEAM_ESCALAO_LABELS, "—"] as const;

function allEscaloesSelected(map: Record<string, boolean>): boolean {
  return ESCALAO_FILTER_KEYS.every((k) => map[k]);
}

function defaultEscalaoSelection(): Record<string, boolean> {
  return Object.fromEntries(ESCALAO_FILTER_KEYS.map((k) => [k, true]));
}

export type CoachMonthlyResultRow = {
  userId: string;
  coachName: string;
  escalao: string;
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
  const [escalaoMenuOpen, setEscalaoMenuOpen] = useState(false);
  const [selectedEscaloes, setSelectedEscaloes] = useState(defaultEscalaoSelection);
  const escalaoPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!escalaoMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = escalaoPopoverRef.current;
      if (el && !el.contains(e.target as Node)) setEscalaoMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEscalaoMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [escalaoMenuOpen]);

  const escalaoFilterActive = !allEscaloesSelected(selectedEscaloes);

  const escalaoFilteredRows = useMemo(() => {
    return rows.filter((r) => selectedEscaloes[normalizeEscalaoFilterKey(r.escalao)]);
  }, [rows, selectedEscaloes]);

  const sortedRows = useMemo(() => {
    if (!sortBy) return escalaoFilteredRows;
    const next = [...escalaoFilteredRows];
    next.sort((a, b) => {
      const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      if (diff !== 0) return sortDir === "desc" ? -diff : diff;
      return a.coachName.localeCompare(b.coachName, "pt-PT");
    });
    return next;
  }, [escalaoFilteredRows, sortBy, sortDir]);

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

  const toggleEscalaoKey = (key: string) => {
    setSelectedEscaloes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllEscaloes = () => setSelectedEscaloes(defaultEscalaoSelection());
  const clearEscalaoSelection = () =>
    setSelectedEscaloes(Object.fromEntries(ESCALAO_FILTER_KEYS.map((k) => [k, false])));

  const escalaoCheckboxLabel = (key: string) =>
    key === "—" ? "Sem escalão (—)" : key;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Fonte: últimos 5 jogos no Calendário (Jogos anteriores). Escalão: média de idades dos jogadores da
          equipa (data de nascimento ou idade guardada); se existir algum jogador com mais de 20 anos, conta como
          Séniores.
        </p>
        {payload?.monthLabel ? <p className="mt-1 text-xs text-zinc-600">Período: {payload.monthLabel}</p> : null}
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1060px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Treinador</th>
                <th className="relative px-4 py-3">
                  <div className="inline-block text-left normal-case" ref={escalaoPopoverRef}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                      aria-expanded={escalaoMenuOpen}
                      aria-haspopup="true"
                      onClick={() => setEscalaoMenuOpen((o) => !o)}
                    >
                      Escalão
                      {escalaoFilterActive ? (
                        <span className="rounded bg-amber-500/20 px-1.5 py-px text-[10px] font-medium normal-case text-amber-200">
                          filtro
                        </span>
                      ) : null}
                      <span className="text-[10px] opacity-70">{escalaoMenuOpen ? "▲" : "▼"}</span>
                    </button>
                    {escalaoMenuOpen ? (
                      <div
                        className="absolute left-2 top-full z-30 mt-1 w-[min(100vw-2rem,16rem)] rounded-lg border border-surface-border bg-zinc-900 py-2 shadow-xl"
                        role="menu"
                      >
                        <p className="px-3 pb-2 text-[11px] leading-snug text-zinc-500">
                          Mostrar apenas treinadores destes escalões:
                        </p>
                        <ul className="max-h-[min(60vh,22rem)] overflow-y-auto px-2">
                          {ESCALAO_FILTER_KEYS.map((key) => (
                            <li key={key}>
                              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/40"
                                  checked={!!selectedEscaloes[key]}
                                  onChange={() => toggleEscalaoKey(key)}
                                />
                                <span>{escalaoCheckboxLabel(key)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-1 flex flex-wrap gap-2 border-t border-surface-border px-3 pt-2">
                          <button
                            type="button"
                            className="text-[11px] text-amber-200/90 hover:underline"
                            onClick={selectAllEscaloes}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 hover:underline"
                            onClick={clearEscalaoSelection}
                          >
                            Nenhum
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </th>
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
                  <td className="px-4 py-3 text-zinc-300">{r.escalao ?? "—"}</td>
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
          ) : sortedRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Nenhum treinador corresponde aos escalões selecionados. Ajusta o filtro no cabeçalho «Escalão».
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
