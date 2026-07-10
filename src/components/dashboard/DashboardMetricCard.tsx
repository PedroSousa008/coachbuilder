import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DashboardMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111111] p-6 shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-[#141414] hover:shadow-[0_1px_0_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-500">{label}</p>
          <p className="mt-3 font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-white sm:text-[2.25rem]">
            {value}
          </p>
          {hint ? <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-500 transition-colors duration-200 group-hover:text-accent">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
