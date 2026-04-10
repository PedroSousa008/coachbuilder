import type { FormationId, Player, Tactic, TacticMatch, TacticMatchPlayerLine } from "@/types";
import { formationDisplayLabel } from "@/data/formations";

export type TacticRecordTally = {
  matchesUsed: number;
  wins: number;
  losses: number;
  draws: number;
};

export type PlayerMatchAgg = {
  games: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
};

export function inferOutcome(teamGoals: number, opponentGoals: number): "win" | "draw" | "loss" {
  if (teamGoals > opponentGoals) return "win";
  if (teamGoals < opponentGoals) return "loss";
  return "draw";
}

export function emptyPlayerAgg(): PlayerMatchAgg {
  return { games: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutes: 0 };
}

function addLine(agg: PlayerMatchAgg, line: TacticMatchPlayerLine) {
  agg.games += 1;
  agg.goals += line.goals;
  agg.assists += line.assists;
  agg.yellowCards += line.yellowCards;
  agg.redCards += line.redCards;
  agg.minutes += line.minutesPlayed;
}

/** Jogos / resultado agregados para uma tática. */
export function tallyForTactic(matches: TacticMatch[], tacticId: string): TacticRecordTally {
  const m = matches.filter((x) => x.tacticId === tacticId);
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const x of m) {
    if (x.outcome === "win") wins++;
    else if (x.outcome === "loss") losses++;
    else draws++;
  }
  return { matchesUsed: m.length, wins, losses, draws };
}

/** Estatísticas de um jogador em todos os jogos registados (qualquer tática). */
export function aggregatePlayerGlobal(matches: TacticMatch[], playerId: string): PlayerMatchAgg {
  const agg = emptyPlayerAgg();
  for (const m of matches) {
    for (const line of m.playerStats) {
      if (line.playerId === playerId) addLine(agg, line);
    }
  }
  return agg;
}

/** Estatísticas de um jogador apenas nos jogos desta tática. */
export function aggregatePlayerInTactic(
  matches: TacticMatch[],
  tacticId: string,
  playerId: string
): PlayerMatchAgg {
  const agg = emptyPlayerAgg();
  for (const m of matches) {
    if (m.tacticId !== tacticId) continue;
    for (const line of m.playerStats) {
      if (line.playerId === playerId) addLine(agg, line);
    }
  }
  return agg;
}

export function winRatePercent(wins: number, matchesUsed: number): number {
  if (matchesUsed <= 0) return 0;
  return Math.round((wins / matchesUsed) * 100);
}

export type CoachPerformanceSummary = {
  tacticsSaved: number;
  matchesLogged: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  cleanSheets: number;
  formLast5: ("W" | "D" | "L")[];
  mostUsedTactic: { tactic: Tactic; matches: number } | null;
  bestTacticByWinRate: { tactic: Tactic; winRate: number; matches: number } | null;
  topScorer: { player: Player; goals: number } | null;
};

export function lastMatchesSorted(matches: TacticMatch[]): TacticMatch[] {
  return [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function formLastN(matches: TacticMatch[], n: number): ("W" | "D" | "L")[] {
  const sorted = lastMatchesSorted(matches);
  return sorted.slice(0, n).map((m) => (m.outcome === "win" ? "W" : m.outcome === "loss" ? "L" : "D"));
}

export function computeCoachPerformance(
  tactics: Tactic[],
  matches: TacticMatch[],
  players: Player[]
): CoachPerformanceSummary {
  const wins = matches.filter((m) => m.outcome === "win").length;
  const losses = matches.filter((m) => m.outcome === "loss").length;
  const draws = matches.filter((m) => m.outcome === "draw").length;
  const goalsFor = matches.reduce((s, m) => s + m.teamGoals, 0);
  const goalsAgainst = matches.reduce((s, m) => s + m.opponentGoals, 0);
  const cleanSheets = matches.filter((m) => m.opponentGoals === 0).length;

  const byTactic = new Map<string, number>();
  for (const m of matches) {
    byTactic.set(m.tacticId, (byTactic.get(m.tacticId) ?? 0) + 1);
  }
  let mostUsed: { tactic: Tactic; matches: number } | null = null;
  for (const t of tactics) {
    const c = byTactic.get(t.id) ?? 0;
    if (c > 0 && (!mostUsed || c > mostUsed.matches)) {
      mostUsed = { tactic: t, matches: c };
    }
  }

  let best: { tactic: Tactic; winRate: number; matches: number } | null = null;
  for (const t of tactics) {
    const tally = tallyForTactic(matches, t.id);
    if (tally.matchesUsed < 1) continue;
    const wr = winRatePercent(tally.wins, tally.matchesUsed);
    if (!best || wr > best.winRate || (wr === best.winRate && tally.matchesUsed > best.matches)) {
      best = { tactic: t, winRate: wr, matches: tally.matchesUsed };
    }
  }

  const goalsByPlayer = new Map<string, number>();
  for (const m of matches) {
    for (const line of m.playerStats) {
      goalsByPlayer.set(line.playerId, (goalsByPlayer.get(line.playerId) ?? 0) + line.goals);
    }
  }
  let topScorer: { player: Player; goals: number } | null = null;
  for (const p of players) {
    const g = goalsByPlayer.get(p.id) ?? 0;
    if (g > 0 && (!topScorer || g > topScorer.goals)) {
      topScorer = { player: p, goals: g };
    }
  }

  return {
    tacticsSaved: tactics.length,
    matchesLogged: matches.length,
    wins,
    draws,
    losses,
    winRate: winRatePercent(wins, matches.length),
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    cleanSheets,
    formLast5: formLastN(matches, 5),
    mostUsedTactic: mostUsed,
    bestTacticByWinRate: best,
    topScorer,
  };
}

export function tacticLabel(t: Tactic): string {
  return `${t.name.trim() || "Formação"} · ${formationDisplayLabel(t.formation as FormationId)}`;
}
