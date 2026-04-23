"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Datum = { label: string; value: number };

export function PresidentBarChart({
  title,
  subtitle,
  data,
  valueSuffix = "",
  barClassName,
}: {
  title: string;
  subtitle?: string;
  data: Datum[];
  valueSuffix?: string;
  barClassName?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card className="border-surface-border bg-surface-raised/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end gap-1.5 sm:gap-2">
          {data.map((d) => {
            const h = Math.round((d.value / max) * 100);
            return (
              <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                  {d.value}
                  {valueSuffix}
                </span>
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-accent/25 to-accent/60 sm:max-w-[36px]",
                    barClassName
                  )}
                  style={{ height: `${Math.max(h, 8)}%` }}
                  title={`${d.label}: ${d.value}${valueSuffix}`}
                />
                <span className="line-clamp-2 text-center text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
