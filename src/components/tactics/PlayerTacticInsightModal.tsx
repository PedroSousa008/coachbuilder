"use client";

import { useEffect, useMemo, useState } from "react";
import type { PitchPlayer, Player, TacticMatch } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatPlayerPositions } from "@/lib/player-positions";
import { aggregatePlayerGlobal, aggregatePlayerInTactic } from "@/lib/tactics-match-stats";

type Props = {
  open: boolean;
  slot: PitchPlayer | null;
  player: Player | null;
  tacticId: string | null;
  tacticMatches: TacticMatch[];
  initialAnalysisNotes: string;
  onClose: () => void;
  onSaveAnalysis: (notes: string) => void;
  onChangePlayer: () => void;
};

export function PlayerTacticInsightModal({
  open,
  slot,
  player,
  tacticId,
  tacticMatches,
  initialAnalysisNotes,
  onClose,
  onSaveAnalysis,
  onChangePlayer,
}: Props) {
  const [draftNotes, setDraftNotes] = useState(initialAnalysisNotes);

  useEffect(() => {
    if (open) setDraftNotes(initialAnalysisNotes);
  }, [open, initialAnalysisNotes]);

  const globalAgg = useMemo(
    () => (player ? aggregatePlayerGlobal(tacticMatches, player.id) : null),
    [player, tacticMatches]
  );

  const tacticAgg = useMemo(() => {
    if (!player || !tacticId) return null;
    return aggregatePlayerInTactic(tacticMatches, tacticId, player.id);
  }, [player, tacticId, tacticMatches]);

  if (!open || !slot || !player) return null;

  const canAnalyze = Boolean(tacticId);

  const saveNotes = () => {
    onSaveAnalysis(draftNotes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(88vh,620px)] w-full max-w-md flex-col rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {slot.formationLabel} · #{player.number}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-white">{player.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{formatPlayerPositions(player)}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Dados de desempenho (global)</h4>
            <p className="mt-1 text-[11px] text-zinc-600">Todos os jogos registados em táticas.</p>
            {globalAgg ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Stat label="Jogos" value={globalAgg.games} />
                <Stat label="Golos" value={globalAgg.goals} />
                <Stat label="Assistências" value={globalAgg.assists} />
                <Stat label="Amarelos" value={globalAgg.yellowCards} />
                <Stat label="Vermelhos" value={globalAgg.redCards} />
                <Stat label="Minutos" value={globalAgg.minutes} />
              </dl>
            ) : null}
          </section>

          {canAnalyze && tacticAgg ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Nesta formação</h4>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Stat label="Jogos" value={tacticAgg.games} />
                <Stat label="Golos" value={tacticAgg.goals} />
                <Stat label="Assistências" value={tacticAgg.assists} />
                <Stat label="Amarelos" value={tacticAgg.yellowCards} />
                <Stat label="Vermelhos" value={tacticAgg.redCards} />
                <Stat label="Minutos" value={tacticAgg.minutes} />
              </dl>
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-surface-border px-3 py-2 text-xs text-zinc-500">
              Guarda a equipa para associar notas de análise a esta tática.
            </p>
          )}

          {canAnalyze ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Comentários de análise</h4>
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={4}
                placeholder="Observações táticas, comportamento, evolução…"
                className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-surface-border p-4 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onChangePlayer}>
            Trocar jogador
          </Button>
          {canAnalyze ? (
            <Button type="button" variant="primary" className="flex-1 sm:flex-none" onClick={saveNotes}>
              Guardar notas
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-900/60 px-3 py-2">
      <dt className="text-[10px] uppercase text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-white">{value}</dd>
    </div>
  );
}
