import { useMemo } from "react";
import type { Player } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatPlayerPositions } from "@/lib/player-positions";
import { buildPlayerInsights } from "@/lib/player-insights";
import { photoFrameImgStyle } from "@/lib/player-photo-frame";

const availabilityLabel = {
  available: "Disponível",
  doubt: "Dúvida",
  out: "Indisponível",
};

const performanceColor = {
  up: "text-white",
  steady: "text-zinc-400",
  down: "text-red-400",
};

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

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
  const overallColorClass =
    insights.overall <= 49
      ? "text-red-500"
      : insights.overall <= 69
        ? "text-amber-400"
        : insights.overall <= 89
          ? "text-emerald-400"
          : "text-sky-300";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-full flex-col rounded-2xl border border-surface-border bg-surface-raised/50 p-4 pt-10 text-left transition-all hover:border-zinc-600 hover:bg-surface-raised sm:pt-4"
    >
      <div className="absolute right-3 top-3 flex justify-end">
        <span className={cn("font-display text-xl font-bold leading-none", overallColorClass)}>{insights.overall}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL or remote avatar
            <img
              src={player.photoUrl}
              alt=""
              className="h-full w-full"
              style={photoFrameImgStyle(player.photoFrame)}
            />
          ) : (
            <span className="font-display text-sm font-bold text-zinc-400">{playerInitials(player.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-14 sm:pr-16">
          <p className="truncate font-medium text-white">{player.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge className="max-w-full truncate">{formatPlayerPositions(player)}</Badge>
            <span className="text-xs text-zinc-500">{player.age} anos</span>
          </div>
        </div>
      </div>
      <div className="relative mt-4 flex min-h-[1.25rem] items-center gap-2 border-t border-surface-border/80 pt-3 pr-11 sm:pr-12">
        <span
          className={cn(
            "min-w-0 flex-1 text-xs font-medium",
            player.availability === "available" && "text-white",
            player.availability === "doubt" && "text-amber-400",
            player.availability === "out" && "text-red-400/90"
          )}
        >
          {availabilityLabel[player.availability]}
        </span>
        <span className={cn("shrink-0 text-xs font-medium", performanceColor[player.performance])}>
          Forma {player.performance === "up" ? "↑" : player.performance === "down" ? "↓" : "→"}
        </span>
        <div
          className="absolute right-3 top-1/2 flex h-5 min-w-[1.35rem] max-w-[2rem] -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-zinc-900/55 px-1 text-xs font-medium tabular-nums leading-none text-white"
          aria-label={`Número ${player.number}`}
        >
          {player.number}
        </div>
      </div>
      {roleBadge ? (
        <span className="absolute bottom-3 right-3 rounded-md border border-accent/50 bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
          {roleBadge}
        </span>
      ) : null}
    </button>
  );
}
