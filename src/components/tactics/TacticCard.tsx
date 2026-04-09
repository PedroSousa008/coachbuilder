import Link from "next/link";
import type { Tactic } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function TacticCard({
  tactic,
  active,
  onSelect,
  href,
}: {
  tactic: Tactic;
  active?: boolean;
  onSelect?: () => void;
  href?: string;
}) {
  const denom = tactic.wins + tactic.losses;
  const winRate = denom > 0 ? Math.round((tactic.wins / denom) * 100) : 0;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 font-medium text-zinc-100">{tactic.name}</p>
        <Badge variant="accent">{tactic.formation}</Badge>
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
