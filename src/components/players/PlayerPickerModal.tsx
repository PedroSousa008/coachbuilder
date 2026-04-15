"use client";

import { useMemo, useState } from "react";
import type { Player } from "@/types";
import { formatPlayerPositions } from "@/lib/player-positions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function PlayerPickerModal({
  open,
  title,
  players,
  onClose,
  onSelect,
  onClear,
  emptyHint = "Add players from Team first.",
  playerDisabled,
  disabledHint = "Sem conta na app",
}: {
  open: boolean;
  title: string;
  players: Player[];
  onClose: () => void;
  onSelect: (player: Player) => void;
  onClear?: () => void;
  emptyHint?: string;
  /** Se devolver true, o jogador aparece inativo (cinzento) e não pode ser escolhido. */
  playerDisabled?: (player: Player) => boolean;
  disabledHint?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        formatPlayerPositions(p).toLowerCase().includes(t) ||
        String(p.number).includes(t)
    );
  }, [players, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,560px)] w-full max-w-md flex-col rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border p-5">
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
                const disabled = playerDisabled?.(p) ?? false;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        onSelect(p);
                        setQ("");
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                        disabled
                          ? "cursor-not-allowed opacity-45"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          disabled ? "bg-zinc-900 text-zinc-500" : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {p.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${disabled ? "text-zinc-500" : "text-white"}`}>{p.name}</p>
                        {disabled ? (
                          <p className="mt-0.5 text-[11px] text-zinc-600">{disabledHint}</p>
                        ) : (
                          <Badge variant="muted" className="mt-0.5 max-w-full truncate">
                            {formatPlayerPositions(p)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex gap-2 border-t border-surface-border p-4">
          {onClear && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onClear();
                setQ("");
                onClose();
              }}
            >
              Clear slot
            </Button>
          )}
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
