"use client";

import { useMemo, useState } from "react";
import type { Position } from "@/types";
import { PlayerCard } from "@/components/team/PlayerCard";
import { AddPlayerModal } from "@/components/players/AddPlayerModal";
import { PlayerDetailModal } from "@/components/players/PlayerDetailModal";
import { playerHasPosition, sortSquadRoster, type SquadSortBy } from "@/lib/player-positions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/contexts/AppDataContext";

const positions: (Position | "all")[] = [
  "all",
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

const SORT_OPTIONS: { id: SquadSortBy; label: string }[] = [
  { id: "number", label: "Team number" },
  { id: "position", label: "Position" },
  { id: "name", label: "Name" },
];

export default function TeamPage() {
  const { players, addPlayer, removePlayer, updatePlayer } = useAppData();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "all">("all");
  const [sortBy, setSortBy] = useState<SquadSortBy>("number");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const detailPlayer = useMemo(() => players.find((p) => p.id === detailId) ?? null, [players, detailId]);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchQ =
        q.trim() === "" || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.number).includes(q);
      const matchP = pos === "all" || playerHasPosition(p, pos);
      return matchQ && matchP;
    });
  }, [players, q, pos]);

  const sortedFiltered = useMemo(() => sortSquadRoster(filtered, sortBy), [filtered, sortBy]);

  const handleAddPlayer = (input: Parameters<typeof addPlayer>[0]) => {
    addPlayer(input);
    setSortBy("number");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddPlayer} />
      <PlayerDetailModal
        player={detailPlayer}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        onSave={(id, patch) => updatePlayer(id, patch)}
        onRemove={(id) => {
          removePlayer(id);
          setDetailId(null);
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Squad roster</h2>
          <p className="text-sm text-zinc-500">
            {players.length} player{players.length !== 1 ? "s" : ""} · same list everywhere you pick names (tactics,
            training, messages).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-56" />
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add player
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Filter by position</p>
          <div className="flex flex-wrap gap-2">
            {positions.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPos(p)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  pos === p ? "bg-accent/15 text-accent" : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p === "all" ? "All positions" : p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Sort by</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === s.id ? "bg-sky-500/15 text-sky-300" : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Position order: GK → CB → LB → RB → CDM → CM → CAM → LW → RW → ST. Multi-position players sort by their
            earliest role in that list.
          </p>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border p-12 text-center">
          <p className="text-zinc-400">No players yet.</p>
          <p className="mt-2 text-sm text-zinc-500">Add your squad — they’ll be available on tactics, training, and chat.</p>
          <Button type="button" className="mt-6" onClick={() => setAddOpen(true)}>
            Add your first player
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border p-12 text-center text-zinc-500">
          No players match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFiltered.map((player) => (
            <PlayerCard key={player.id} player={player} onOpen={() => setDetailId(player.id)} />
          ))}
        </div>
      )}

    </div>
  );
}
