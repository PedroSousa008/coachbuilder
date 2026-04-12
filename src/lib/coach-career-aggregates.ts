import type { CoachCareerSeason } from "@/types";
import { winRatePercent, type CoachPerformanceSummary } from "@/lib/tactics-match-stats";

export type CareerSeasonAggregate = {
  seasonsCount: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  winRate: number;
  titles: number;
  promotions: number;
};

export function emptyCareerAggregate(): CareerSeasonAggregate {
  return {
    seasonsCount: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    winRate: 0,
    titles: 0,
    promotions: 0,
  };
}

export function aggregateCareerSeasons(seasons: CoachCareerSeason[] | undefined): CareerSeasonAggregate {
  if (!seasons?.length) return emptyCareerAggregate();
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let points = 0;
  let titles = 0;
  let promotions = 0;
  for (const s of seasons) {
    const st = s.stats;
    played += st.played;
    wins += st.wins;
    draws += st.draws;
    losses += st.losses;
    goalsFor += st.goalsFor;
    goalsAgainst += st.goalsAgainst;
    points += st.points ?? 0;
    if (s.achievements.champion) titles += 1;
    if (s.achievements.promotion) promotions += 1;
  }
  return {
    seasonsCount: seasons.length,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
    winRate: winRatePercent(wins, played),
    titles,
    promotions,
  };
}

export type CombinedCoachStats = {
  tactics: CoachPerformanceSummary;
  career: CareerSeasonAggregate;
  combined: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    winRate: number;
  };
};

export function combineTacticsAndCareer(
  tacticsPerf: CoachPerformanceSummary,
  career: CareerSeasonAggregate
): CombinedCoachStats["combined"] {
  const matches = tacticsPerf.matchesLogged + career.played;
  const wins = tacticsPerf.wins + career.wins;
  const draws = tacticsPerf.draws + career.draws;
  const losses = tacticsPerf.losses + career.losses;
  const goalsFor = tacticsPerf.goalsFor + career.goalsFor;
  const goalsAgainst = tacticsPerf.goalsAgainst + career.goalsAgainst;
  return {
    matches,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    winRate: winRatePercent(wins, matches),
  };
}

export function sortSeasonsChronologically(seasons: CoachCareerSeason[]): CoachCareerSeason[] {
  return [...seasons].sort((a, b) => {
    const sa = seasonLabelSortKey(a.seasonLabel);
    const sb = seasonLabelSortKey(b.seasonLabel);
    return sa - sb;
  });
}

/** "2024/25" → 2024.25 for ordering */
function seasonLabelSortKey(label: string): number {
  const m = label.trim().match(/^(\d{4})\s*[/\-]\s*(\d{2,4})/);
  if (!m) return 0;
  const y1 = parseInt(m[1]!, 10);
  const y2Raw = m[2]!;
  const y2 = y2Raw.length === 2 ? 2000 + parseInt(y2Raw, 10) : parseInt(y2Raw, 10);
  return y1 + y2 / 10000;
}
