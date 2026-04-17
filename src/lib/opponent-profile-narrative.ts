import type { LeagueTableRow, MatchFixture } from "@/types";
import { normalizeTeamLabel, pickBestTeamMatch, teamNameSimilarity } from "@/lib/team-match";

export type OpponentArchetype =
  | "table_top"
  | "attacking"
  | "mid_balanced"
  | "defensive_block"
  | "table_bottom"
  | "physical_direct"
  | "technical_possession";

export type RelativeLevel = "opponent_stronger" | "similar" | "opponent_weaker";

export type OpponentProfileContext = {
  archetypes: OpponentArchetype[];
  /** Resumo curto para o PDF (uma linha). */
  profileSummaryLine: string;
  relativeLevel: RelativeLevel;
  oppRank: number | null;
  ourRank: number | null;
  totalTeams: number;
  /** Dados numéricos para amarrar o texto. */
  themGpg: number;
  themGcpg: number;
  themPpg: number;
  themN: number;
};

function dumbHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

function rowForTeam(rows: LeagueTableRow[], teamLabel: string): LeagueTableRow | null {
  const cands = [...new Set(rows.map((r) => r.team).filter(Boolean))];
  if (cands.length === 0) return null;
  const best = pickBestTeamMatch(teamLabel, cands);
  if (!best) {
    let b: LeagueTableRow | null = null;
    let bs = 0;
    for (const r of rows) {
      const s = teamNameSimilarity(r.team, teamLabel);
      if (s > bs) {
        bs = s;
        b = r;
      }
    }
    return bs >= 0.5 ? b : null;
  }
  return rows.find((r) => normalizeTeamLabel(r.team) === normalizeTeamLabel(best.name)) ?? null;
}

/**
 * Classifica o adversário com base na classificação importada e nas médias dos últimos jogos (golos, pontos).
 * Pode devolver vários arquétipos (ex.: topo + ofensiva).
 */
export function buildOpponentProfileContext(args: {
  leagueRows: LeagueTableRow[];
  coachClub: string;
  opponentName: string;
  them: { gpg: number; gcpg: number; ppg: number; n: number };
  us: { gpg: number; gcpg: number; ppg: number; n: number };
  fixture: MatchFixture;
}): OpponentProfileContext {
  const { leagueRows, coachClub, opponentName, them, us, fixture } = args;
  const rows = leagueRows.filter((r) => r.team?.trim());
  const positions = rows.map((r) => r.position).filter((p) => Number.isFinite(p));
  const totalTeams = positions.length > 0 ? Math.max(...positions, rows.length) : rows.length || 18;

  const ourRow = rowForTeam(rows, coachClub);
  const oppRow = rowForTeam(rows, opponentName);
  const ourRank = ourRow?.position ?? null;
  const oppRank = oppRow?.position ?? null;

  const topCut = Math.max(3, Math.ceil(totalTeams * 0.25));
  const bottomCut = Math.min(totalTeams - 2, Math.ceil(totalTeams * 0.75));

  const archetypes: OpponentArchetype[] = [];
  if (oppRank != null) {
    if (oppRank <= topCut) archetypes.push("table_top");
    else if (oppRank >= bottomCut) archetypes.push("table_bottom");
    else if (oppRank > topCut && oppRank < bottomCut) archetypes.push("mid_balanced");
  }

  if (them.n >= 2) {
    if (them.gpg >= 1.48) archetypes.push("attacking");
    if (them.gcpg <= 0.98 && them.gpg <= 1.22) archetypes.push("defensive_block");
    if (them.gpg >= 1.35 && them.gcpg >= 1.32) archetypes.push("physical_direct");
    if (them.ppg >= 1.62 && them.gcpg < 1.18 && them.gpg < 1.52 && them.gpg >= 0.85) archetypes.push("technical_possession");
  }

  let dedup = [...new Set(archetypes)];
  if (dedup.length === 0) dedup = ["mid_balanced"];

  let relativeLevel: RelativeLevel = "similar";
  if (ourRank != null && oppRank != null) {
    const d = oppRank - ourRank;
    if (d <= -2) relativeLevel = "opponent_stronger";
    else if (d >= 2) relativeLevel = "opponent_weaker";
    else relativeLevel = "similar";
  } else if (us.n >= 2 && them.n >= 2) {
    const dppg = them.ppg - us.ppg;
    if (dppg >= 0.35) relativeLevel = "opponent_stronger";
    else if (dppg <= -0.35) relativeLevel = "opponent_weaker";
  }

  const seed = dumbHash(`${fixture.kickoff}|${opponentName}|${coachClub}`);
  const profileSummaryLine = buildProfileSummaryLine(dedup, oppRank, totalTeams, them, seed);

  return {
    archetypes: dedup,
    profileSummaryLine,
    relativeLevel,
    oppRank,
    ourRank,
    totalTeams,
    themGpg: them.gpg,
    themGcpg: them.gcpg,
    themPpg: them.ppg,
    themN: them.n,
  };
}

function archetypeLabelPt(a: OpponentArchetype): string {
  const m: Record<OpponentArchetype, string> = {
    table_top: "luta pelo topo / referência na tabela",
    attacking: "perfil muito ofensivo",
    mid_balanced: "meio da tabela equilibrado",
    defensive_block: "bloco baixo e cuidadoso",
    table_bottom: "luta pela manutenção / parte baixa",
    physical_direct: "jogo físico e directo",
    technical_possession: "jogo técnico e de controlo",
  };
  return m[a];
}

function buildProfileSummaryLine(
  arch: OpponentArchetype[],
  oppRank: number | null,
  totalTeams: number,
  them: { gpg: number; gcpg: number; ppg: number; n: number },
  seed: number
): string {
  const parts: string[] = [];
  if (oppRank != null) parts.push(`${oppRank}º em ${totalTeams} equipas`);
  if (them.n >= 2) {
    parts.push(`~${them.gpg.toFixed(2)} golos marcados/jogo, ~${them.gcpg.toFixed(2)} sofridos`);
  }
  const labels = arch.slice(0, 3).map(archetypeLabelPt);
  const intro = pick(
    [
      "Perfil identificado nos dados importados:",
      "Leitura automática do adversário:",
      "Síntese do que os números sugerem:",
    ],
    seed,
    0
  );
  return `${intro} ${labels.join(" + ")}${parts.length ? ` (${parts.join(" · ")})` : ""}.`;
}

function venueOur(fixture: MatchFixture): "home" | "away" {
  return fixture.venue === "home" ? "home" : "away";
}

/** Parágrafo(s) para «O que propomos fazer» — variante por seed, dados e guia. */
export function buildHowWeShouldApproachNarrative(
  ctx: OpponentProfileContext,
  fixture: MatchFixture,
  us: { gpg: number; gcpg: number; n: number }
): string {
  const seed = dumbHash(`${fixture.kickoff}|approach|${ctx.profileSummaryLine}`);
  const v = venueOur(fixture);
  const oppAway = v === "home";

  const chunks: string[] = [];

  chunks.push(
    pick(
      [
        `Este encontro ${v === "home" ? "em casa" : "fora"} pede clareza de plano: com os números actuais, o nosso registo aponta para ~${us.gpg.toFixed(2)} golos marcados e ~${us.gcpg.toFixed(2)} sofridos por jogo.`,
        `Jogo ${v === "home" ? "no nosso terreno" : "como visitantes"}: os dados da app sugerem ~${us.gpg.toFixed(2)} golos a favor e ~${us.gcpg.toFixed(2)} sofridos por jogo — é esse o ponto de partida táctico.`,
      ],
      seed,
      1
    )
  );

  for (const a of ctx.archetypes.slice(0, 3)) {
    const line = archetypeApproachChunk(a, ctx, seed + a.length * 17);
    if (line.trim()) chunks.push(line);
  }

  chunks.push(relativeLevelChunk(ctx.relativeLevel, seed + 7));

  if (oppAway) {
    chunks.push(
      pick(
        [
          "Como eles vêm de fora, o relógio emocional costuma ser mais pragmático: menos exposição, mais atenção ao resultado parcial — convém não dar pontapés de partida com perdas na nossa zona.",
          "Adversário em deslocação: espera-se menos volúbil que em casa; o espaço pode abrir-se se mantivermos o equilíbrio após perda.",
        ],
        seed,
        2
      )
    );
  } else {
    chunks.push(
      pick(
        [
          "Em casa, o adversário tende a subir o nível de intensidade e a procurar o primeiro golo — os primeiros minutos pedem concentração máxima e bloco compacto.",
          "No reduto deles, o apoio empurra para a frente: convém fechar o eixo e forçar o jogo para zonas onde dominamos melhor.",
        ],
        seed,
        3
      )
    );
  }

  chunks.push(
    pick(
      [
        "Sinais a ler ao vivo: se fecharem o corredor central, abre largura e paciência; se subirem muito os laterais, pensa nas costas; se a pressão for alta, a saída longa ou o terceiro homem podem destravar o jogo.",
        "Durante o jogo, ajusta: linha baixa do adversário pede circulação e remate de fora; pressão alta convida a jogar por baixo ou nas costas da última linha.",
      ],
      seed,
      4
    )
  );

  return dedupeSentences(chunks.join(" "));
}

function archetypeApproachChunk(a: OpponentArchetype, ctx: OpponentProfileContext, seed: number): string {
  const g = ctx.themGpg.toFixed(2);
  const gc = ctx.themGcpg.toFixed(2);
  switch (a) {
    case "table_top":
      return pick(
        [
          `Equipa de referência na tabela: competem bem os momentos decisivos. Sem bola, bloco curto, eixo fechado e zero ofertas na saída; com bola, circulação paciente e mudanças de ritmo para não lhes dar conforto.`,
          `Perfil de topo: sabem ganhar mesmo sem brilhar sempre. Exige disciplina, poucos erros técnicos e ideia clara na transição — manter o jogo equilibrado até ao fim aumenta a pressão sobre eles.`,
        ],
        seed,
        10
      );
    case "attacking":
      return pick(
        [
          `Tendência ofensiva forte (~${g} golos/jogo): gostam de jogo aberto. Organização sem bola, coberturas às costas e evitar o “jogo partido” cedo; na recuperação, atacar o espaço com critério.`,
          `Marcam com regularidade (~${g} por jogo). O caos joga a favor deles — controla o ritmo, fecha o meio e escolhe bem o momento de acelerar.`,
        ],
        seed,
        11
      );
    case "mid_balanced":
      return pick(
        [
          "Meio de tabela competitivo: não costumam dar jogos por perdidos. Impõe personalidade desde o início, ganha segundas bolas e troca o jogo de flanco para os tirar da zona de conforto.",
          "Adversário estável e incómodo: duelos intensos e ritmo alto em casa; fora, mais à espera do erro. Antecipa os dois cenários e não regales confiança no arranque.",
        ],
        seed,
        12
      );
    case "defensive_block":
      return pick(
        [
          `Bloco cuidadoso (~${gc} sofridos/jogo): paciência com bola, largura máxima, circulação até abrir linha e remates com critério de fora da área. Depois de perder, equilíbrio imediato — vivem da transição.`,
          `Equipa que prioriza não sofrer: ritmo mais lento e muitas situações fechadas. Não te precipites; força o desgaste e castiga com cruzamentos bem escolhidos.`,
        ],
        seed,
        13
      );
    case "table_bottom":
      return pick(
        [
          "Parte baixa da tabela: podem ter menos consistência, mas a urgência e o duelo sobem de nível. Seriedade competitiva, intensidade desde o início e simplicidade com bola — evita entrar na confusão emocional.",
          "Equipa em luta: em casa arriscam mais no duelo; fora fecham e jogam directo. Marca cedo se puderes, mas sem desleixar o equilíbrio.",
        ],
        seed,
        14
      );
    case "physical_direct":
      return pick(
        [
          `Jogo físico e transições rápidas (médias altas de golos envolvidos: ~${g} marcados, ~${gc} sofridos). Ganhar primeira e segunda bola, reduzir faltas laterais perigosas e fazer a bola correr no chão para baixar o ritmo de choque.`,
          "Perfil directo e de contacto: antecipa segunda bola, protege duelos e tira o jogo do corredor físico quando possível.",
        ],
        seed,
        15
      );
    case "technical_possession":
      return pick(
        [
          `Leitura de equipa com boa eficácia pontual (~${ctx.themPpg.toFixed(2)} pts/jogo) e défice contido (~${gc} sofridos). Fecha o corredor central, escolhe bem os momentos de pressão e, na recuperação, ataca espaço com velocidade — não corras atrás da bola sem critério.`,
          "Perfil de controlo e circulação: atraem para depois encontrar linha. Compacta por dentro e força o jogo para zonas onde recuperas mais rápido.",
        ],
        seed,
        16
      );
    default:
      return "";
  }
}

function relativeLevelChunk(level: RelativeLevel, seed: number): string {
  switch (level) {
    case "opponent_stronger":
      return pick(
        [
          "Nível da tabela e/ou pontos por jogo a favor deles: organização máxima, paciência com o resultado e aproveitamento cirúrgico dos poucos momentos de desequilíbrio.",
          "Adversário que chega com argumentos de favoritismo nos dados: madurez colectiva, poucos erros e leitura fria dos períodos do jogo.",
        ],
        seed,
        20
      );
    case "opponent_weaker":
      return pick(
        [
          "Nos números, tens margem para impor ritmo e domínio emocional: começa forte, resolve situações cedo e não dês oxigénio com erros evitáveis.",
          "Contexto favorável nos dados: intensidade alta, detalhes a teu favor e clareza para fechar o jogo sem dar esperança.",
        ],
        seed,
        21
      );
    default:
      return pick(
        [
          "Encontro equilibrado “no papel”: ganham-se detalhes, duelos e a primeira meia hora — personalidade e consistência fazem a diferença.",
          "Forças semelhantes nos indicadores: o jogo decide-se em lances, segunda bola e capacidade de manter o plano sob pressão.",
        ],
        seed,
        22
      );
  }
}

/** Parágrafo(s) para «O que antecipamos do adversário». */
export function buildHowWeExpectOpponentNarrative(
  ctx: OpponentProfileContext,
  fixture: MatchFixture
): string {
  const seed = dumbHash(`${fixture.kickoff}|expect|${ctx.profileSummaryLine}`);
  const weHome = venueOur(fixture) === "home";

  const parts: string[] = [];

  parts.push(
    pick(
      [
        `Com base no perfil e nos dados (~${ctx.themGpg.toFixed(2)} golos marcados, ~${ctx.themGcpg.toFixed(2)} sofridos por jogo), antecipamos o seguinte:`,
        `À luz do que importaste para a app (~${ctx.themGpg.toFixed(2)} a favor, ~${ctx.themGcpg.toFixed(2)} contra, quando há amostra suficiente), o mais provável é:`,
      ],
      seed,
      30
    )
  );

  for (const a of ctx.archetypes.slice(0, 3)) {
    const line = expectChunkForArchetype(a, weHome, ctx, seed + a.length * 19);
    if (line.trim()) parts.push(line);
  }

  parts.push(
    pick(
      [
        "Se pressionarem alto, o espaço por trás da última linha torna-se chave; se baixarem o bloco, entra paciência, largura e último passe com qualidade.",
        "Ajusta ao vivo: pressão alta pede saída limpa ou ruptura; bloco baixo pede circulação e um plano claro para bola parada.",
      ],
      seed,
      31
    )
  );

  return dedupeSentences(parts.join(" "));
}

function expectChunkForArchetype(
  a: OpponentArchetype,
  weHome: boolean,
  ctx: OpponentProfileContext,
  seed: number
): string {
  const away = !weHome;
  switch (a) {
    case "table_top":
      return away
        ? pick(
            [
              "Fora de casa, equipas de topo costumam ser mais pragmáticas: menos exposição, decisões mais calculadas e foco no resultado.",
              "Em deslocação, espera um jogo controlado por parte deles: menos volúbil, mais atento ao equilíbrio emocional.",
            ],
            seed,
            40
          )
        : pick(
            [
              "Em casa, equipas de referência entram fortes, procuram o primeiro golo e tentam controlar o ritmo; castigam erros técnicos e crescem com o apoio.",
              "No próprio reduto, vão assumir iniciativa relativa e momentos de pressão alta — os primeiros minutos são decisivos.",
            ],
            seed,
            41
          );
    case "attacking":
      return pick(
        [
          "Equipa que gosta de atacar em volume: pressão alta, muitos corpos na zona final e disposição para o jogo aberto — atenção às transições desprotegidas.",
          "Perfil ofensivo: intensidade na recuperação e capacidade de criar volume de jogo perto da tua baliza.",
        ],
        seed,
        42
      );
    case "mid_balanced":
      return pick(
        [
          "Meio de tabela: competitiva em duelos, ritmo intenso em casa e mais cautela fora à espera do erro.",
          "Equipa organizada o suficiente para não facilitar: em casa vai ao duelo; fora fecha um pouco mais e gere o resultado.",
        ],
        seed,
        43
      );
    case "defensive_block":
      return pick(
        [
          `Bloco mais fechado (~${ctx.themGcpg.toFixed(2)} sofridos/jogo): ritmo mais lento, linhas juntas e dependência de bola parada ou transição rápida.`,
          "Equipa que se organiza para não sofrer: pouco espaço entre linhas e paciência para te desgastar.",
        ],
        seed,
        44
      );
    case "table_bottom":
      return pick(
        [
          "Parte baixa: urgência e entrega em casa, com duelo forte; fora, bloco mais baixo e jogo mais directo.",
          "Equipa em luta: emoção alta no próprio reduto, pragmatismo fora.",
        ],
        seed,
        45
      );
    case "physical_direct":
      return pick(
        [
          "Espera bola longa, segunda bola e muitos duelos aéreos e corpo a corpo — o jogo pode “partir-se” em vários momentos.",
          "Perfil físico: contacto constante e procura de segunda jogada.",
        ],
        seed,
        46
      );
    case "technical_possession":
      return pick(
        [
          "Tendência para circular e atrair pressão para encontrar linha entrelinhas — cuidado com o meio-alto muito carregado.",
          "Equipa que gosta de ter o controlo do ritmo e de forçar o adversário a correr de forma desordenada.",
        ],
        seed,
        47
      );
    default:
      return "";
  }
}

function dedupeSentences(text: string): string {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(" ");
}
