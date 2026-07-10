"use client";

import { mockCoach } from "@/data/mock";

export function DashboardHero({
  welcomeLine,
  club,
  role,
  tagline,
}: {
  welcomeLine: string;
  club: string;
  role: string;
  tagline: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0D0D0D] px-6 py-8 sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49.5%, rgba(255,255,255,0.35) 49.5%, rgba(255,255,255,0.35) 50.5%, transparent 50.5%),
            linear-gradient(0deg, transparent 49.5%, rgba(255,255,255,0.2) 49.5%, rgba(255,255,255,0.2) 50.5%, transparent 50.5%),
            radial-gradient(circle at 50% 0%, rgb(var(--accent-rgb) / 0.25), transparent 55%)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%",
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-1/2 h-32 w-32 -translate-y-1/2 rotate-12 border border-white/10 opacity-20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-16 top-8 h-16 w-24 rotate-[-8deg] border-t border-r border-white/15 opacity-15"
        aria-hidden
      />

      <div className="relative animate-[dashboardFadeIn_0.5s_ease-out_both]">
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-white sm:text-[34px]">
          {welcomeLine}
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-400">{tagline}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-500">
          <span className="font-medium text-zinc-300">{club.trim() || "Your club"}</span>
          <span className="text-zinc-700" aria-hidden>
            ·
          </span>
          <span>{role || mockCoach.role}</span>
        </div>
      </div>
    </section>
  );
}
