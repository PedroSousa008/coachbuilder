"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormationId, PitchPlayer, Tactic } from "@/types";
import { FORMATION_LAYOUTS } from "@/data/formations";
import { FootballPitch } from "@/components/tactics/FootballPitch";
import { TacticCard } from "@/components/tactics/TacticCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function clonePlayers(formation: FormationId, prefix: string): PitchPlayer[] {
  return FORMATION_LAYOUTS[formation].map((p, i) => ({
    ...p,
    id: `${prefix}-live-${i}`,
  }));
}

export function TacticsBoard({ initialTactics }: { initialTactics: Tactic[] }) {
  const [tactics] = useState(initialTactics);
  const [activeId, setActiveId] = useState(initialTactics[0]?.id ?? "");
  const active = useMemo(() => tactics.find((t) => t.id === activeId) ?? tactics[0], [tactics, activeId]);

  const [name, setName] = useState(active?.name ?? "");
  const [opponent, setOpponent] = useState(active?.opponent ?? "");
  const [notes, setNotes] = useState(active?.notes ?? "");
  const [formation, setFormation] = useState<FormationId>(active?.formation ?? "4-3-3");
  const [players, setPlayers] = useState<PitchPlayer[]>(active?.players ?? []);

  const syncFromTactic = useCallback((t: Tactic) => {
    setName(t.name);
    setOpponent(t.opponent);
    setNotes(t.notes);
    setFormation(t.formation);
    setPlayers(t.players);
  }, []);

  const selectTactic = (t: Tactic) => {
    setActiveId(t.id);
    syncFromTactic(t);
  };

  const applyFormation = (f: FormationId) => {
    setFormation(f);
    setPlayers(clonePlayers(f, active?.id ?? "new"));
  };

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border p-12 text-center text-zinc-500">
        No tactics yet. Create one from your dashboard (demo uses sample data).
      </div>
    );
  }

  const denom = active.wins + active.losses;
  const winRate = denom > 0 ? Math.round((active.wins / denom) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500" htmlFor="tname">
                Tactic name
              </label>
              <input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500" htmlFor="opp">
                Opponent
              </label>
              <input
                id="opp"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["4-3-3", "4-2-3-1", "3-5-2"] as FormationId[]).map((f) => (
              <Button
                key={f}
                type="button"
                variant={formation === f ? "primary" : "secondary"}
                size="sm"
                onClick={() => applyFormation(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <FootballPitch players={players} onPlayersChange={setPlayers} className="max-h-[min(70vh,640px)]" />

        <Card>
          <CardHeader>
            <CardTitle>Match strategy notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-xl border border-surface-border bg-surface-raised/80 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Rest defence, set pieces, pressing triggers, build-up rules..."
            />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
            <p className="text-xs text-zinc-500">Tracked when you log results (mock)</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Matches</p>
              <p className="mt-1 text-lg font-semibold text-white">{active.matchesUsed}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Win rate</p>
              <p className="mt-1 text-lg font-semibold text-accent">{winRate}%</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Wins</p>
              <p className="mt-1 text-lg font-semibold text-accent">{active.wins}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Losses</p>
              <p className="mt-1 text-lg font-semibold text-red-400/90">{active.losses}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Saved tactics</p>
          <div className="flex max-h-[min(50vh,420px)] flex-col gap-2 overflow-y-auto pr-1">
            {tactics.map((t) => (
              <TacticCard key={t.id} tactic={t} active={t.id === active.id} onSelect={() => selectTactic(t)} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
