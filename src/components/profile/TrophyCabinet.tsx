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
import { honorsForTrophyCabinet } from "@/lib/coach-career-aggregates";
import { HonorTrophyVisual } from "@/components/profile/HonorTrophyVisual";

function TrophyPlaque({ honor }: { honor: CoachHonorEntry }) {
  const season = honor.seasonLabel.trim() || "—";
  const tier = honor.ageGroup.trim() || "—";
  const club = honor.club.trim() || "—";
  const line = `${season} · ${tier} · ${club}`;

  return (
    <div
      className="pointer-events-none w-full border-t border-[#f0d78c]/40 px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_-2px_10px_rgba(0,0,0,0.55)] sm:px-1.5 sm:py-0.5"
      style={{
        background: "linear-gradient(180deg, #c4a035 0%, #e8d18a 22%, #b8922e 48%, #8f7024 100%)",
      }}
    >
      <p
        className="truncate whitespace-nowrap font-display text-[0.5rem] font-bold uppercase leading-none tracking-wide text-[#fffef5] sm:text-[0.55rem]"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}
        title={line}
      >
        {line}
      </p>
    </div>
  );
}

type Props = {
  honors: CoachHonorEntry[];
  selectedId: string | null;
  onSelect: (honor: CoachHonorEntry | null) => void;
};

export function TrophyCabinet({ honors, selectedId, onSelect }: Props) {
  const rows = useMemo(() => {
    const sorted = honorsForTrophyCabinet(honors);
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
                    title={
                      honor
                        ? `${honor.seasonLabel} · ${honor.ageGroup || "—"} · ${honor.club || "—"}`
                        : undefined
                    }
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border text-left transition-all",
                      "border-black/50 bg-gradient-to-b from-zinc-950/90 to-black",
                      "shadow-[inset_0_6px_18px_rgba(0,0,0,0.75)]",
                      selected && "ring-2 ring-accent ring-offset-2 ring-offset-[#1a1410]"
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-[8%] top-0 z-0 h-[50%] rounded-b-[40%] opacity-90 transition-opacity group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 0%, rgb(var(--accent-rgb) / 0.38), transparent 72%)",
                      }}
                    />
                    {honor ? (
                      <>
                        <div className="absolute inset-x-0 top-0 z-[1] flex items-end justify-center px-0.5 pb-[1.375rem] pt-1 sm:pb-6">
                          <div className="flex h-full max-h-full w-full items-end justify-center">
                            <HonorTrophyVisual honor={honor} variant="cabinet" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 z-[2] rounded-b-lg">
                          <TrophyPlaque honor={honor} />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 z-[1] flex items-end justify-center pb-[22%]">
                        <div className="h-[18%] w-[55%] rounded-sm bg-black/35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
                      </div>
                    )}
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
