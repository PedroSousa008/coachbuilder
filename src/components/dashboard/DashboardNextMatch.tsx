"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/contexts/AppDataContext";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { formatKickoff } from "@/lib/format";
import { resolveNextMatchForCoach } from "@/lib/next-match";
import { collectUniqueTeamNames, pickBestTeamMatch } from "@/lib/team-match";

export function DashboardNextMatch() {
  const { fixtures, leagueMatches, leagueCompetitionName, coachProfile, leagueTableRows, hydrated } = useAppData();
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
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!next) {
    return (
      <>
        <p className="text-sm text-zinc-400">
          No upcoming fixture yet. Set your club name under Profile (to match league imports), refresh the league URL on
          Calendar, or add a manual fixture.
        </p>
        <Link href="/app/calendar" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Calendar &amp; league
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
          <Badge variant="muted">League sync</Badge>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="accent">{next.venue === "home" ? "Home" : "Away"}</Badge>
        <Badge variant="default">{formatKickoff(next.kickoff)}</Badge>
      </div>
      <div className="mt-6 flex flex-wrap gap-4 gap-y-2">
        <Link href="/app/tactics" className="text-sm font-medium text-accent hover:underline">
          Open match tactics
        </Link>
        <Link href="/app/calendar" className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
          Calendar
        </Link>
      </div>
    </>
  );
}
