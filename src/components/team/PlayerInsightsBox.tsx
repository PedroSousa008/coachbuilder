import type { PlayerInsights } from "@/lib/player-insights";
import { cn } from "@/lib/utils";

export function PlayerInsightsBox({ insights }: { insights: PlayerInsights }) {
  const { overall, primaryPosition, strengths, improvements, physical } = insights;

  return (
    <div className="space-y-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Overall</span>
        <span className="font-display text-3xl font-bold text-accent">{overall}</span>
        <span className="text-xs text-zinc-600">média das avaliações (0–100)</span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">Melhores qualidades</p>
        <ul className="mt-1 list-inside list-disc text-zinc-300">
          {strengths.map((s) => (
            <li key={s.id}>
              {s.label} — <span className="tabular-nums text-white">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
          A desenvolver (foco {primaryPosition})
        </p>
        <ul className="mt-1 list-inside list-disc text-zinc-300">
          {improvements.map((s) => (
            <li key={s.id}>
              {s.label} — <span className="tabular-nums text-white">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">Físico (altura / peso)</p>
        <ul className="mt-1 space-y-1 text-zinc-400">
          {physical.lines.map((line, i) => (
            <li key={i} className={cn("leading-snug", physical.ok && i === 0 && "text-zinc-300")}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
