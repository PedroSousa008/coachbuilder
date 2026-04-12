"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { CoachHonorEntry } from "@/types";
import { CHAMPIONSHIP_TROPHY_IMAGE_PATH } from "@/lib/coach-profile-constants";

type Props = {
  honor: CoachHonorEntry;
  /** Vitrine em prateleira: imagem contida, sem crop agressivo */
  variant?: "card" | "cabinet";
};

export function HonorTrophyVisual({ honor, variant = "card" }: Props) {
  const defaultChampion = honor.category === "league" ? CHAMPIONSHIP_TROPHY_IMAGE_PATH : null;
  const src = honor.trophyImageDataUrl ?? defaultChampion;
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div
        className={
          variant === "cabinet"
            ? "flex h-full w-full flex-col items-center justify-end pb-1 text-amber-600/25"
            : "flex h-full w-full flex-col items-center justify-center gap-2 text-amber-500/40"
        }
      >
        <Trophy className={variant === "cabinet" ? "h-8 w-8" : "h-14 w-14"} />
        {variant === "card" ? (
          <span className="text-xs uppercase tracking-wider">Troféu</span>
        ) : null}
      </div>
    );
  }

  const imgClass =
    variant === "cabinet"
      ? "max-h-[92%] max-w-[92%] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)]"
      : "h-full w-full object-cover opacity-90";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={imgClass} onError={() => setBroken(true)} />
  );
}
