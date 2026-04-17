import { NextResponse } from "next/server";
import type { MatchFixture } from "@/types";
import { buildOpponentAnalysisDocumentHtml } from "@/lib/opponent-analysis-html";
import { sanitizeOpponentAnalysisResult } from "@/lib/opponent-analysis-sanitize";
import type { SerializedPlayerForAi } from "@/lib/opponent-analysis-context";

export const maxDuration = 60;

const SYSTEM = `És um analista tático de futebol profissional. Respondes APENAS com JSON válido UTF-8 (sem markdown, sem texto antes ou depois).

O JSON deve seguir exactamente estas chaves (tipos):
- headline: string (título curto do relatório)
- winProbabilityPercent: number inteiro 1–99 (estimativa realista com base nos dados; se dados forem fracos, usa 40–60 e explica)
- winProbabilityNotes: string
- opponentRecentSummary: string (forma recente do adversário com base nos jogos fornecidos)
- ourRecentSummary: string (nossa forma)
- goalsForTrend: string (tendência golos marcados — nós e eles, texto curto)
- goalsAgainstTrend: string (tendência golos sofridos)
- howWeShouldApproach: string (como devemos jogar: pressão, bloco, transições, set pieces)
- howWeExpectOpponent: string (como antecipamos que eles joguem)
- recommendedFormation: string (ex.: "4-3-3")
- formationAndTacticRationale: string (liga às táticas guardadas e resultados: se uma tática tem bom registo recente, favorece continuidade com pequenos ajustes; se má registo, propõe mudança fundamentada)
- startingXi: array de exactamente 11 objectos { "playerId", "playerName", "shirtNumber" opcional number, "positionLabel" string, "tacticalNotes" opcional string }
- benchNotes: string
- roles: objecto obrigatório com:
  - captain: { playerId, playerName, rationale }
  - captainAlternate: opcional mesmo formato (2.ª opção se o capitão habitual não estiver convocado)
  - viceCaptain: opcional
  - penaltyTaker: { playerId, playerName, rationale }
  - penaltyAlternate: opcional (2.ª opção penáltis)
  - freeKickTaker: opcional
  - cornerLeft: opcional
  - cornerRight: opcional
- dataLimitations: opcional string (ex.: "poucos jogos importados")

REGRAS CRÍTICAS:
1) Só podes usar playerId que existam em "availablePlayers" no input. O array startingXi tem de ter 11 ids distintos desse conjunto.
2) Se faltar contexto estatístico, declara-o em dataLimitations e mantém conclusões prudentes.
3) Escreve sempre em português de Portugal.
4) Os papéis (capitão, penáltis, etc.) têm de ser jogadores convocados; usa atributos "qualities" para escolher penáltis/livres (penalties, freeKickAccuracy, crossing…). Se o treinador excluiu o melhor para um papel, escolhe o próximo melhor convocado e explica em rationale.`;

type RequestBody = {
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

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  return t;
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_OPPONENT_ANALYSIS_MODEL?.trim() || "gpt-4o-mini";

  if (!key) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY não está configurada no servidor. Adiciona a variável em Vercel (Settings → Environment Variables) para usar a Análise Adversário AI.",
      },
      { status: 503 }
    );
  }

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

  const userPayload = {
    coachName: body.coachName,
    coachClub: body.coachClub,
    fixture: body.fixture,
    availablePlayers: body.availablePlayers,
    tacticsSummarized: body.tacticsSummarized?.slice(0, 24) ?? [],
    tacticMatchesRecent: body.tacticMatchesRecent?.slice(0, 40) ?? [],
    leagueRowsSample: body.leagueRowsSample?.slice(0, 24) ?? [],
    leagueMatchesOurs: body.leagueMatchesOurs?.slice(0, 18) ?? [],
    leagueMatchesTheirs: body.leagueMatchesTheirs?.slice(0, 18) ?? [],
    competitionName: body.competitionName,
  };

  let rawText: string;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Analisa o próximo jogo e devolve o JSON pedido.\n\nDADOS:\n${JSON.stringify(userPayload)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[opponent-analysis] OpenAI error", res.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: "O serviço de IA devolveu um erro. Tenta de novo dentro de momentos." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    rawText = data.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    console.error("[opponent-analysis] fetch failed", e);
    return NextResponse.json({ error: "Não foi possível contactar o serviço de IA." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch {
    return NextResponse.json({ error: "A IA não devolveu JSON válido. Tenta gerar novamente." }, { status: 502 });
  }

  const sanitized = sanitizeOpponentAnalysisResult(parsed, body.availablePlayers);
  const generatedAt = new Date().toLocaleString("pt-PT");
  const html = buildOpponentAnalysisDocumentHtml({
    ourClub: body.coachClub,
    fixture: body.fixture,
    analysis: sanitized,
    generatedAt,
  });

  return NextResponse.json({ html });
}
