import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { positive: boolean; text: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-raised/60 p-5 shadow-card transition-colors hover:border-zinc-600/60",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.positive ? "text-accent" : "text-amber-400/90"
              )}
            >
              {trend.text}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}
