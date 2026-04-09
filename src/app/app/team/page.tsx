"use client";

import { useMemo, useState } from "react";
import type { Player, Position } from "@/types";
import { PlayerCard } from "@/components/team/PlayerCard";
import { Input } from "@/components/ui/Input";
import { mockPlayers } from "@/data/mock";

const positions: (Position | "all")[] = [
  "all",
  "GK",
  "CB",
  "LB",
  "RB",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

export default function TeamPage() {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "all">("all");
  const [detail, setDetail] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    return mockPlayers.filter((p) => {
      const matchQ =
        q.trim() === "" || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.number).includes(q);
      const matchP = pos === "all" || p.position === pos;
      return matchQ && matchP;
    });
  }, [q, pos]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Squad roster</h2>
          <p className="text-sm text-zinc-500">Availability and form signals for matchday decisions.</p>
        </div>
        <Input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
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

      {filtered.length === 0 ? (
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
              Full bio, load management, and clip links will live here. Close to return to the roster.
            </p>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-6 h-10 w-full rounded-xl bg-accent text-sm font-semibold text-zinc-950 hover:bg-accent-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
