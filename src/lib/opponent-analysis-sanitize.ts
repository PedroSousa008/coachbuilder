import type { OpponentAnalysisAiResult, OpponentAnalysisRolePick, OpponentAnalysisXiPlayer } from "@/lib/opponent-analysis-types";
import { heuristicPlayerStrength, type SerializedPlayerForAi } from "@/lib/opponent-analysis-context";

function isRolePick(x: unknown): x is OpponentAnalysisRolePick {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.playerId === "string" && typeof o.playerName === "string" && typeof o.rationale === "string";
}

function isXiPlayer(x: unknown): x is OpponentAnalysisXiPlayer {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.playerId === "string" && typeof o.playerName === "string" && typeof o.positionLabel === "string";
}

function fallbackPick(players: SerializedPlayerForAi[], used: Set<string>, rationale: string): OpponentAnalysisRolePick {
  const ranked = [...players].sort((a, b) => heuristicPlayerStrength(b) - heuristicPlayerStrength(a));
  const pick = ranked.find((p) => !used.has(p.id)) ?? ranked[0]!;
  used.add(pick.id);
  return { playerId: pick.id, playerName: pick.name, rationale };
}

/** Valida e corrige o relatório (onze e papéis) contra os convocados; substitui IDs inválidos por ordem de força heurística. */
export function sanitizeOpponentAnalysisResult(
  raw: unknown,
  available: SerializedPlayerForAi[]
): OpponentAnalysisAiResult {
  const ids = new Set(available.map((p) => p.id));
  const idToPlayer = new Map(available.map((p) => [p.id, p] as const));
  const used = new Set<string>();

  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const headline = typeof o.headline === "string" ? o.headline : "Análise de adversário";
  const winProbabilityPercent =
    typeof o.winProbabilityPercent === "number" && Number.isFinite(o.winProbabilityPercent)
      ? Math.min(99, Math.max(1, Math.round(o.winProbabilityPercent)))
      : 50;
  const winProbabilityNotes = typeof o.winProbabilityNotes === "string" ? o.winProbabilityNotes : "Estimativa com base nos dados disponíveis.";
  const opponentRecentSummary =
    typeof o.opponentRecentSummary === "string" ? o.opponentRecentSummary : "Sem dados importados suficientes sobre o adversário.";
  const ourRecentSummary = typeof o.ourRecentSummary === "string" ? o.ourRecentSummary : "Sem dados importados suficientes sobre a nossa forma.";
  const goalsForTrend = typeof o.goalsForTrend === "string" ? o.goalsForTrend : "—";
  const goalsAgainstTrend = typeof o.goalsAgainstTrend === "string" ? o.goalsAgainstTrend : "—";
  const howWeShouldApproach =
    typeof o.howWeShouldApproach === "string" ? o.howWeShouldApproach : "Pressing organizado e transições rápidas após recuperação.";
  const howWeExpectOpponent =
    typeof o.howWeExpectOpponent === "string" ? o.howWeExpectOpponent : "Saída em bloco médio e procura de espaços nas costas.";
  const recommendedFormation = typeof o.recommendedFormation === "string" ? o.recommendedFormation : "4-3-3";
  const formationAndTacticRationale =
    typeof o.formationAndTacticRationale === "string"
      ? o.formationAndTacticRationale
      : "Formação equilibrada com largura e apoios interiores.";
  const dataLimitations = typeof o.dataLimitations === "string" ? o.dataLimitations : undefined;

  let startingXi: OpponentAnalysisXiPlayer[] = Array.isArray(o.startingXi) ? o.startingXi.filter(isXiPlayer) : [];
  startingXi = startingXi
    .filter((p) => ids.has(p.playerId))
    .map((p) => {
      const pl = idToPlayer.get(p.playerId);
      return {
        ...p,
        playerName: pl?.name ?? p.playerName,
        shirtNumber: pl?.number ?? p.shirtNumber,
      };
    });
  const seen = new Set<string>();
  startingXi = startingXi.filter((p) => {
    if (seen.has(p.playerId)) return false;
    seen.add(p.playerId);
    return true;
  });
  startingXi = startingXi.slice(0, 11);

  let benchNotes = typeof o.benchNotes === "string" ? o.benchNotes : "Rodar o banco conforme carga e cartões.";
  if (startingXi.length < 11) {
    benchNotes += ` Aviso: apenas ${startingXi.length} titulares válidos após cruzar com os convocados — rever na app ou voltar a gerar.`;
  }

  const rolesRaw = o.roles && typeof o.roles === "object" ? (o.roles as Record<string, unknown>) : {};

  const fixRole = (key: string): OpponentAnalysisRolePick | undefined => {
    const v = rolesRaw[key];
    if (!isRolePick(v) || !ids.has(v.playerId)) return undefined;
    return { playerId: v.playerId, playerName: idToPlayer.get(v.playerId)?.name ?? v.playerName, rationale: v.rationale };
  };

  let captain = fixRole("captain");
  if (!captain) captain = fallbackPick(available, used, "Escolha por liderança / experiência no plantel convocado.");
  else used.add(captain.playerId);

  const captainAlternate = fixRole("captainAlternate");
  const viceCaptain = fixRole("viceCaptain");

  let penaltyTaker = fixRole("penaltyTaker");
  if (penaltyTaker?.playerId === captain.playerId) penaltyTaker = undefined;
  if (!penaltyTaker || !ids.has(penaltyTaker.playerId)) {
    const byPen = [...available].sort(
      (a, b) => (b.qualities.penalties ?? 0) - (a.qualities.penalties ?? 0) || heuristicPlayerStrength(b) - heuristicPlayerStrength(a)
    );
    const p = byPen.find((x) => x.id !== captain.playerId && !used.has(x.id)) ?? byPen.find((x) => !used.has(x.id)) ?? byPen[0]!;
    penaltyTaker = {
      playerId: p.id,
      playerName: p.name,
      rationale: "Melhor valorização de penáltis entre convocados (atributo penalties + consistência).",
    };
  }
  used.add(penaltyTaker.playerId);

  const penaltyAlternate = fixRole("penaltyAlternate");
  const freeKickTaker = fixRole("freeKickTaker");
  const cornerLeft = fixRole("cornerLeft");
  const cornerRight = fixRole("cornerRight");

  const roles = {
    captain,
    captainAlternate,
    viceCaptain,
    penaltyTaker,
    penaltyAlternate,
    freeKickTaker,
    cornerLeft,
    cornerRight,
  };

  return {
    headline,
    winProbabilityPercent,
    winProbabilityNotes,
    opponentRecentSummary,
    ourRecentSummary,
    goalsForTrend,
    goalsAgainstTrend,
    howWeShouldApproach,
    howWeExpectOpponent,
    recommendedFormation,
    formationAndTacticRationale,
    startingXi,
    benchNotes,
    roles,
    dataLimitations,
  };
}
