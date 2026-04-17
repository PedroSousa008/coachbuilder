import type { LeagueTableRow, MatchFixture, Position } from "@/types";
import type {
  OpponentAnalysisAiResult,
  OpponentAnalysisRolePick,
  OpponentAnalysisXiPlayer,
} from "@/lib/opponent-analysis-types";
import type { SerializedPlayerForAi } from "@/lib/opponent-analysis-context";
import { heuristicPlayerStrength } from "@/lib/opponent-analysis-context";
import { normalizeTeamLabel, pickBestTeamMatch, teamNameSimilarity } from "@/lib/team-match";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

type MiniMatch = {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
};

function goalsAndPointsForTeam(team: string, m: MiniMatch): { gf: number; ga: number; pts: 0 | 1 | 3 } | null {
  if (m.homeScore == null || m.awayScore == null) return null;
  const t = norm(team);
  const h = norm(m.homeTeam);
  const a = norm(m.awayTeam);
  const homeSide = h === t || h.includes(t) || t.includes(h);
  const awaySide = a === t || a.includes(t) || t.includes(a);
  if (!homeSide && !awaySide) return null;
  const atHome = homeSide && (!awaySide || h.length <= a.length);
  const gf = atHome ? m.homeScore! : m.awayScore!;
  const ga = atHome ? m.awayScore! : m.homeScore!;
  let pts: 0 | 1 | 3 = 0;
  if (gf > ga) pts = 3;
  else if (gf === ga) pts = 1;
  return { gf, ga, pts };
}

function formLetters(matches: MiniMatch[], team: string, max = 6): string {
  const letters: string[] = [];
  for (const m of matches) {
    const r = goalsAndPointsForTeam(team, m);
    if (!r) continue;
    letters.push(r.pts === 3 ? "V" : r.pts === 1 ? "E" : "D");
    if (letters.length >= max) break;
  }
  return letters.length ? letters.join("-") : "—";
}

function officialOpponentLabel(fixtureOpponent: string, rows: LeagueTableRow[], leagueMatchesTheirs: MiniMatch[]): string {
  const fromRows = rows.map((r) => r.team).filter(Boolean);
  const fromMatches: string[] = [];
  for (const m of leagueMatchesTheirs) {
    if (m.homeTeam.trim()) fromMatches.push(m.homeTeam.trim());
    if (m.awayTeam.trim()) fromMatches.push(m.awayTeam.trim());
  }
  const candidates = [...new Set([...fromRows, ...fromMatches])];
  if (candidates.length === 0) return fixtureOpponent.trim();
  return pickBestTeamMatch(fixtureOpponent, candidates)?.name ?? fixtureOpponent.trim();
}

function pickOpponentTableRow(rows: LeagueTableRow[], officialOpp: string): LeagueTableRow | null {
  const o = normalizeTeamLabel(officialOpp);
  const exact = rows.find((r) => normalizeTeamLabel(r.team) === o);
  if (exact) return exact;
  let best: LeagueTableRow | null = null;
  let bestS = 0;
  for (const r of rows) {
    const s = teamNameSimilarity(r.team, officialOpp);
    if (s > bestS) {
      bestS = s;
      best = r;
    }
  }
  return bestS >= 0.55 ? best : null;
}

function formatStandingLine(row: LeagueTableRow): string {
  const bits: string[] = [];
  bits.push(`${row.team} está em ${row.position}º`);
  if (row.points != null) bits.push(`${row.points} pontos`);
  if (row.played != null) bits.push(`em ${row.played} jogos`);
  if (row.won != null && row.drawn != null && row.lost != null) bits.push(`(${row.won}V ${row.drawn}E ${row.lost}D)`);
  if (row.goalsFor != null && row.goalsAgainst != null) {
    const gd =
      row.goalDifference != null
        ? row.goalDifference
        : Math.round(row.goalsFor - row.goalsAgainst);
    const gds = gd > 0 ? `+${gd}` : `${gd}`;
    bits.push(`golos ${row.goalsFor}-${row.goalsAgainst}, dif. ${gds}`);
  }
  return bits.join(", ") + ".";
}

function aggregate(team: string, matches: MiniMatch[]) {
  let gf = 0;
  let ga = 0;
  let pts = 0;
  let n = 0;
  for (const m of matches) {
    const r = goalsAndPointsForTeam(team, m);
    if (!r) continue;
    gf += r.gf;
    ga += r.ga;
    pts += r.pts;
    n++;
  }
  return { gf, ga, pts, n, ppg: n ? pts / n : 0, gpg: n ? gf / n : 0, gcpg: n ? ga / n : 0 };
}

function q(p: SerializedPlayerForAi, k: string): number {
  return p.qualities[k] ?? 0;
}

function rolePick(p: SerializedPlayerForAi, rationale: string): OpponentAnalysisRolePick {
  return { playerId: p.id, playerName: p.name, rationale };
}

/**
 * 4-3-3: eixo defensivo primeiro (dois centrais antes dos laterais) para o par CB reflectir melhor a qualidade global,
 * depois médios e linha da frente.
 */
const XI_SLOTS: { role: Position; label: string }[] = [
  { role: "GK", label: "Guarda-redes" },
  { role: "CB", label: "Defesa central (Esq.)" },
  { role: "CB", label: "Defesa central (Dto.)" },
  { role: "LB", label: "Lateral esquerdo" },
  { role: "RB", label: "Lateral direito" },
  { role: "CM", label: "Médio esquerdo" },
  { role: "CM", label: "Médio centro" },
  { role: "CM", label: "Médio direito" },
  { role: "LW", label: "Extremo esquerdo" },
  { role: "RW", label: "Extremo direito" },
  { role: "ST", label: "Avançado" },
];

/** 22–100: encaixe tático; linha defensiva com trocas CB/LB/RB mais realistas. */
function positionFit(playerPos: string, slot: Position): number {
  const p = playerPos as Position;
  if (p === slot) return 100;
  if (slot === "CM" && (p === "CDM" || p === "CAM")) return 76;
  if (slot === "CAM" && (p === "CM" || p === "CDM")) return 72;
  if (slot === "CB" && p === "CDM") return 54;
  if (slot === "CB" && (p === "LB" || p === "RB")) return 58;
  if ((slot === "LB" || slot === "RB") && p === "CB") return 56;
  if (slot === "LB" && p === "RB") return 34;
  if (slot === "RB" && p === "LB") return 34;
  if ((slot === "LB" || slot === "RB") && p === "CDM") return 46;
  if ((slot === "LW" || slot === "RW") && (p === "CAM" || p === "ST")) return 62;
  if ((slot === "LW" || slot === "RW") && (p === "LW" || p === "RW") && p !== slot) return 52;
  if (slot === "ST" && (p === "CAM" || p === "LW" || p === "RW")) return 64;
  if ((slot === "LB" || slot === "RB") && p === "CM") return 38;
  return 22;
}

/** Mistura encaixe (36%) com qualidade global média das qualidades (64%) — excepto GR (tratado à parte). */
function xiSlotScore(p: SerializedPlayerForAi, slot: Position): number {
  const fit = positionFit(p.position, slot);
  const str = heuristicPlayerStrength(p);
  return fit * 0.36 + str * 0.64;
}

function buildStartingXi(players: SerializedPlayerForAi[]): { xi: OpponentAnalysisXiPlayer[]; notes: string[] } {
  const notes: string[] = [];
  const used = new Set<string>();
  const xi: OpponentAnalysisXiPlayer[] = [];
  const pool = [...players];

  const hasGk = pool.some((p) => p.position === "GK");
  if (!hasGk) notes.push("Não há GR entre os convocados: foi escolhido o jogador com melhor leitura defensiva como último recurso na posição de GR (rever manualmente).");

  for (const slot of XI_SLOTS) {
    let best: SerializedPlayerForAi | null = null;
    let bestScore = -1e9;
    const candidates = pool.filter((p) => !used.has(p.id));

    if (slot.role === "GK") {
      const gkPool = hasGk ? candidates.filter((p) => p.position === "GK") : candidates;
      for (const p of gkPool) {
        let score: number;
        if (p.position === "GK") {
          score = 1000 + xiSlotScore(p, "GK");
        } else {
          score =
            q(p, "defensiveAwareness") * 0.35 +
            q(p, "reactions") * 0.25 +
            heuristicPlayerStrength(p) * 0.15;
        }
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    } else {
      for (const p of candidates) {
        const score = xiSlotScore(p, slot.role);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    }

    if (!best) break;
    used.add(best.id);
    xi.push({
      playerId: best.id,
      playerName: best.name,
      shirtNumber: best.number,
      positionLabel: slot.label,
      tacticalNotes:
        best.position === slot.role
          ? undefined
          : `Natural: ${best.position} — adaptação ao ${slot.label}.`,
    });
  }

  while (xi.length < 11 && pool.length > used.size) {
    const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => heuristicPlayerStrength(b) - heuristicPlayerStrength(a));
    const p = rest[0]!;
    used.add(p.id);
    xi.push({
      playerId: p.id,
      playerName: p.name,
      shirtNumber: p.number,
      positionLabel: "Jogador de equiparação",
      tacticalNotes: "Completa o onze por disponibilidade.",
    });
  }

  return { xi, notes };
}

export type OpponentAnalysisBuildInput = {
  coachName: string;
  coachClub: string;
  fixture: MatchFixture;
  availablePlayers: SerializedPlayerForAi[];
  tacticsSummarized: Array<{
    id: string;
    name: string;
    formation: string;
    wins: number;
    draws: number;
    losses: number;
    matches: number;
  }>;
  tacticMatchesRecent: Array<{
    tacticName: string;
    formation: string;
    opponent: string;
    outcome: string;
    date: string;
    teamGoals: number;
    opponentGoals: number;
  }>;
  leagueRowsSample: Array<{
    position: number;
    team: string;
    played?: number;
    won?: number;
    drawn?: number;
    lost?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    points?: number;
  }>;
  leagueMatchesOurs: MiniMatch[];
  leagueMatchesTheirs: MiniMatch[];
  competitionName: string | null;
};

export function buildDeterministicOpponentAnalysis(input: OpponentAnalysisBuildInput): OpponentAnalysisAiResult {
  const {
    coachClub,
    fixture,
    availablePlayers,
    tacticsSummarized,
    leagueMatchesOurs,
    leagueMatchesTheirs,
    tacticMatchesRecent,
  } = input;
  const opp = fixture.opponent;
  const officialOpp = officialOpponentLabel(opp, input.leagueRowsSample, leagueMatchesTheirs);
  const oppTableRow = pickOpponentTableRow(input.leagueRowsSample, officialOpp);
  const opponentLeagueStandingLine = oppTableRow ? formatStandingLine(oppTableRow) : undefined;

  const completedTheirs = [...leagueMatchesTheirs]
    .filter(
      (m) =>
        m.homeScore != null &&
        m.awayScore != null &&
        !Number.isNaN(Date.parse(m.kickoff))
    )
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))
    .slice(0, 5);

  const last5DetailLines: string[] = [];
  for (const m of completedTheirs) {
    const simHome = teamNameSimilarity(m.homeTeam, officialOpp);
    const simAway = teamNameSimilarity(m.awayTeam, officialOpp);
    const atHome = simHome >= simAway;
    const other = atHome ? m.awayTeam : m.homeTeam;
    const gf = atHome ? m.homeScore! : m.awayScore!;
    const ga = atHome ? m.awayScore! : m.homeScore!;
    const letter = gf > ga ? "V" : gf < ga ? "D" : "E";
    const loc = atHome ? "Casa" : "Fora";
    const d = new Date(m.kickoff).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    last5DetailLines.push(`${loc} vs ${other} · ${gf}-${ga} · ${letter} (${d})`);
  }
  const opponentLastFiveSummary =
    last5DetailLines.length > 0 ? last5DetailLines.join("\n") : undefined;

  const us = aggregate(coachClub, leagueMatchesOurs);
  const them = aggregate(opp, leagueMatchesTheirs);

  const limitations: string[] = [];
  if (us.n < 3) limitations.push("Poucos jogos com resultado importado para a nossa equipa.");
  if (them.n < 3) limitations.push("Poucos jogos com resultado importado para o adversário.");
  if (!input.leagueRowsSample.length) limitations.push("Sem linhas de classificação importadas — probabilidade baseada sobretudo em forma recente na app.");

  let winP = 50;
  if (us.n >= 2 && them.n >= 2) {
    winP = 50 + (us.ppg - them.ppg) * 14 + (us.gpg - them.gpg) * 2 - (us.gcpg - them.gcpg) * 2;
  } else if (us.n >= 2) {
    winP = 52 + (us.ppg - 1.2) * 10;
  } else if (them.n >= 2) {
    winP = 48 - (them.ppg - 1.2) * 10;
  }
  if (fixture.venue === "home") winP += 4;
  winP = Math.round(Math.min(82, Math.max(18, winP)));

  const ourForm = formLetters(leagueMatchesOurs, coachClub, 6);

  const opponentRecentSummary =
    them.n > 0
      ? `Últimos ${them.n} jogos com resultado: média de ${them.gpg.toFixed(2)} golos marcados e ${them.gcpg.toFixed(2)} sofridos por jogo.`
      : "Sem jogos importados recentes para o adversário nesta app — reforça a importação da liga ou regista jogos na equipa.";

  const ourRecentSummary =
    us.n > 0
      ? `Últimos ${us.n} jogos com resultado: média de ${us.gpg.toFixed(2)} golos marcados e ${us.gcpg.toFixed(2)} sofridos por jogo. Forma: ${ourForm}.`
      : "Sem jogos importados recentes para o nosso clube — reforça a importação da liga.";

  const goalsForTrend = `Nós: ~${us.gpg.toFixed(2)} golos/jogo a favor nos dados disponíveis. Adversário: ~${them.gpg.toFixed(2)}.`;
  const goalsAgainstTrend = `Nós: ~${us.gcpg.toFixed(2)} golos/jogo sofridos. Adversário: ~${them.gcpg.toFixed(2)}.`;

  let bestT = tacticsSummarized
    .filter((t) => t.matches >= 2)
    .sort((a, b) => {
      const wa = a.matches ? (a.wins + 0.5 * a.draws) / a.matches : 0;
      const wb = b.matches ? (b.wins + 0.5 * b.draws) / b.matches : 0;
      return wb - wa;
    })[0];

  if (!bestT) {
    bestT = tacticsSummarized.sort((a, b) => b.matches - a.matches)[0];
  }

  const recommendedFormation = bestT?.formation ?? "4-3-3";
  const recentTacticLine =
    tacticMatchesRecent.length > 0
      ? ` Últimos jogos registados na app (amostra): ${tacticMatchesRecent
          .slice(0, 6)
          .map((m) => `${m.tacticName} ${m.outcome}`)
          .join("; ")}.`
      : "";
  const formationAndTacticRationale = bestT
    ? `Com base nos registos guardados na app, a tática «${bestT.name}» (${bestT.formation}) tem ${bestT.wins}V ${bestT.draws}E ${bestT.losses}D em ${bestT.matches} jogos registados. ${
        bestT.matches >= 3 && bestT.wins >= bestT.losses
          ? "Sugerimos manter esta ideia de jogo com pequenos ajustes ao adversário actual."
          : "O registo é misto ou curto — complementa com o teu scouting e observações que não estão na app."
      }${recentTacticLine}`
    : `Sem táticas com histórico suficiente na app — sugere-se um 4-3-3 equilibrado como ponto de partida; ajusta o modelo com base no que sabes do adversário fora destes números.${recentTacticLine}`;

  const venuePt = fixture.venue === "home" ? "em casa" : "fora";
  const howWeShouldApproach = `Objectivo: aproveitar ${venuePt}. Com média ofensiva ${us.gpg.toFixed(2)} golos/jogo e defensiva ${us.gcpg.toFixed(2)} sofridos/jogo nos dados importados, equilibrar bloco e transição: se ${them.gpg.toFixed(2)} golos/jogo do adversário for alto, fecha mais o interior e força saídas limpas; se for baixo, acelera mudanças de corredor para criar superioridades. Usa os cantos e bolas paradas como arma (dados internos da equipa).`;

  const howWeExpectOpponent = `Espera-se equilíbrio entre segurança e transição rápida, especialmente ${
    fixture.venue === "home"
      ? "se fecharem por períodos fora de portas"
      : "se aproveitarem o factor casa para assumirem iniciativa em altura de pressão"
  }.`;

  const { xi, notes: xiNotes } = buildStartingXi(availablePlayers);
  const benchNames = availablePlayers
    .filter((p) => !xi.some((x) => x.playerId === p.id))
    .map((p) => p.name)
    .slice(0, 12);
  const benchNotes =
    benchNames.length > 0
      ? `Banco sugerido (convocados não titulares): ${benchNames.join(", ")}.`
      : "Sem suplentes convocados listados para além do onze.";

  const byLeadership = [...availablePlayers].sort(
    (a, b) => q(b, "composure") + b.age * 0.25 + q(b, "shortPass") * 0.15 - (q(a, "composure") + a.age * 0.25 + q(a, "shortPass") * 0.15)
  );
  const captain = byLeadership[0]!;
  const captainAlternate = byLeadership.find((p) => p.id !== captain.id) ?? null;
  const viceCaptain =
    byLeadership.find((p) => p.id !== captain.id && p.id !== captainAlternate?.id) ?? null;

  const byPenalties = [...availablePlayers].sort(
    (a, b) => q(b, "penalties") + q(b, "composure") * 0.2 - (q(a, "penalties") + q(a, "composure") * 0.2)
  );
  const penaltyTaker = byPenalties[0]!;
  const penaltyAlternate = byPenalties.find((p) => p.id !== penaltyTaker.id) ?? null;

  const byFk = [...availablePlayers].sort((a, b) => q(b, "freeKickAccuracy") + q(b, "shotPower") * 0.1 - (q(a, "freeKickAccuracy") + q(a, "shotPower") * 0.1));
  const freeKickTaker = byFk[0]!;

  const byCross = [...availablePlayers].sort((a, b) => q(b, "crossing") - q(a, "crossing"));
  const cornerLeft =
    byCross.find((p) => p.position === "LW") ??
    byCross.find((p) => p.position === "LB") ??
    byCross[0]!;
  const cornerRight =
    byCross.find((p) => p.id !== cornerLeft.id && p.position === "RW") ??
    byCross.find((p) => p.id !== cornerLeft.id && p.position === "RB") ??
    byCross.find((p) => p.id !== cornerLeft.id) ??
    byCross[1]!;

  const roles = {
    captain: rolePick(captain, "Maior combinação de compostura, experiência (idade) e passe curto entre convocados."),
    ...(captainAlternate ? { captainAlternate: rolePick(captainAlternate, "Segunda opção de liderança no balneário.") } : {}),
    ...(viceCaptain ? { viceCaptain: rolePick(viceCaptain, "Terceira referência de liderança / comunicação.") } : {}),
    penaltyTaker: rolePick(penaltyTaker, "Melhor conjunto penáltis + compostura entre convocados."),
    ...(penaltyAlternate ? { penaltyAlternate: rolePick(penaltyAlternate, "Segunda opção de penáltis.") } : {}),
    freeKickTaker: rolePick(freeKickTaker, "Melhor precisão em livres directos (atributos na app)."),
    cornerLeft: rolePick(cornerLeft, "Prioridade a extremo/lateral esquerdo com melhor cruzamento."),
    cornerRight: rolePick(cornerRight, "Prioridade a extremo/lateral direito; segundo melhor cruzamento se necessário."),
  };

  const dataLimitations =
    [...limitations, ...xiNotes].filter(Boolean).join(" ") || undefined;

  return {
    headline: `${coachClub} vs ${opp} — relatório`,
    winProbabilityPercent: winP,
    winProbabilityNotes: `Estimativa heurística (${winP}%) a partir de pontos por jogo e médias de golos dos últimos jogos com resultado na app, ajustada ${fixture.venue === "home" ? "pelo factor casa" : "por jogar fora"}. Não é predição de mercado — é apoio à decisão com base no que tens registado.`,
    opponentRecentSummary,
    ourRecentSummary,
    goalsForTrend,
    goalsAgainstTrend,
    howWeShouldApproach,
    howWeExpectOpponent,
    opponentLeagueStandingLine,
    opponentLastFiveSummary,
    recommendedFormation,
    formationAndTacticRationale,
    startingXi: xi,
    benchNotes,
    roles,
    dataLimitations,
  };
}
