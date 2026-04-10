"use client";

import { useCallback, useRef, useState } from "react";
import type { PitchPlayer } from "@/types";
import { cn } from "@/lib/utils";

type DragState = { id: string; offsetX: number; offsetY: number };

const TAP_THRESH_SQ = 100;

type Pending = { id: string; sx: number; sy: number; offsetX: number; offsetY: number };

export function FootballPitch({
  players,
  onPlayersChange,
  onSlotTap,
  className,
}: {
  players: PitchPlayer[];
  onPlayersChange?: (next: PitchPlayer[]) => void;
  onSlotTap?: (slot: PitchPlayer) => void;
  className?: string;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const el = pitchRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    return {
      x: Math.min(96, Math.max(4, x)),
      y: Math.min(94, Math.max(6, y)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!onPlayersChange && !onSlotTap) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const player = players.find((p) => p.id === id);
    if (!player) return;
    let offsetX = 0;
    let offsetY = 0;
    const el = pitchRef.current;
    if (el && onPlayersChange) {
      const r = el.getBoundingClientRect();
      const cx = r.left + (player.x / 100) * r.width;
      const cy = r.top + (player.y / 100) * r.height;
      offsetX = e.clientX - cx;
      offsetY = e.clientY - cy;
    }
    pendingRef.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      offsetX,
      offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pend = pendingRef.current;
    if (onPlayersChange && pend && !drag) {
      const dx = e.clientX - pend.sx;
      const dy = e.clientY - pend.sy;
      if (dx * dx + dy * dy > TAP_THRESH_SQ) {
        setDrag({ id: pend.id, offsetX: pend.offsetX, offsetY: pend.offsetY });
        pendingRef.current = null;
      }
    }
    if (drag && onPlayersChange) {
      const { x, y } = toPercent(e.clientX - drag.offsetX, e.clientY - drag.offsetY);
      onPlayersChange(players.map((p) => (p.id === drag.id ? { ...p, x, y } : p)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent, slot: PitchPlayer) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const pend = pendingRef.current;
    if (pend && !drag && onSlotTap) {
      const dx = e.clientX - pend.sx;
      const dy = e.clientY - pend.sy;
      if (dx * dx + dy * dy <= TAP_THRESH_SQ) {
        onSlotTap(slot);
      }
    }
    pendingRef.current = null;
    setDrag(null);
  };

  const interactive = Boolean(onPlayersChange || onSlotTap);
  const hint =
    onSlotTap && onPlayersChange
      ? "Tap a chip to assign a player · drag to move"
      : onPlayersChange
        ? "Drag players to adjust"
        : onSlotTap
          ? "Tap a chip to assign a player"
          : "Read-only";

  return (
    <div
      ref={pitchRef}
      className={cn(
        "pitch-texture relative aspect-[68/105] w-full overflow-hidden rounded-2xl border border-white/10 shadow-inner",
        className
      )}
    >
      <div className="absolute left-[4%] right-[4%] top-1/2 h-px -translate-y-1/2 bg-pitch-line" />
      <div className="absolute left-1/2 top-1/2 h-[22%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-line" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pitch-line/80" />
      <div className="absolute left-[18%] right-[18%] top-[2%] h-[16%] rounded-t-lg border border-b-0 border-pitch-line" />
      <div className="absolute left-[30%] right-[30%] top-[2%] h-[7%] rounded-t-md border border-b-0 border-pitch-line" />
      <div className="absolute bottom-[2%] left-[18%] right-[18%] h-[16%] rounded-b-lg border border-t-0 border-pitch-line" />
      <div className="absolute bottom-[2%] left-[30%] right-[30%] h-[7%] rounded-b-md border border-t-0 border-pitch-line" />

      <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-medium uppercase tracking-widest text-white/35">
        {hint}
      </div>

      {players.map((p) =>
        interactive ? (
          <button
            key={p.id}
            type="button"
            title={p.playerId ? "Tap to change player · drag to move" : "Tap to assign player · drag to move"}
            onPointerDown={(e) => handlePointerDown(e, p.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, p)}
            onPointerCancel={(e) => handlePointerUp(e, p)}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={cn(
              "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg backdrop-blur-sm transition-shadow",
              onPlayersChange ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              p.playerId
                ? "border-accent/50 bg-accent/20 text-white hover:border-accent hover:shadow-glow"
                : "border-white/25 bg-zinc-900/90 text-white hover:border-accent/50 hover:shadow-glow"
            )}
          >
            {p.label}
          </button>
        ) : (
          <div
            key={p.id}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/25 bg-zinc-900/90 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm"
          >
            {p.label}
          </div>
        )
      )}
    </div>
  );
}
