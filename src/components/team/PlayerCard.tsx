import { useMemo } from "react";
import type { Player } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatPlayerPositions } from "@/lib/player-positions";
import { buildPlayerInsights } from "@/lib/player-insights";

const availabilityLabel = {
  available: "Available",
  doubt: "Matchday doubt",
  out: "Unavailable",
};

const performanceColor = {
  up: "text-accent",
  steady: "text-zinc-400",
  down: "text-amber-400/90",
};

export function PlayerCard({
  player,
  onOpen,
  roleBadge,
}: {
  player: Player;
  onOpen?: () => void;
  roleBadge?: "C" | "SC" | null;
}) {
  const insights = useMemo(() => buildPlayerInsights(player), [player]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-full flex-col rounded-2xl border border-surface-border bg-surface-raised/50 p-4 pt-10 text-left transition-all hover:border-zinc-600 hover:bg-surface-raised sm:pt-4"
    >
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span className="font-display text-xl font-bold leading-none text-accent">{insights.overall}</span>
        <span
          className="flex h-7 w-7 shrink-0 cursor-help items-center justify-center rounded-full border border-amber-500/55 bg-amber-500/15 text-sm font-bold leading-none text-amber-400"
          title={insights.summaryTitle}
          aria-label="Resumo: overall, destaques, a desenvolver e físico. Pára o rato para ler."
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="note"
        >
          !
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 font-display text-sm font-bold text-zinc-200">
          {player.number}
        </div>
        <div className="min-w-0 flex-1 pr-14 sm:pr-16">
          <p className="truncate font-medium text-white">{player.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge className="max-w-full truncate">{formatPlayerPositions(player)}</Badge>
            <span className="text-xs text-zinc-500">{player.age} yrs</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-surface-border/80 pt-3">
        <span
          className={cn(
            "text-xs font-medium",
            player.availability === "available" && "text-accent",
            player.availability === "doubt" && "text-amber-400",
            player.availability === "out" && "text-red-400/90"
          )}
        >
          {availabilityLabel[player.availability]}
        </span>
        <span className={cn("text-xs", performanceColor[player.performance])}>
          Form {player.performance === "up" ? "↑" : player.performance === "down" ? "↓" : "→"}
        </span>
      </div>
      {roleBadge ? (
        <span className="absolute bottom-3 right-3 rounded-md border border-accent/50 bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
          {roleBadge}
        </span>
      ) : null}
    </button>
  );
}
