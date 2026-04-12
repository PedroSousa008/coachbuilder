"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CoachHonorEntry } from "@/types";
import {
  TROPHY_CABINET_BG_PATH,
  TROPHY_CABINET_COLS,
  TROPHY_CABINET_ROWS,
  TROPHY_CABINET_SLOTS,
} from "@/lib/coach-profile-constants";
import { sortHonorsForCabinetDisplay } from "@/lib/coach-career-aggregates";
import { HonorTrophyVisual } from "@/components/profile/HonorTrophyVisual";

type Props = {
  honors: CoachHonorEntry[];
  selectedId: string | null;
  onSelect: (honor: CoachHonorEntry | null) => void;
};

export function TrophyCabinet({ honors, selectedId, onSelect }: Props) {
  const rows = useMemo(() => {
    const sorted = sortHonorsForCabinetDisplay(honors);
    const flat: (CoachHonorEntry | null)[] = Array.from({ length: TROPHY_CABINET_SLOTS }, () => null);
    sorted.slice(0, TROPHY_CABINET_SLOTS).forEach((h, i) => {
      flat[i] = h;
    });
    const out: (CoachHonorEntry | null)[][] = [];
    for (let r = 0; r < TROPHY_CABINET_ROWS; r++) {
      out.push(flat.slice(r * TROPHY_CABINET_COLS, r * TROPHY_CABINET_COLS + TROPHY_CABINET_COLS));
    }
    return out;
  }, [honors]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#3d2e28] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${TROPHY_CABINET_BG_PATH})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/85" />
      <div className="relative z-10 space-y-3 p-3 sm:space-y-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <p className="font-display text-lg text-[#e8dcc8] sm:text-xl">Armário de conquistas</p>
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
            As prateleiras começam vazias — cada troféu aparece quando registas uma vitória.
          </p>
        </div>
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="rounded-xl border border-black/40 bg-gradient-to-b from-[#4f3d32]/95 to-[#2a1f1a]/95 px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_24px_rgba(0,0,0,0.45)] sm:px-3 sm:py-3"
          >
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
              {row.map((honor, ci) => {
                const idx = ri * TROPHY_CABINET_COLS + ci;
                const selected = honor ? selectedId === honor.id : false;
                return (
                  <button
                    key={honor?.id ?? `empty-${idx}`}
                    type="button"
                    onClick={() => onSelect(honor)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border transition-all",
                      "border-black/50 bg-gradient-to-b from-zinc-950/90 to-black",
                      "shadow-[inset_0_6px_18px_rgba(0,0,0,0.75)]",
                      selected && "ring-2 ring-accent ring-offset-2 ring-offset-[#1a1410]"
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-[8%] top-0 z-0 h-[55%] rounded-b-[40%] opacity-90 transition-opacity group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 0%, rgb(var(--accent-rgb) / 0.38), transparent 72%)",
                      }}
                    />
                    <div className="relative z-[1] flex h-full w-full items-end justify-center">
                      {honor ? (
                        <HonorTrophyVisual honor={honor} variant="cabinet" />
                      ) : (
                        <div className="mb-1 h-[18%] w-[55%] rounded-sm bg-black/35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
