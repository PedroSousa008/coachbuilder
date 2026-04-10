"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrainingSession } from "@/types";
import { SessionCard } from "@/components/training/SessionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddTrainingSessionModal } from "@/components/training/AddTrainingSessionModal";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";
import { formatPlayerPositions } from "@/lib/player-positions";

const categories = [
  "Possession",
  "Finishing",
  "Defensive shape",
  "Pressing",
  "Recovery",
] as const;

function weekLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

export function TrainingPlansClient() {
  const {
    trainingSessions,
    addTrainingSession,
    players,
    trainingPlayerIdsBySession,
    setTrainingSessionPlayerIds,
  } = useAppData();

  const sorted = useMemo(
    () => [...trainingSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [trainingSessions]
  );

  const [selectedId, setSelectedId] = useState("");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  useEffect(() => {
    if (trainingSessions.length === 0) {
      setSelectedId("");
      return;
    }
    const order = [...trainingSessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const firstId = order[0]!.id;
    if (!selectedId || !order.some((s) => s.id === selectedId)) {
      setSelectedId(firstId);
    }
  }, [trainingSessions, selectedId]);

  const selected = sorted.find((s) => s.id === selectedId) ?? sorted[0];
  const selectedPlayerIds = selected ? trainingPlayerIdsBySession[selected.id] ?? [] : [];

  const togglePlayerForSession = (playerId: string) => {
    if (!selected) return;
    const set = new Set(selectedPlayerIds);
    if (set.has(playerId)) set.delete(playerId);
    else set.add(playerId);
    setTrainingSessionPlayerIds(selected.id, [...set]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AddTrainingSessionModal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onSave={(input) => {
          const s = addTrainingSession(input);
          setSelectedId(s.id);
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Weekly micro-cycle</h2>
          <p className="text-sm text-zinc-500">
            {sorted.length > 0 ? weekLabel(sorted[0].date) : "No sessions this week yet"}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setSessionModalOpen(true)}>
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
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border px-4 py-10 text-center text-sm text-zinc-500">
              No sessions planned yet. Tap <span className="font-medium text-zinc-400">New training session</span> to
              create one.
            </div>
          ) : (
            sorted.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                selected={s.id === selected?.id}
                onClick={() => setSelectedId(s.id)}
              />
            ))
          )}
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{selected?.title ?? "Session details"}</CardTitle>
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

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Players in focus</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Tick who this session targets — same roster as Team. Search them elsewhere by name or number.
                  </p>
                  {players.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">Add players under Team to attach them here.</p>
                  ) : (
                    <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-surface-border bg-surface-raised/30 p-2">
                      {players.map((p) => {
                        const on = selectedPlayerIds.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                                on ? "bg-accent/10" : "hover:bg-white/5"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => togglePlayerForSession(p.id)}
                                className="h-4 w-4 rounded border-zinc-600"
                              />
                              <span className="text-sm font-medium text-white">
                                #{p.number} {p.name}
                              </span>
                              <span className="text-xs text-zinc-500">{formatPlayerPositions(p)}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised/30 p-4 text-sm text-zinc-500">
                  Drill library and progressive blocks will attach here — structure is ready for nested drills per
                  session.
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Create your first session to plan the week — duration, intensity, and drill focus will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
