"use client";

import { useMemo, useState } from "react";
import type { Player, Position } from "@/types";
import { PlayerCard } from "@/components/team/PlayerCard";
import { AddPlayerModal } from "@/components/players/AddPlayerModal";
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

export default function TeamPage() {
  const { players, addPlayer, removePlayer } = useAppData();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "all">("all");
  const [detail, setDetail] = useState<Player | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchQ =
        q.trim() === "" || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.number).includes(q);
      const matchP = pos === "all" || p.position === pos;
      return matchQ && matchP;
    });
  }, [players, q, pos]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} onSave={(input) => addPlayer(input)} />

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
          {filtered.map((player) => (
            <PlayerCard key={player.id} player={player} onOpen={() => setDetail(player)} />
          ))}
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-surface-border bg-[#0f1419] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-semibold text-white">{detail.name}</p>
            <p className="mt-1 text-sm text-zinc-500">
              #{detail.number} · {detail.position} · {detail.age} years
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              Full bio, load management, and clip links will live here when your backend is connected.
            </p>
            <div className="mt-6 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  removePlayer(detail.id);
                  setDetail(null);
                }}
              >
                Remove from roster
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
