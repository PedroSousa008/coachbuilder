"use client";

import { useMemo, useState } from "react";
import type { FormationId, Player } from "@/types";
import { formationDisplayLabel } from "@/data/formations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  STYLE_OF_PLAY_DEFINITIONS,
  type StyleOfPlayId,
  buildStyleOfPlayReport,
} from "@/lib/style-of-play-ai";
import { formatPlayerPositions } from "@/lib/player-positions";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  roster: Player[];
  currentFormation: FormationId;
  onApplyFormation: (f: FormationId) => void;
  onApplyLineup: (f: FormationId, orderedPlayers: (Player | null)[]) => void;
};

export function StyleOfPlayHelperModal({
  open,
  onClose,
  roster,
  currentFormation,
  onApplyFormation,
  onApplyLineup,
}: Props) {
  const [styleId, setStyleId] = useState<StyleOfPlayId>("balanced_control");
  const [analyzed, setAnalyzed] = useState(false);

  const report = useMemo(() => {
    if (!analyzed || roster.length === 0) return null;
    return buildStyleOfPlayReport(roster, currentFormation, styleId);
  }, [analyzed, roster, currentFormation, styleId]);

  if (!open) return null;

  const topFormation = report?.rankedFormations[0]?.formation;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/80 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="sop-helper-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 id="sop-helper-title" className="font-display text-lg font-semibold text-white">
                AI Style of Play Helper
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Análise por posição e Qualities (atributos FIFA)
                do plantel. Escolhe o estilo de jogo desejado e obtém formação, onze, transições e sugestões de
                substituição.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Estilo de jogo</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {STYLE_OF_PLAY_DEFINITIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStyleId(s.id);
                    setAnalyzed(false);
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    styleId === s.id
                      ? "border-accent/50 bg-accent/10 text-white"
                      : "border-surface-border bg-surface-raised/40 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="font-medium">{s.labelPt}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{s.shortPt}</span>
                </button>
              ))}
            </div>
          </section>

          <Button
            type="button"
            className="w-full"
            onClick={() => setAnalyzed(true)}
            disabled={roster.length === 0}
          >
            {roster.length === 0 ? "Adiciona jogadores na equipa" : "Gerar análise com AI Helper"}
          </Button>

          {roster.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">Vai a Team e preenche atributos nas fichas dos jogadores.</p>
          ) : null}

          {report ? (
            <>
              <section className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Formação recomendada</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Com base no encaixe médio do plantel para <span className="text-zinc-200">{report.style.labelPt}</span>.
                  Formação actual no quadro: <Badge variant="muted">{report.formationLabel}</Badge> · ajuste médio{" "}
                  <span className="font-semibold text-accent">{report.avgCurrentFit}</span>/100
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {report.rankedFormations.slice(0, 5).map((r, i) => (
                    <li key={r.formation} className="flex items-center justify-between gap-2">
                      <span className="text-zinc-300">
                        {i + 1}. {formationDisplayLabel(r.formation)}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">ajuste {r.avgFit}</span>
                    </li>
                  ))}
                </ul>
                {topFormation ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onApplyFormation(topFormation)}
                  >
                    Aplicar melhor formação sugerida
                  </Button>
                ) : null}
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Onze sugerido (quadro actual)</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Por posição e pesos do estilo. &quot;Fallback&quot; = jogador fora do perfil natural do lugar.
                </p>
                <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-surface-border bg-zinc-900/40 p-2">
                  {report.lineup.map((row, i) => (
                    <li
                      key={`${row.slotLabel}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <span className="text-zinc-500">{row.slotLabel}</span>
                      {row.player ? (
                        <span className="text-right text-zinc-200">
                          #{row.player.number} {row.player.name}
                          <span className="ml-2 text-xs text-zinc-500">
                            {row.score} {row.usedFallback ? "· fallback" : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const ordered = report.lineup.map((r) => r.player);
                    onApplyLineup(currentFormation, ordered);
                  }}
                >
                  Aplicar este onze ao quadro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 ml-0 sm:ml-2"
                  disabled={!topFormation}
                  onClick={() => {
                    if (!topFormation) return;
                    const lineup = buildStyleOfPlayReport(roster, topFormation, styleId).lineup;
                    onApplyLineup(
                      topFormation,
                      lineup.map((r) => r.player)
                    );
                  }}
                >
                  Aplicar melhor formação + onze
                </Button>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Transições & movimentos</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-400">
                  {report.style.transitionBulletsPt.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Substituições por contexto</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Sugestões a partir dos que ficam de fora do onze sugerido (perfil de atributos).
                </p>
                <div className="mt-3 space-y-4">
                  {report.subs.map((g) => (
                    <div key={g.titlePt} className="rounded-xl border border-surface-border bg-surface-raised/30 p-3">
                      <p className="font-medium text-zinc-200">{g.titlePt}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{g.hintPt}</p>
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        {g.players.map((p) => (
                          <li key={p.id}>
                            #{p.number} {p.name}{" "}
                            <span className="text-xs text-zinc-500">({formatPlayerPositions(p)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>

        <div className="border-t border-surface-border p-4">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
