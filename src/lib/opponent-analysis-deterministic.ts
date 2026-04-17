import type { FormationId, LeagueTableRow, MatchFixture, PlayerQualities, Position } from "@/types";
import { FORMATION_LAYOUTS } from "@/data/formations";
import { computePositionFocusedOverall } from "@/lib/player-insights";
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

function leadershipScore(p: SerializedPlayerForAi): number {
  return q(p, "composure") + p.age * 0.25 + q(p, "shortPass") * 0.15;
}

function isLeftSideSlotLabel(label: string): boolean {
  const u = label.toUpperCase();
  return (
    /\b(LW|LM|LB|LWB)\b/.test(u) ||
    label.toLowerCase().includes("extremo esquerdo") ||
    label.toLowerCase().includes("lateral esquerdo")
  );
}

function isRightSideSlotLabel(label: string): boolean {
  const u = label.toUpperCase();
  return (
    /\b(RW|RM|RB|RWB)\b/.test(u) ||
    label.toLowerCase().includes("extremo direito") ||
    label.toLowerCase().includes("lateral direito")
  );
}

function startersFromXi(players: SerializedPlayerForAi[], xi: OpponentAnalysisXiPlayer[]): SerializedPlayerForAi[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const out: SerializedPlayerForAi[] = [];
  for (const row of xi) {
    const p = byId.get(row.playerId);
    if (p) out.push(p);
  }
  return out;
}

function pickBestBy(
  pools: SerializedPlayerForAi[][],
  scorer: (p: SerializedPlayerForAi) => number,
  excludeIds: Set<string>
): SerializedPlayerForAi | null {
  for (const pool of pools) {
    let best: SerializedPlayerForAi | null = null;
    let bestS = -1e9;
    for (const p of pool) {
      if (excludeIds.has(p.id)) continue;
      const s = scorer(p);
      if (s > bestS) {
        bestS = s;
        best = p;
      }
    }
    if (best) return best;
  }
  return null;
}

/** Cantos alinhados ao lado do campo no 11 sugerido; depois resto dos titulares, depois banco. */
function pickCornerForSide(
  xi: OpponentAnalysisXiPlayer[],
  starters: SerializedPlayerForAi[],
  bench: SerializedPlayerForAi[],
  side: "left" | "right",
  excludeIds: Set<string>
): SerializedPlayerForAi {
  const pred = side === "left" ? isLeftSideSlotLabel : isRightSideSlotLabel;
  const wideStarters = starters.filter((p) => xi.some((r) => r.playerId === p.id && pred(r.positionLabel)));
  const cross = (p: SerializedPlayerForAi) => q(p, "crossing");
  return (
    pickBestBy([wideStarters, starters, bench], cross, excludeIds) ??
    pickBestBy([[...starters, ...bench]], cross, excludeIds)!
  );
}

const ROLE_PT: Record<Position, string> = {
  GK: "Guarda-redes",
  CB: "Defesa central",
  LB: "Lateral esquerdo",
  RB: "Lateral direito",
  CDM: "Médio defensivo",
  CM: "Médio",
  CAM: "Médio ofensivo",
  LW: "Extremo esquerdo",
  RW: "Extremo direito",
  ST: "Avançado",
};

const FORMATION_LABEL_TO_POSITION: Record<string, Position> = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
  LM: "LW",
  RM: "RW",
  LWB: "LB",
  RWB: "RB",
  DM: "CDM",
  CF: "ST",
};

function formationLabelToPosition(label: string): Position | null {
  return FORMATION_LABEL_TO_POSITION[label] ?? null;
}

type OppAgg = { gcpg: number; gpg: number; n: number };

function playerEligiblePositions(p: SerializedPlayerForAi): Position[] {
  return p.eligiblePositions?.length ? p.eligiblePositions : [p.position as Position];
}

function eligibleForSlot(p: SerializedPlayerForAi, slotRole: Position): boolean {
  return playerEligiblePositions(p).includes(slotRole);
}

/** 0–100: ajuste fino (20%) com base no perfil ofensivo/defensivo do adversário nos dados importados. */
function opponentTweakScore(p: SerializedPlayerForAi, slot: Position, them: OppAgg): number {
  if (them.n < 2) return 50;
  const finishing = (q(p, "finishing") + q(p, "attackingPosition") + q(p, "shotPower")) / 3;
  const passing = (q(p, "shortPass") + q(p, "longPass") + q(p, "vision") + q(p, "ballControl")) / 4;
  const defending = (q(p, "defensiveAwareness") + q(p, "interceptions") + q(p, "standTackle") + q(p, "stamina") * 0.45) / 3.45;
  const stingy = them.gcpg <= 0.95;
  const prolific = them.gpg >= 1.65;
  if (stingy && !prolific) {
    if (slot === "ST" || slot === "CAM" || slot === "LW" || slot === "RW") return Math.min(100, Math.round(finishing));
    return 48;
  }
  if (prolific && them.gcpg >= 0.85) {
    if (slot === "CB" || slot === "LB" || slot === "RB" || slot === "CDM" || slot === "CM") return Math.min(100, Math.round(defending));
    return 48;
  }
  if (slot === "CM" || slot === "CAM" || slot === "CDM") return Math.min(100, Math.round(passing));
  if (slot === "LB" || slot === "RB") return Math.min(100, Math.round(passing * 0.65 + defending * 0.35));
  return 50;
}

function slotAssignmentScore(p: SerializedPlayerForAi, slotRole: Position, them: OppAgg): number {
  const base = computePositionFocusedOverall(slotRole, p.qualities as Partial<PlayerQualities>);
  const tw = opponentTweakScore(p, slotRole, them);
  return 0.8 * base + 0.2 * tw;
}

function gkEmergencyScore(p: SerializedPlayerForAi): number {
  return q(p, "defensiveAwareness") * 0.38 + q(p, "reactions") * 0.28 + heuristicPlayerStrength(p) * 0.2;
}

function formationSlotsFromLayout(formationId: FormationId): { role: Position; label: string }[] {
  const layout =
    FORMATION_LAYOUTS[formationId]?.length === 11 ? FORMATION_LAYOUTS[formationId]! : FORMATION_LAYOUTS["4-3-3"]!;
  const out: { role: Position; label: string }[] = [];
  let cbOrdinal = 0;
  for (const cell of layout) {
    const role = formationLabelToPosition(cell.label);
    if (!role) continue;
    let label: string;
    if (role === "CB") {
      cbOrdinal += 1;
      label = cbOrdinal === 1 ? "CB (defesa central — esq.)" : "CB (defesa central — dto.)";
    } else {
      label = `${cell.label} (${ROLE_PT[role]})`;
    }
    out.push({ role, label });
  }
  return out;
}

function pairScore(
  p: SerializedPlayerForAi,
  slotRole: Position,
  them: OppAgg,
  opts: { isGkSlot: boolean; anyGkAmongFree: boolean }
): number {
  if (opts.isGkSlot) {
    if (eligibleForSlot(p, "GK")) return 8000 + slotAssignmentScore(p, "GK", them);
    if (!opts.anyGkAmongFree) return gkEmergencyScore(p);
    return -1e9;
  }
  if (eligibleForSlot(p, slotRole)) return slotAssignmentScore(p, slotRole, them);
  return -1e9;
}

function pairScoreForced(p: SerializedPlayerForAi, slotRole: Position, them: OppAgg, isGk: boolean): number {
  if (isGk) return eligibleForSlot(p, "GK") ? 8000 + slotAssignmentScore(p, "GK", them) : gkEmergencyScore(p);
  return slotAssignmentScore(p, slotRole, them) * 0.2;
}

/**
 * Onze: posições da formação da tática escolhida; só entram jogadores nas posições marcadas na ficha
 * (80% overall focado na posição + 20% perfil do adversário). Atribuição por “lacuna” entre 1.º e 2.º
 * candidato para desempates tipo vários CAM / alas.
 */
function buildStartingXi(players: SerializedPlayerForAi[], formationId: FormationId, them: OppAgg): { xi: OpponentAnalysisXiPlayer[]; notes: string[] } {
  const notes: string[] = [];
  const pool = [...players];
  let slots = formationSlotsFromLayout(formationId);
  if (slots.length !== 11) {
    notes.push("Formação sem 11 posições na planta — usado 4-3-3 para montar o onze.");
    slots = formationSlotsFromLayout("4-3-3");
  }

  const used = new Set<string>();
  const bySlotIndex = new Map<number, OpponentAnalysisXiPlayer>();
  const unassigned = new Set(slots.map((_, i) => i));

  while (unassigned.size > 0) {
    const free = pool.filter((p) => !used.has(p.id));
    if (free.length === 0) break;

    let pickSlot: number | null = null;
    let pickPlayer: SerializedPlayerForAi | null = null;
    let bestGap = -1;

    for (const si of unassigned) {
      const slot = slots[si]!;
      const anyGk = free.some((p) => eligibleForSlot(p, "GK"));
      const rows = free
        .map((p) => ({
          p,
          s: pairScore(p, slot.role, them, { isGkSlot: slot.role === "GK", anyGkAmongFree: anyGk }),
        }))
        .filter((x) => x.s > -1e8)
        .sort((a, b) => b.s - a.s);

      const forced =
        rows.length === 0
          ? free
              .map((p) => ({
                p,
                s: pairScoreForced(p, slot.role, them, slot.role === "GK"),
              }))
              .sort((a, b) => b.s - a.s)
          : null;

      const finalRows = forced ?? rows;
      if (finalRows.length === 0) continue;
      const top = finalRows[0]!;
      const second = finalRows[1]?.s ?? top.s - 2000;
      const gap = top.s - second;
      if (gap > bestGap) {
        bestGap = gap;
        pickSlot = si;
        pickPlayer = top.p;
      }
    }

    if (pickSlot == null || !pickPlayer) {
      const si = [...unassigned][0]!;
      const slot = slots[si]!;
      const p = free.sort((a, b) => heuristicPlayerStrength(b) - heuristicPlayerStrength(a))[0]!;
      used.add(p.id);
      bySlotIndex.set(si, {
        playerId: p.id,
        playerName: p.name,
        shirtNumber: p.number,
        positionLabel: slot.label,
        tacticalNotes: "Completação automática — rever posição na ficha ou convocados.",
      });
      unassigned.delete(si);
      continue;
    }

    const slot = slots[pickSlot]!;
    const eligible = eligibleForSlot(pickPlayer, slot.role);
    used.add(pickPlayer.id);
    bySlotIndex.set(pickSlot, {
      playerId: pickPlayer.id,
      playerName: pickPlayer.name,
      shirtNumber: pickPlayer.number,
      positionLabel: slot.label,
      tacticalNotes: eligible ? undefined : "Fora das posições assinaladas na ficha — ajustar manualmente se necessário.",
    });
    unassigned.delete(pickSlot);
  }

  let xi = [...bySlotIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row);

  while (xi.length < 11 && pool.length > used.size) {
    const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => heuristicPlayerStrength(b) - heuristicPlayerStrength(a));
    const p = rest[0]!;
    used.add(p.id);
    xi = [
      ...xi,
      {
        playerId: p.id,
        playerName: p.name,
        shirtNumber: p.number,
        positionLabel: "Convocado extra",
        tacticalNotes: "Completa o onze por disponibilidade.",
      },
    ];
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
    formationId?: FormationId;
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
  const lineupFormationId: FormationId =
    bestT?.formationId && FORMATION_LAYOUTS[bestT.formationId]?.length === 11 ? bestT.formationId : "4-3-3";
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

  const { xi, notes: xiNotes } = buildStartingXi(availablePlayers, lineupFormationId, them);
  const starterIds = new Set(xi.map((r) => r.playerId));
  const starters = startersFromXi(availablePlayers, xi);
  const bench = availablePlayers.filter((p) => !starterIds.has(p.id));

  const benchNames = bench.map((p) => p.name).slice(0, 12);
  const benchNotes =
    (benchNames.length > 0
      ? `Banco sugerido (convocados não titulares): ${benchNames.join(", ")}. `
      : "Sem suplentes convocados listados para além do onze. ") +
    "Papéis no jogo (capitães, penáltis, livres, cantos) escolhidos em primeiro lugar entre os titulares do 11; alternativas vêm do banco só quando faz falta.";

  const startersByLead = [...starters].sort((a, b) => leadershipScore(b) - leadershipScore(a));
  const captain = startersByLead[0]!;
  const captainAlternate = startersByLead.find((p) => p.id !== captain.id) ?? null;
  const viceCaptain =
    startersByLead.find((p) => p.id !== captain.id && p.id !== captainAlternate?.id) ?? null;

  const penScore = (p: SerializedPlayerForAi) => q(p, "penalties") + q(p, "composure") * 0.2;
  const startersByPen = [...starters].sort((a, b) => penScore(b) - penScore(a));
  const benchByPen = [...bench].sort((a, b) => penScore(b) - penScore(a));
  const penaltyTaker =
    startersByPen.find((p) => p.id !== captain.id) ??
    startersByPen[0]!;
  const penaltyAlternate =
    startersByPen.find((p) => p.id !== penaltyTaker.id) ??
    benchByPen.find((p) => p.id !== penaltyTaker.id) ??
    null;

  const fkScore = (p: SerializedPlayerForAi) => q(p, "freeKickAccuracy") + q(p, "shotPower") * 0.1;
  const startersByFk = [...starters].sort((a, b) => fkScore(b) - fkScore(a));
  const benchByFk = [...bench].sort((a, b) => fkScore(b) - fkScore(a));
  const freeKickTaker = startersByFk[0] ?? benchByFk[0]!;

  const cornerLeft = pickCornerForSide(xi, starters, bench, "left", new Set());
  const cornerRight = pickCornerForSide(xi, starters, bench, "right", new Set([cornerLeft.id]));

  const roles = {
    captain: rolePick(captain, "Entre titulares do 11: melhor liderança (compostura, idade, passe curto)."),
    ...(captainAlternate ? { captainAlternate: rolePick(captainAlternate, "2.ª opção de capitão entre titulares.") } : {}),
    ...(viceCaptain ? { viceCaptain: rolePick(viceCaptain, "Vice-capitão entre titulares.") } : {}),
    penaltyTaker: rolePick(penaltyTaker, "Melhor penáltis entre titulares (evitando duplicar o capitão quando possível)."),
    ...(penaltyAlternate ? { penaltyAlternate: rolePick(penaltyAlternate, "Alternativa a penáltis (titular ou banco).") } : {}),
    freeKickTaker: rolePick(freeKickTaker, "Melhor livre directo entre titulares sugeridos."),
    cornerLeft: rolePick(cornerLeft, "Canto esquerdo: titular no corredor esquerdo do 11 com melhor cruzamento."),
    cornerRight: rolePick(cornerRight, "Canto direito: titular no corredor direito do 11 com melhor cruzamento (distinto do esquerdo)."),
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
