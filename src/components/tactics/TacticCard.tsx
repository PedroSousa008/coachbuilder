import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { Tactic } from "@/types";
import { formationDisplayLabel } from "@/data/formations";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function TacticCard({
  tactic,
  active,
  onSelect,
  onDelete,
  href,
}: {
  tactic: Tactic;
  active?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  href?: string;
}) {
  const denom = tactic.wins + tactic.losses;
  const winRate = denom > 0 ? Math.round((tactic.wins / denom) * 100) : 0;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 min-w-0 flex-1 font-medium text-zinc-100">{tactic.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="accent">{formationDisplayLabel(tactic.formation)}</Badge>
          {onDelete && !href && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
              aria-label="Apagar formação"
              title="Apagar"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">vs {tactic.opponent}</p>
      <div className="mt-3 flex gap-3 text-[11px] text-zinc-500">
        <span>{tactic.matchesUsed} matches</span>
        <span className="text-zinc-600">·</span>
        <span className="text-accent/90">{winRate}% W</span>
      </div>
    </>
  );

  const className = cn(
    "block w-full rounded-xl border p-3 text-left transition-all",
    active
      ? "border-accent/40 bg-accent/5 shadow-glow"
      : "border-surface-border bg-surface-raised/40 hover:border-zinc-600"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className}>
      {inner}
    </button>
  );
}
