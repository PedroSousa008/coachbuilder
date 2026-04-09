import type { Player } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

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

export function PlayerCard({ player, onOpen }: { player: Player; onOpen?: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col rounded-2xl border border-surface-border bg-surface-raised/50 p-4 text-left transition-all hover:border-zinc-600 hover:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 font-display text-sm font-bold text-zinc-200">
          {player.number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{player.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge>{player.position}</Badge>
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
    </button>
  );
}
