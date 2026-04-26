"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/contexts/AppDataContext";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { formatKickoff } from "@/lib/format";
import { resolveNextMatchForCoach } from "@/lib/next-match";
import { collectUniqueTeamNames, pickBestTeamMatch } from "@/lib/team-match";
import { useLanguage } from "@/contexts/LanguageContext";

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

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">{isPt ? "A carregar…" : "Loading…"}</p>;
  }

  if (!next) {
    return (
      <>
        <p className="text-sm text-zinc-400">
          {isPt
            ? "Ainda não há próximo jogo. Configura a liga e a classificação no Calendário, regista o nome do clube no Perfil (para destacar a tua equipa) e adiciona jogos ou resultados (OCR) — ou cria um jogo manual."
            : "No upcoming fixture yet. Set up your league on Calendar, match your club name in Profile, add fixtures or paste OCR results, or create a manual match."}
        </p>
        <Link href="/app/calendar" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          {isPt ? "Abrir calendário" : "Open calendar"}
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-lg font-semibold text-white">{next.opponent}</p>
      <p className="mt-1 text-sm text-zinc-500">{next.competition}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {next.source === "league" && (
          <Badge variant="muted">{isPt ? "Sync da liga" : "League sync"}</Badge>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="accent">{next.venue === "home" ? (isPt ? "Casa" : "Home") : isPt ? "Fora" : "Away"}</Badge>
        <Badge variant="default">{formatKickoff(next.kickoff)}</Badge>
      </div>
      <div className="mt-6 flex flex-wrap gap-4 gap-y-2">
        <Link href="/app/tactics" className="text-sm font-medium text-accent hover:underline">
          {isPt ? "Abrir táticas de jogo" : "Open match tactics"}
        </Link>
        <Link href="/app/calendar" className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
          {isPt ? "Calendário" : "Calendar"}
        </Link>
      </div>
    </>
  );
}
