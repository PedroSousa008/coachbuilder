"use client";

import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

export function ClubCrestBadge({
  crestDataUrl,
  clubName,
  size = "md",
  className,
}: {
  crestDataUrl?: string;
  clubName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm"
      ? "h-10 w-10"
      : size === "lg"
        ? "h-14 w-14 sm:h-[72px] sm:w-[72px]"
        : "h-14 w-14 sm:h-16 sm:w-16";
  const pad = size === "sm" ? "p-1.5" : size === "lg" ? "p-2.5 sm:p-3" : "p-2";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-6 w-6";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-black/20 backdrop-blur-sm",
        dim,
        pad,
        className
      )}
      title={clubName?.trim() || undefined}
    >
      {crestDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- persisted data URL
        <img src={crestDataUrl} alt="" className="h-full w-full object-contain" />
      ) : (
        <Shield className={cn("text-zinc-600", iconSize)} strokeWidth={1.5} aria-hidden />
      )}
    </div>
  );
}
