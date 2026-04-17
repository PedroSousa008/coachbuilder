import type { MatchFixture } from "@/types";
import type { OpponentAnalysisAiResult } from "@/lib/opponent-analysis-types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function liPlayers(players: { playerName: string; positionLabel: string; shirtNumber?: number; tacticalNotes?: string }[]): string {
  return players
    .map(
      (p) =>
        `<li><strong>${esc(p.playerName)}</strong> (#${p.shirtNumber ?? "—"}) — ${esc(p.positionLabel)}${
          p.tacticalNotes ? ` — <span class="muted">${esc(p.tacticalNotes)}</span>` : ""
        }</li>`
    )
    .join("");
}

function roleBlock(title: string, r: { playerName: string; rationale: string } | undefined): string {
  if (!r) return "";
  return `<p><strong>${esc(title)}:</strong> ${esc(r.playerName)}. <span class="muted">${esc(r.rationale)}</span></p>`;
}

function escLines(s: string): string {
  return s
    .split("\n")
    .map((line) => esc(line))
    .join("<br/>");
}

export function buildOpponentAnalysisDocumentHtml(params: {
  ourClub: string;
  fixture: MatchFixture;
  analysis: OpponentAnalysisAiResult;
  generatedAt: string;
}): string {
  const { ourClub, fixture, analysis, generatedAt } = params;
  const venue = fixture.venue === "home" ? "Casa" : "Fora";
  const xi = analysis.startingXi ?? [];

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <title>${esc(`Análise — ${fixture.opponent}`)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; color: #111; line-height: 1.45; }
    h1 { font-size: 1.45rem; margin-bottom: 0.25rem; }
    .sub { color: #444; font-size: 0.9rem; margin-bottom: 1.25rem; }
    h2 { font-size: 1.1rem; margin: 1.25rem 0 0.5rem; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .muted { color: #555; font-weight: normal; }
    .box { background: #f6f6f6; padding: 10px 14px; border-radius: 8px; margin: 8px 0; }
    ul { margin: 0.35rem 0; padding-left: 1.25rem; }
    .prob { font-size: 1.35rem; font-weight: 700; color: #0a5; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>${esc(analysis.headline || `Análise de adversário — ${fixture.opponent}`)}</h1>
  <p class="sub">
    ${esc(ourClub)} vs <strong>${esc(fixture.opponent)}</strong> · ${esc(fixture.competition)} ·
    ${esc(new Date(fixture.kickoff).toLocaleString("pt-PT"))} · ${esc(venue)}
    <br/>Gerado: ${esc(generatedAt)} · CoachBuilder
  </p>

  <h2>Probabilidade de vitória (estimativa)</h2>
  <p class="prob">${Math.round(analysis.winProbabilityPercent)}%</p>
  <p>${esc(analysis.winProbabilityNotes)}</p>

  <h2>Forma e golos (resumo)</h2>
  <div class="box">
    <p><strong>Adversário:</strong> ${esc(analysis.opponentRecentSummary)}</p>
    <p class="muted">Golos marcados / sofridos (tendência): ${esc(analysis.goalsForTrend)} · ${esc(analysis.goalsAgainstTrend)}</p>
  </div>
  <div class="box">
    <p><strong>Nós:</strong> ${esc(analysis.ourRecentSummary)}</p>
  </div>

  ${
    analysis.opponentLeagueStandingLine
      ? `<h2>Classificação na liga (adversário)</h2><div class="box"><p>${esc(analysis.opponentLeagueStandingLine)}</p></div>`
      : ""
  }
  ${
    analysis.opponentLastFiveSummary
      ? `<h2>Últimos jogos do adversário (importados)</h2><div class="box"><p>${escLines(analysis.opponentLastFiveSummary)}</p><p class="muted" style="margin-top:8px;margin-bottom:0">Ordem: do mais recente para o mais antigo. V/E/D na perspectiva do adversário.</p></div>`
      : ""
  }

  <h2>Abordagem ao jogo</h2>
  <p><strong>O que propomos fazer:</strong> ${esc(analysis.howWeShouldApproach)}</p>
  <p><strong>O que antecipamos do adversário:</strong> ${esc(analysis.howWeExpectOpponent)}</p>

  <h2>Sistema de jogo sugerido</h2>
  <p><strong>Formação:</strong> ${esc(analysis.recommendedFormation)}</p>
  <p>${esc(analysis.formationAndTacticRationale)}</p>

  <h2>11 inicial sugerido</h2>
  ${xi.length ? `<ol>${liPlayers(xi)}</ol>` : "<p>—</p>"}
  <p><strong>Banco / ajustes:</strong> ${esc(analysis.benchNotes)}</p>

  <h2>Papéis no jogo</h2>
  ${roleBlock("Capitão", analysis.roles.captain)}
  ${roleBlock("Alternativa a capitão (2.ª opção)", analysis.roles.captainAlternate)}
  ${roleBlock("Vice-capitão", analysis.roles.viceCaptain)}
  ${roleBlock("Penáltis", analysis.roles.penaltyTaker)}
  ${roleBlock("Alternativa a penáltis", analysis.roles.penaltyAlternate)}
  ${roleBlock("Livres diretos", analysis.roles.freeKickTaker)}
  ${roleBlock("Cantos (lado esquerdo)", analysis.roles.cornerLeft)}
  ${roleBlock("Cantos (lado direito)", analysis.roles.cornerRight)}

  ${
    analysis.dataLimitations
      ? `<h2>Limitações dos dados</h2><p class="muted">${esc(analysis.dataLimitations)}</p>`
      : ""
  }
  <p class="muted" style="margin-top:2rem;font-size:0.75rem">
    Relatório gerado apenas a partir dos dados e estatísticas da aplicação CoachBuilder (sem APIs de modelos de IA externos).
  </p>
</body>
</html>`;
}
