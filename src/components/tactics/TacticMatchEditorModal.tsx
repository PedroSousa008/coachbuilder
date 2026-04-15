"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player, TacticMatch, TacticMatchPlayerLine } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { inferOutcome } from "@/lib/tactics-match-stats";
import { formatPlayerPositions } from "@/lib/player-positions";

function uid() {
  return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLine(playerId: string): TacticMatchPlayerLine {
  return { playerId, goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 0 };
}

type Props = {
  open: boolean;
  tacticId: string;
  roster: Player[];
  suggestedPlayerIds: string[];
  existing: TacticMatch | null;
  quickImportMatches?: Array<{
    id: string;
    label: string;
    dateIso: string;
    opponent: string;
    teamGoals: number;
    opponentGoals: number;
  }>;
  onClose: () => void;
  onSave: (match: TacticMatch) => void;
  onDelete?: (matchId: string) => void;
};

export function TacticMatchEditorModal({
  open,
  tacticId,
  roster,
  suggestedPlayerIds,
  existing,
  quickImportMatches = [],
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [date, setDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [teamGoals, setTeamGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [lines, setLines] = useState<TacticMatchPlayerLine[]>([]);
  const [matchNotes, setMatchNotes] = useState("");

  const rosterById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDate(existing.date.slice(0, 10));
      setOpponent(existing.opponent);
      setTeamGoals(existing.teamGoals);
      setOpponentGoals(existing.opponentGoals);
      setLines(existing.playerStats.length ? [...existing.playerStats] : []);
      setMatchNotes(existing.notes ?? "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setOpponent("");
      setTeamGoals(0);
      setOpponentGoals(0);
      const seed = suggestedPlayerIds.filter((id) => rosterById.has(id));
      setLines(seed.length ? seed.map((id) => emptyLine(id)) : []);
      setMatchNotes("");
    }
  }, [open, existing, suggestedPlayerIds, rosterById]);

  const outcome = inferOutcome(teamGoals, opponentGoals);

  const addRow = () => {
    const used = new Set(lines.map((l) => l.playerId));
    const next = roster.find((p) => !used.has(p.id));
    if (!next) return;
    setLines((prev) => [...prev, emptyLine(next.id)]);
  };

  const updateLine = (index: number, patch: Partial<TacticMatchPlayerLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const applyQuickImport = (id: string) => {
    const pick = quickImportMatches.find((m) => m.id === id);
    if (!pick) return;
    setDate(pick.dateIso.slice(0, 10));
    setOpponent(pick.opponent);
    setTeamGoals(pick.teamGoals);
    setOpponentGoals(pick.opponentGoals);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const opp = opponent.trim();
    if (!opp || !date) return;
    const now = new Date().toISOString();
    const playerStats = lines.filter((l) => rosterById.has(l.playerId));
    const match: TacticMatch = {
      id: existing?.id ?? uid(),
      tacticId,
      date: new Date(date + "T12:00:00").toISOString(),
      opponent: opp,
      teamGoals,
      opponentGoals,
      outcome,
      playerStats,
      notes: matchNotes.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(match);
    onClose();
  };

  const handleDelete = () => {
    if (existing && onDelete) {
      onDelete(existing.id);
      onClose();
    }
  };

  if (!open) return null;

  const availableForSelect = (currentIndex: number, currentId: string) => {
    const used = new Set(lines.map((l, i) => (i === currentIndex ? null : l.playerId)).filter(Boolean) as string[]);
    return roster.filter((p) => p.id === currentId || !used.has(p.id));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-5">
          <h3 className="font-display text-lg font-semibold text-white">{existing ? "Editar jogo" : "Registar jogo"}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Resultado: {teamGoals}–{opponentGoals} · {outcome === "win" ? "Vitória" : outcome === "loss" ? "Derrota" : "Empate"}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-zinc-500">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Adversário</label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Equipa" className="mt-1" />
            </div>
          </div>
          {!existing && quickImportMatches.length > 0 ? (
            <div>
              <label className="text-xs text-zinc-500">Importar jogo do Calendário</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  applyQuickImport(e.target.value);
                  e.currentTarget.value = "";
                }}
                className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-zinc-900 px-3 text-sm text-white"
              >
                <option value="">Escolher jogo já disputado...</option>
                {quickImportMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-zinc-500">
                Preenche automaticamente adversário + resultado. Depois podes editar estatísticas individuais.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Golos (nós)</label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(teamGoals) ? teamGoals : 0}
                onChange={(e) => setTeamGoals(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Golos (eles)</label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(opponentGoals) ? opponentGoals : 0}
                onChange={(e) => setOpponentGoals(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Jogadores & estatísticas</h4>
              <button type="button" onClick={addRow} className="text-xs font-medium text-accent hover:underline">
                + Jogador
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {lines.length === 0 ? (
                <p className="text-xs text-zinc-500">Adiciona jogadores para registar golos, assistências e cartões.</p>
              ) : (
                lines.map((line, i) => {
                  const choices = availableForSelect(i, line.playerId);
                  return (
                    <div key={i} className="rounded-xl border border-surface-border bg-surface-raised/40 p-3">
                      <div className="flex gap-2">
                        <select
                          value={line.playerId}
                          onChange={(e) => updateLine(i, { playerId: e.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-surface-border bg-zinc-900 px-2 py-2 text-sm text-white"
                        >
                          {choices.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              #{pl.number} {pl.name} · {formatPlayerPositions(pl)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="shrink-0 rounded-lg px-2 text-xs text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1.5 text-[11px]">
                        <Num label="G" v={line.goals} on={(n) => updateLine(i, { goals: n })} />
                        <Num label="A" v={line.assists} on={(n) => updateLine(i, { assists: n })} />
                        <Num label="Y" v={line.yellowCards} on={(n) => updateLine(i, { yellowCards: n })} />
                        <Num label="R" v={line.redCards} on={(n) => updateLine(i, { redCards: n })} />
                        <Num label="Min" v={line.minutesPlayed} on={(n) => updateLine(i, { minutesPlayed: n })} max={120} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500">Notas do jogo</label>
            <textarea
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-surface-border p-4 sm:flex-row sm:flex-wrap">
          {existing && onDelete ? (
            <Button type="button" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={handleDelete}>
              Apagar jogo
            </Button>
          ) : null}
          <Button type="button" variant="primary" className="flex-1" onClick={handleSave}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Num({
  label,
  v,
  on,
  max = 20,
}: {
  label: string;
  v: number;
  on: (n: number) => void;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-zinc-500">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={v}
        onChange={(e) => on(Math.min(max, Math.max(0, parseInt(e.target.value, 10) || 0)))}
        className="w-full rounded border border-surface-border bg-zinc-900 px-1 py-1 text-center text-white"
      />
    </label>
  );
}
