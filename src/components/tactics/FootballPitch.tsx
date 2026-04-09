"use client";

import { useCallback, useRef, useState } from "react";
import type { PitchPlayer } from "@/types";
import { cn } from "@/lib/utils";

type DragState = { id: string; offsetX: number; offsetY: number } | null;

export function FootballPitch({
  players,
  onPlayersChange,
  className,
}: {
  players: PitchPlayer[];
  onPlayersChange?: (next: PitchPlayer[]) => void;
  className?: string;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>(null);

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
    if (!onPlayersChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = pitchRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const player = players.find((p) => p.id === id);
    if (!player) return;
    const cx = r.left + (player.x / 100) * r.width;
    const cy = r.top + (player.y / 100) * r.height;
    setDrag({ id, offsetX: e.clientX - cx, offsetY: e.clientY - cy });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || !onPlayersChange) return;
    const { x, y } = toPercent(e.clientX - drag.offsetX, e.clientY - drag.offsetY);
    onPlayersChange(
      players.map((p) => (p.id === drag.id ? { ...p, x, y } : p))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag(null);
  };

  return (
    <div
      ref={pitchRef}
      className={cn(
        "pitch-texture relative aspect-[68/105] w-full overflow-hidden rounded-2xl border border-white/10 shadow-inner",
        className
      )}
    >
      {/* Halfway line */}
      <div className="absolute left-[4%] right-[4%] top-1/2 h-px -translate-y-1/2 bg-pitch-line" />
      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 h-[22%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-line" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pitch-line/80" />
      {/* Penalty areas (attacking top) */}
      <div className="absolute left-[18%] right-[18%] top-[2%] h-[16%] rounded-t-lg border border-b-0 border-pitch-line" />
      <div className="absolute left-[30%] right-[30%] top-[2%] h-[7%] rounded-t-md border border-b-0 border-pitch-line" />
      {/* Penalty areas (defensive bottom) */}
      <div className="absolute bottom-[2%] left-[18%] right-[18%] h-[16%] rounded-b-lg border border-t-0 border-pitch-line" />
      <div className="absolute bottom-[2%] left-[30%] right-[30%] h-[7%] rounded-b-md border border-t-0 border-pitch-line" />

      <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-medium uppercase tracking-widest text-white/35">
        Drag players to adjust — {onPlayersChange ? "live" : "read-only"}
      </div>

      {players.map((p) =>
        onPlayersChange ? (
          <button
            key={p.id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, p.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white/25 bg-zinc-900/90 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm transition-shadow active:cursor-grabbing hover:border-accent/50 hover:shadow-glow"
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
