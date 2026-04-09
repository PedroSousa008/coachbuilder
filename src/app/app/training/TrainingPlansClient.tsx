"use client";

import { useMemo, useState } from "react";
import type { TrainingSession } from "@/types";
import { SessionCard } from "@/components/training/SessionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const categories = [
  "Possession",
  "Finishing",
  "Defensive shape",
  "Pressing",
  "Recovery",
] as const;

function weekLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { week: "long", day: "numeric", month: "short" });
}

export function TrainingPlansClient({ sessions }: { sessions: TrainingSession[] }) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? "");
  const selected = sorted.find((s) => s.id === selectedId) ?? sorted[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Weekly micro-cycle</h2>
          <p className="text-sm text-zinc-500">{weekLabel(sorted[0]?.date ?? new Date().toISOString())}</p>
        </div>
        <Button type="button" variant="primary">
          New training session
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Badge key={c} variant="muted" className="cursor-default px-3 py-1 text-xs">
            {c}
          </Badge>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Sessions</p>
          {sorted.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              selected={s.id === selected?.id}
              onClick={() => setSelectedId(s.id)}
            />
          ))}
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{selected?.title ?? "Select a session"}</CardTitle>
            {selected && (
              <p className="text-sm text-zinc-500">
                {new Date(selected.date).toLocaleString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {selected.durationMin} min ·{" "}
                <span className="capitalize text-zinc-400">{selected.intensity} intensity</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {selected ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {selected.categories.map((c) => (
                    <Badge key={c} variant="accent">
                      {c}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{selected.description}</p>
                <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised/30 p-4 text-sm text-zinc-500">
                  Drill library and progressive blocks will attach here — structure is ready for nested drills per
                  session.
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No sessions in this demo week.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
