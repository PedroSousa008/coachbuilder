"use client";

import { useMemo, useState } from "react";
import type { Player } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPlayerPositions } from "@/lib/player-positions";

export function GroupEditorModal({
  open,
  mode,
  title,
  players,
  selectedIds,
  groupName,
  onGroupNameChange,
  onTogglePlayer,
  onClose,
  onSubmit,
  emptyHint,
}: {
  open: boolean;
  mode: "create" | "add";
  title: string;
  players: Player[];
  selectedIds: string[];
  groupName: string;
  onGroupNameChange: (value: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        formatPlayerPositions(p).toLowerCase().includes(q) ||
        String(p.number).includes(q)
    );
  }, [players, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(88vh,680px)] w-full max-w-lg flex-col rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-5">
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          {mode === "create" ? (
            <Input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder="Nome do grupo"
              className="mt-3"
            />
          ) : null}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, #, position…"
            className="mt-3"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {players.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-zinc-500">{emptyHint}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-zinc-500">No players match.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onTogglePlayer(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-border bg-zinc-900 text-[11px] text-zinc-200">
                        {checked ? "x" : ""}
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sm font-bold text-zinc-200">
                        {p.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{p.name}</p>
                        <Badge variant="muted" className="mt-0.5 max-w-full truncate">
                          {formatPlayerPositions(p)}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-surface-border p-4">
          <p className="text-xs text-zinc-500">{selectedIds.length} selected</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={mode === "create" ? !groupName.trim() : selectedIds.length === 0}
            >
              {mode === "create" ? "Create group" : "Add people"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
