"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Activity, Briefcase, Sparkles, User } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { mockCoach } from "@/data/mock";
import { Badge } from "@/components/ui/Badge";
import { PerformanceTab } from "@/components/profile/PerformanceTab";
import { PersonalTab } from "@/components/profile/PersonalTab";
import { CareerTab } from "@/components/profile/CareerTab";
import { HonorsTab } from "@/components/profile/HonorsTab";
import type { CoachProfileState } from "@/types";

const TABS = ["performance", "personal", "career", "honors"] as const;
type ProfileTabId = (typeof TABS)[number];

function isTab(s: string | null): s is ProfileTabId {
  return s !== null && (TABS as readonly string[]).includes(s);
}

function initialsFromName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export function CoachProfileApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab");
  const tab: ProfileTabId = isTab(rawTab) ? rawTab : "performance";

  const setTab = useCallback(
    (next: ProfileTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const { coachProfile, setCoachProfile, hydrated, savedTactics, tacticMatches, trainingSessions, players } =
    useAppData();

  const commitProfile = useCallback(
    (patch: Partial<CoachProfileState>) => {
      setCoachProfile(patch);
    },
    [setCoachProfile]
  );

  /** Só dados gravados — a pré-visualização do ficheiro em Dados pessoais não actualiza isto até "Guardar dados". */
  const savedAvatarUrl = coachProfile.avatarDataUrl;

  const displayName = coachProfile.name.trim() || "O teu nome";
  const subtitle = useMemo(() => {
    const parts = [
      coachProfile.club?.trim(),
      coachProfile.profession?.trim() || coachProfile.role?.trim(),
    ].filter(Boolean);
    return parts.join(" · ") || "Perfil de treinador";
  }, [coachProfile.club, coachProfile.profession, coachProfile.role]);
  const letters = useMemo(() => initialsFromName(coachProfile.name), [coachProfile.name]);

  const tabBar = (
    <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
      {(
        [
          { id: "performance" as const, label: "Desempenho", icon: Activity },
          { id: "personal" as const, label: "Dados pessoais", icon: User },
          { id: "career" as const, label: "Carreira", icon: Briefcase },
          { id: "honors" as const, label: "Palmarés", icon: Sparkles },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
              active
                ? "bg-white/[0.08] text-white shadow-[inset_0_-2px_0_0_rgb(var(--accent-rgb))]"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-zinc-600"}`} />
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080c]">
      <div className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -20%, rgb(var(--accent-rgb) / 0.22), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgb(var(--accent-rgb) / 0.14)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgb(var(--accent-rgb) / 0.1)" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-2xl ring-2 ring-accent/25">
                {savedAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={savedAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-white/90">
                    {letters}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent/90">
                  Perfil do treinador
                </p>
                <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge variant={mockCoach.plan === "pro" ? "accent" : "default"}>
                    {mockCoach.plan === "pro" ? "Coach Pro" : "Plano Free"}
                  </Badge>
                  <span className="text-xs text-zinc-600">
                    {savedTactics.length} táticas · {trainingSessions.length} sessões · {tacticMatches.length} jogos
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              {[
                { label: "Táticas", value: savedTactics.length },
                { label: "Sessões", value: trainingSessions.length },
                { label: "Jogos", value: tacticMatches.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur-md"
                >
                  <p className="font-display text-xl font-semibold text-white">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10">{tabBar}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {tab === "performance" ? (
          <PerformanceTab
            savedTactics={savedTactics}
            tacticMatches={tacticMatches}
            players={players}
            careerSeasons={coachProfile.careerSeasons}
          />
        ) : null}
        {tab === "personal" ? (
          <PersonalTab
            coachProfile={coachProfile}
            hydrated={hydrated}
            onSave={(next) => {
              const role = (next.profession ?? next.role ?? coachProfile.role).trim() || "Head Coach";
              commitProfile({ ...next, role });
            }}
          />
        ) : null}
        {tab === "career" ? <CareerTab coachProfile={coachProfile} hydrated={hydrated} onCommit={commitProfile} /> : null}
        {tab === "honors" ? <HonorsTab coachProfile={coachProfile} onCommit={commitProfile} /> : null}
      </div>
    </div>
  );
}
