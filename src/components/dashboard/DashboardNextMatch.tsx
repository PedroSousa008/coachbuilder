"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/contexts/AppDataContext";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { formatKickoff } from "@/lib/format";
import { resolveNextMatchForCoach } from "@/lib/next-match";
import { collectUniqueTeamNames, pickBestTeamMatch } from "@/lib/team-match";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export function DashboardNextMatch() {
  const { fixtures, leagueMatches, leagueCompetitionName, coachProfile, leagueTableRows, hydrated } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const nowMs = useScheduleNow();

  const teamCandidateNames = useMemo(
    () => collectUniqueTeamNames({ tableRows: leagueTableRows, matches: leagueMatches }),
    [leagueTableRows, leagueMatches]
  );

  const canonicalClub = useMemo(() => {
    const c = coachProfile.club.trim();
    if (!c || teamCandidateNames.length === 0) return null;
    return pickBestTeamMatch(c, teamCandidateNames);
  }, [coachProfile.club, teamCandidateNames]);

  const next = useMemo(
    () =>
      resolveNextMatchForCoach({
        coachClub: coachProfile.club,
        coachClubCanonical: canonicalClub?.name ?? null,
        leagueCompetitionName,
        leagueMatches,
        manualFixtures: fixtures,
        teamCandidateNames,
        nowMs,
      }),
    [fixtures, leagueMatches, leagueCompetitionName, coachProfile.club, canonicalClub?.name, teamCandidateNames, nowMs]
  );

  return (
    <section className="flex h-full flex-col rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/[0.08]">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {isPt ? "Próximo jogo" : "Next match"}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {next ? next.competition : isPt ? "Sem jogo agendado" : "No fixture scheduled"}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {!hydrated ? (
          <p className="text-[13px] text-zinc-500">{isPt ? "A carregar…" : "Loading…"}</p>
        ) : !next ? (
          <DashboardEmptyState
            icon={Trophy}
            title={isPt ? "Sem próximo jogo" : "No upcoming match"}
            description={
              isPt
                ? "Configura a liga no Calendário, regista o clube no Perfil e adiciona jogos ou resultados — ou cria um jogo manual."
                : "Set up your league on Calendar, register your club in Profile, add fixtures or results — or create a manual match."
            }
            actionLabel={isPt ? "Abrir calendário" : "Open calendar"}
            actionHref="/app/calendar"
            className="flex-1"
          />
        ) : (
          <>
            <p className="font-display text-2xl font-semibold tracking-tight text-white">{next.opponent}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {next.source === "league" ? (
                <Badge variant="muted">{isPt ? "Sync da liga" : "League sync"}</Badge>
              ) : null}
              <Badge variant="accent">{next.venue === "home" ? (isPt ? "Casa" : "Home") : isPt ? "Fora" : "Away"}</Badge>
              <Badge variant="default">{formatKickoff(next.kickoff)}</Badge>
            </div>
            <div className="mt-auto flex flex-wrap gap-4 pt-6">
              <Link
                href="/app/tactics"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-accent-muted"
              >
                {isPt ? "Táticas de jogo" : "Match tactics"}
              </Link>
              <Link
                href="/app/calendar"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:border-white/[0.12] hover:text-white"
              >
                {isPt ? "Calendário" : "Calendar"}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
