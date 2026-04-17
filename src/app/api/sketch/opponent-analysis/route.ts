import { NextResponse } from "next/server";
import type { FormationId, MatchFixture } from "@/types";
import { buildOpponentAnalysisDocumentHtml } from "@/lib/opponent-analysis-html";
import { sanitizeOpponentAnalysisResult } from "@/lib/opponent-analysis-sanitize";
import type { SerializedPlayerForAi } from "@/lib/opponent-analysis-context";
import { buildDeterministicOpponentAnalysis } from "@/lib/opponent-analysis-deterministic";

export const maxDuration = 60;

type RequestBody = {
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
  leagueMatchesOurs: Array<{
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    homeScore?: number;
    awayScore?: number;
  }>;
  leagueMatchesTheirs: Array<{
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    homeScore?: number;
    awayScore?: number;
  }>;
  competitionName: string | null;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body?.fixture?.opponent || !body?.coachClub || !Array.isArray(body.availablePlayers) || body.availablePlayers.length < 11) {
    return NextResponse.json(
      { error: "Indica um adversário válido e pelo menos 11 jogadores convocados/disponíveis." },
      { status: 400 }
    );
  }

  const payload = {
    coachName: body.coachName,
    coachClub: body.coachClub,
    fixture: body.fixture,
    availablePlayers: body.availablePlayers,
    tacticsSummarized: body.tacticsSummarized?.slice(0, 24) ?? [],
    tacticMatchesRecent: body.tacticMatchesRecent?.slice(0, 40) ?? [],
    leagueRowsSample: body.leagueRowsSample?.slice(0, 24) ?? [],
    leagueMatchesOurs: body.leagueMatchesOurs?.slice(0, 28) ?? [],
    leagueMatchesTheirs: body.leagueMatchesTheirs?.slice(0, 40) ?? [],
    competitionName: body.competitionName,
  };

  const draft = buildDeterministicOpponentAnalysis(payload);
  const analysis = sanitizeOpponentAnalysisResult(draft, body.availablePlayers);

  const generatedAt = new Date().toLocaleString("pt-PT");
  const html = buildOpponentAnalysisDocumentHtml({
    ourClub: body.coachClub,
    fixture: body.fixture,
    analysis,
    generatedAt,
  });

  return NextResponse.json({ html });
}
