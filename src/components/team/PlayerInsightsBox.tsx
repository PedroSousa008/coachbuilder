import type { PlayerInsights } from "@/lib/player-insights";
import { cn } from "@/lib/utils";

export function PlayerInsightsBox({
  insights,
  squadNumber,
}: {
  insights: PlayerInsights;
  /** Número da camisola — mostrado num anel branco por baixo do overall. */
  squadNumber?: number;
}) {
  const { overall, primaryPosition, strengths, improvements, physical } = insights;

  return (
    <div className="space-y-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Overall</span>
        <span className="font-display text-3xl font-bold text-accent">{overall}</span>
        <span className="text-xs text-zinc-600">média das avaliações (0–100)</span>
      </div>
      {squadNumber != null && squadNumber >= 1 && squadNumber <= 99 ? (
        <div className="flex items-center pt-1">
          <div
            className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-full border-[3px] border-white bg-zinc-900/50 px-2 font-display text-lg font-bold tabular-nums text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
            aria-label={`Número ${squadNumber}`}
          >
            {squadNumber}
          </div>
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
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
