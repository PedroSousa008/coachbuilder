"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { cn } from "@/lib/utils";

type DisciplineRow = {
  subjectType: "jogador" | "staff";
  sourceKey: string;
  subjectName: string;
  team: string;
  yellowCards: number;
  redCards: number;
  minutes: number;
  gamesSuspended: number;
  sequenceLast5: string;
};

const NOTE_CATEGORY = "__nota_disciplina__";
const YELLOW_CARD_RISK_COUNTS = new Set([4, 7, 10, 13, 16]);
const DISCIPLINE_REFRESH_MS = 45_000;

function safeRatio(cards: number, minutes: number): string {
  if (minutes <= 0 || cards <= 0) return "0.000";
  return (cards / minutes).toFixed(3);
}

function cardsPerGame(cards: number, sequenceLast5: string): string {
  if (cards <= 0) return "0.00";
  const gamesTracked = sequenceLast5
    .trim()
    .split(/\s+/)
    .filter((token) => token === "-" || token === "A" || token === "R").length;
  if (gamesTracked <= 0) return "0.00";
  return (cards / gamesTracked).toFixed(2);
}

function riskClass(yellowCards: number): string {
  if (!YELLOW_CARD_RISK_COUNTS.has(yellowCards)) return "text-zinc-200";
  return "font-semibold text-amber-300";
}

export default function PresidentDisciplinaPage() {
  const { state, addDisciplineIncident, removeDisciplineIncident } = usePresidentClub();
  const [rows, setRows] = useState<DisciplineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timerId: number | null = null;

    const load = async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/cloud/president/discipline-summary", { credentials: "include" });
        const data = (await res.json()) as { ok?: boolean; error?: string; rows?: DisciplineRow[] };
        if (cancelled) return;
        if (res.ok && data.ok) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setError(null);
        } else if (!silent) {
          setError(typeof data.error === "string" ? data.error : "Falha ao carregar disciplina.");
        }
      } catch {
        if (!silent) setError("Falha de rede ao carregar disciplina.");
      } finally {
        if (!silent && !cancelled) setLoading(false);
      }
    };

    void load(false);
    timerId = window.setInterval(() => {
      void load(true);
    }, DISCIPLINE_REFRESH_MS);

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearInterval(timerId);
    };
  }, []);

  const notesByKey = useMemo(() => {
    const out = new Map<string, { id: string; details: string }>();
    state.disciplineIncidents.forEach((x) => {
      if (x.category !== NOTE_CATEGORY) return;
      const key = x.subjectName.trim();
      if (!key) return;
      out.set(key, { id: x.id, details: x.details });
    });
    return out;
  }, [state.disciplineIncidents]);

  const teams = useMemo(
    () => ["all", ...new Set(rows.map((r) => r.team.trim()).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (teamFilter === "all") return true;
        return r.team === teamFilter;
      }),
    [rows, teamFilter]
  );

  const topPlayers = useMemo(
    () =>
      filteredRows
        .filter((r) => r.subjectType === "jogador")
        .map((r) => ({ ...r, totalCards: r.yellowCards + r.redCards }))
        .sort((a, b) => b.totalCards - a.totalCards || b.redCards - a.redCards || b.yellowCards - a.yellowCards)
        .slice(0, 10),
    [filteredRows]
  );

  const startEdit = (row: DisciplineRow) => {
    setEditingKey(row.sourceKey);
    setNoteDraft(notesByKey.get(row.sourceKey)?.details ?? "");
  };

  const saveNote = (row: DisciplineRow) => {
    const existing = notesByKey.get(row.sourceKey);
    if (existing) removeDisciplineIncident(existing.id);
    if (noteDraft.trim()) {
      addDisciplineIncident({
        subjectType: row.subjectType === "staff" ? "treinador" : "jogador",
        subjectName: row.sourceKey,
        category: NOTE_CATEGORY,
        date: new Date().toISOString().slice(0, 10),
        details: noteDraft.trim(),
        fineEUR: 0,
      });
    }
    setEditingKey(null);
    setNoteDraft("");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Disciplina</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Dados sincronizados automaticamente com os jogos registados pelo treinador (táticas).
          </p>
        </div>
        <div className="min-w-[230px]">
          <label className="mb-1 block text-xs text-zinc-500">Escalão</label>
          <select
            className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {teams.filter((t) => t !== "all").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Top 10 jogadores com mais cartões</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-y border-surface-border bg-[#0c1116] text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Jogador</th>
                <th className="px-3 py-2 text-left">Escalão</th>
                <th className="px-3 py-2 text-left">Amarelos</th>
                <th className="px-3 py-2 text-left">Vermelhos</th>
                <th className="px-3 py-2 text-left">Total cartões</th>
                <th className="px-3 py-2 text-left">Jogos suspensos</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    Sem dados para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                topPlayers.map((r) => (
                  <tr key={r.sourceKey} className="border-b border-surface-border/50">
                    <td className="px-3 py-2 text-zinc-100">{r.subjectName}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.team || "—"}</td>
                    <td className={cn("px-3 py-2", riskClass(r.yellowCards))}>{r.yellowCards}</td>
                    <td className="px-3 py-2 text-zinc-200">{r.redCards}</td>
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.totalCards}</td>
                    <td className="px-3 py-2 text-zinc-200">{r.gamesSuspended}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Tabela disciplinar (jogadores e staff)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="border-y border-surface-border bg-[#0c1116] text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Escalão</th>
                <th className="px-3 py-2 text-left">Amarelos</th>
                <th className="px-3 py-2 text-left">Vermelhos</th>
                <th className="px-3 py-2 text-left">Minutos</th>
                <th className="px-3 py-2 text-left">Amarelos por Jogo</th>
                <th className="px-3 py-2 text-left">Vermelhos por Jogo</th>
                <th className="px-3 py-2 text-left">Jogos Suspensos</th>
                <th className="px-3 py-2 text-left">Sequência de Cartões</th>
                <th className="px-3 py-2 text-left">Notas</th>
                <th className="px-3 py-2 text-left">Editar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-zinc-500">
                    A carregar disciplina...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-red-300">
                    {error}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-zinc-500">
                    Sem linhas para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const note = notesByKey.get(r.sourceKey)?.details ?? "";
                  const isEditing = editingKey === r.sourceKey;
                  return (
                    <tr key={r.sourceKey} className="border-b border-surface-border/50 transition-colors hover:bg-white/5">
                      <td className="px-3 py-2 text-zinc-100">{r.subjectName}</td>
                      <td className="px-3 py-2 text-zinc-400">{r.subjectType === "staff" ? "Staff" : "Jogador"}</td>
                      <td className="px-3 py-2 text-zinc-400">{r.team || "—"}</td>
                      <td className={cn("px-3 py-2", riskClass(r.yellowCards))}>{r.yellowCards}</td>
                      <td className="px-3 py-2 text-zinc-200">{r.redCards}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-200">{r.minutes}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">{cardsPerGame(r.yellowCards, r.sequenceLast5)}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">{cardsPerGame(r.redCards, r.sequenceLast5)}</td>
                      <td className="px-3 py-2 text-zinc-200">{r.gamesSuspended}</td>
                      <td className="px-3 py-2 font-mono text-xs tracking-wide text-zinc-300">{r.sequenceLast5}</td>
                      <td className="max-w-[300px] px-3 py-2 text-zinc-300">
                        {isEditing ? (
                          <Input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Nota disciplinar" />
                        ) : (
                          <span>{note || "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button type="button" size="sm" className="h-8 px-2" onClick={() => saveNote(r)}>
                              Guardar
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingKey(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button type="button" size="sm" variant="secondary" className="h-8 px-2" onClick={() => startEdit(r)}>
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-zinc-500">
        Números a amarelo em <strong>Amarelos</strong> indicam risco de suspensão (4, 7, 10, 13, 16 cartões).
      </p>
    </div>
  );
}
