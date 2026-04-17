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
  profileSummaryLine: string;
  relativeLevel: RelativeLevel;
  oppRank: number | null;
  ourRank: number | null;
  totalTeams: number;
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

function teamKey(row: LeagueTableRow): string {
  return normalizeTeamLabel(row.team);
}

function gm(row: LeagueTableRow): number {
  return row.goalsFor ?? 0;
}

function gs(row: LeagueTableRow): number {
  return row.goalsAgainst ?? 0;
}

function dg(row: LeagueTableRow): number {
  if (row.goalDifference != null && Number.isFinite(row.goalDifference)) return row.goalDifference;
  return gm(row) - gs(row);
}

function pts(row: LeagueTableRow): number {
  return row.points ?? 0;
}

function played(row: LeagueTableRow): number {
  return Math.max(1, row.played ?? 1);
}

export function rowForTeam(rows: LeagueTableRow[], teamLabel: string): LeagueTableRow | null {
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
 * Classifica o adversário só com base na tabela importada:
 * 1–5 topo; top 6 GM; meio; bottom 6 GS; últimos 5 PTS; top 5 DG; físicas (meio + poucos GM/GS + GM≈GS).
 */
function classifyArchetypesFromTable(rows: LeagueTableRow[], opponentLabel: string): OpponentArchetype[] {
  const valid = rows.filter((r) => r.team?.trim());
  if (valid.length < 2) return ["mid_balanced"];

  const oppRow = rowForTeam(valid, opponentLabel);
  if (!oppRow) return ["mid_balanced"];

  const pos = oppRow.position;
  const totalTeams = valid.length;
  const oppKey = teamKey(oppRow);

  const byGm = [...valid].sort((a, b) => gm(b) - gm(a));
  const top6Gm = new Set(byGm.slice(0, Math.min(6, valid.length)).map((r) => teamKey(r)));

  const byGs = [...valid].sort((a, b) => gs(a) - gs(b));
  const bottom6Gs = new Set(byGs.slice(0, Math.min(6, valid.length)).map((r) => teamKey(r)));

  const byPtsAsc = [...valid].sort((a, b) => pts(a) - pts(b));
  const bottom5Pts = new Set(byPtsAsc.slice(0, Math.min(5, valid.length)).map((r) => teamKey(r)));

  const byDg = [...valid].sort((a, b) => dg(b) - dg(a));
  const top5Dg = new Set(byDg.slice(0, Math.min(5, valid.length)).map((r) => teamKey(r)));

  const midMin = 6;
  const midMax = totalTeams - 5;
  const midTable = totalTeams >= 11 && pos >= midMin && pos <= midMax;

  const gfPg = gm(oppRow) / played(oppRow);
  const gaPg = gs(oppRow) / played(oppRow);
  const gfs = valid.map((r) => gm(r) / played(r)).sort((a, b) => a - b);
  const gas = valid.map((r) => gs(r) / played(r)).sort((a, b) => a - b);
  const medGf = gfs[Math.floor(gfs.length / 2)] ?? gfPg;
  const medGa = gas[Math.floor(gas.length / 2)] ?? gaPg;
  const similarGmGs = Math.abs(gfPg - gaPg) < 0.45;
  const lowBoth = gfPg <= medGf && gaPg <= medGa;

  const arch: OpponentArchetype[] = [];

  if (pos >= 1 && pos <= 5) arch.push("table_top");
  if (bottom5Pts.has(oppKey)) arch.push("table_bottom");
  if (top6Gm.has(oppKey)) arch.push("attacking");
  if (bottom6Gs.has(oppKey)) arch.push("defensive_block");
  if (top5Dg.has(oppKey)) arch.push("technical_possession");

  if (midTable) {
    if (lowBoth && similarGmGs) arch.push("physical_direct");
    else arch.push("mid_balanced");
  }

  let dedup = [...new Set(arch)];
  if (dedup.length === 0) dedup = ["mid_balanced"];

  if (dedup.length > 1) {
    const priority: OpponentArchetype[] = [
      "table_top",
      "table_bottom",
      "attacking",
      "defensive_block",
      "technical_possession",
      "physical_direct",
      "mid_balanced",
    ];
    dedup.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }

  return dedup;
}

function fallbackArchetypesFromStats(them: { gpg: number; gcpg: number; ppg: number; n: number }): OpponentArchetype[] {
  const arch: OpponentArchetype[] = [];
  if (them.n >= 2) {
    if (them.gpg >= 1.45) arch.push("attacking");
    if (them.gcpg <= 0.98 && them.gpg <= 1.2) arch.push("defensive_block");
    if (them.ppg >= 1.7 && them.gcpg < 1.15) arch.push("technical_possession");
  }
  if (arch.length === 0) arch.push("mid_balanced");
  return [...new Set(arch)];
}

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

  const ourRow = rowForTeam(rows, coachClub);
  const oppRow = rowForTeam(rows, opponentName);
  const ourRank = ourRow?.position ?? null;
  const oppRank = oppRow?.position ?? null;
  const totalTeams = rows.length > 0 ? rows.length : oppRank ?? 18;

  let archetypes =
    rows.length >= 2 ? classifyArchetypesFromTable(rows, opponentName) : fallbackArchetypesFromStats(them);

  let relativeLevel: RelativeLevel = "similar";
  if (ourRank != null && oppRank != null) {
    const d = oppRank - ourRank;
    if (d <= -2) relativeLevel = "opponent_stronger";
    else if (d >= 2) relativeLevel = "opponent_weaker";
  } else if (us.n >= 2 && them.n >= 2) {
    const dppg = them.ppg - us.ppg;
    if (dppg >= 0.35) relativeLevel = "opponent_stronger";
    else if (dppg <= -0.35) relativeLevel = "opponent_weaker";
  }

  const seed = dumbHash(`${fixture.kickoff}|${opponentName}|${coachClub}`);
  const profileSummaryLine = buildProfileSummaryLine(archetypes, oppRank, totalTeams, rows.length >= 5, them, seed);

  return {
    archetypes,
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
    table_top: "1.º–5.º (topo)",
    attacking: "entre as 6 com mais GM",
    mid_balanced: "meio da tabela",
    defensive_block: "entre as 6 com menos GS",
    table_bottom: "entre os 5 com menos PTS",
    physical_direct: "jogo físico/directo (meio, GM/GS baixos e próximos)",
    technical_possession: "entre as 5 melhores DG",
  };
  return m[a];
}

function buildProfileSummaryLine(
  arch: OpponentArchetype[],
  oppRank: number | null,
  totalTeams: number,
  tableOk: boolean,
  them: { gpg: number; gcpg: number; ppg: number; n: number },
  seed: number
): string {
  const parts: string[] = [];
  if (oppRank != null) parts.push(`${oppRank}º / ${totalTeams} equipas na tabela`);
  if (them.n >= 2) {
    parts.push(`últimos jogos: ~${them.gpg.toFixed(2)} GM/jogo, ~${them.gcpg.toFixed(2)} GS/jogo`);
  }
  const labels = arch.slice(0, 4).map(archetypeLabelPt);
  const intro = pick(
    [
      "Perfil (regras da tabela importada):",
      "Classificação automática:",
      "Leitura da competição:",
    ],
    seed,
    0
  );
  const tableNote = tableOk ? "" : " (tabela parcial — reforça o URL da liga para cruzar GM/GS/PTS/DG com toda a divisão).";
  return `${intro} ${labels.join(" + ")}${parts.length ? ` — ${parts.join(" · ")}` : ""}${tableNote}`;
}

function venueOur(fixture: MatchFixture): "home" | "away" {
  return fixture.venue === "home" ? "home" : "away";
}

/** Nós em casa → adversário joga fora; nós fora → adversário em casa. */
function opponentPlaysAway(fixture: MatchFixture): boolean {
  return fixture.venue === "home";
}

export function buildHowWeShouldApproachNarrative(
  ctx: OpponentProfileContext,
  fixture: MatchFixture,
  us: { gpg: number; gcpg: number; n: number }
): string {
  const seed = dumbHash(`${fixture.kickoff}|approach|${ctx.profileSummaryLine}`);
  const weHome = venueOur(fixture) === "home";

  const chunks: string[] = [];

  chunks.push(
    pick(
      [
        `Encontro ${weHome ? "no nosso reduto" : "como visitante"}: o plano deve reflectir isso — os teus números recentes na app apontam para ~${us.gpg.toFixed(2)} golos marcados e ~${us.gcpg.toFixed(2)} sofridos por jogo.`,
        `Jogo ${weHome ? "em casa" : "fora"}: ponto de partida táctico com base no que tens registado (~${us.gpg.toFixed(2)} GM/jogo, ~${us.gcpg.toFixed(2)} GS/jogo).`,
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

  if (weHome) {
    chunks.push(
      pick(
        [
          "Em casa: procura assumir iniciativa, subir a linha de pressão quando fizer sentido e fazer o adversário sentir desconforto com o relógio e com o apoio.",
          "No teu terreno: ritmo e responsabilidade ofensiva claros — força erros sem te expores em transição.",
        ],
        seed,
        8
      )
    );
  } else {
    chunks.push(
      pick(
        [
          "Fora: entrada madura nos primeiros minutos, pouca folga na organização defensiva e capacidade de crescer ao longo do jogo se o resultado o permitir.",
          "Como visitante: disciplina colectiva primeiro; o jogo longo pode vir a dar-te vantagem se não regalares transições.",
        ],
        seed,
        9
      )
    );
  }

  chunks.push(
    pick(
      [
        "Ao longo do encontro: se fecharem o eixo, abre largura; se subirem laterais, pensa nas costas; se pressionarem muito alto, valoriza saída limpa ou ruptura.",
        "Sinais em tempo real: bloco baixo pede paciência e último passe; pressão alta pede coragem na saída ou bola por cima.",
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
          `Equipa do grupo dos primeiros lugares: competem bem os momentos decisivos. Sem bola, bloco curto e eixo fechado; com bola, circulação paciente e mudanças de ritmo para não lhes dar conforto.`,
          `Referência na parte alta da tabela: sabem ganhar mesmo sem dominar sempre. Exige disciplina e transições bem escolhidas — manter o jogo empatado até ao fim aumenta a pressão sobre eles.`,
        ],
        seed,
        10
      );
    case "attacking":
      return pick(
        [
          `Entre as equipas com mais golos marcados na tabela: perfil perigoso em volume. Organização sem bola, coberturas às costas e evitar o jogo completamente aberto cedo.`,
          `Linha ofensiva forte nos números agregados: controla o caos, fecha o meio e escolhe o momento de acelerar.`,
        ],
        seed,
        11
      );
    case "mid_balanced":
      return pick(
        [
          "Meio da tabela: organização para competir com quase todos. Impõe personalidade cedo, ganha segundas bolas e troca o jogo de flanco para os tirar da zona de conforto.",
          "Perfil equilibrado na classificação: não costumam facilitar — o jogo decide-se em duelos e em detalhe.",
        ],
        seed,
        12
      );
    case "defensive_block":
      return pick(
        [
          `Entre as defesas que menos sofrem na tabela: paciência com bola, largura, circulação até abrir linha e remates com critério. Depois de perder, equilíbrio imediato.`,
          `Bloco cuidadoso nos totais de GS: ritmo mais lento e muitas situações fechadas — força o desgaste sem te precipitares.",
        ],
        seed,
        13
      );
    case "table_bottom":
      return pick(
        [
          "Entre os lugares com menos pontos: urgência e entrega costumam subir — seriedade competitiva, intensidade e simplicidade com bola.",
          "Equipa em luta na parte baixa: evita confusão emocional e não regales transições baratas.",
        ],
        seed,
        14
      );
    case "physical_direct":
      return pick(
        [
          `Perfil de jogo mais físico/directo (GM e GS moderados e próximos entre si): ganhar primeira e segunda bola, reduzir faltas laterais perigosas e fazer a bola correr no chão.`,
          "Transições e duelos: antecipa o jogo partido e protege os lances de segunda jogada.",
        ],
        seed,
        15
      );
    case "technical_possession":
      return pick(
        [
          `Entre as melhores diferenças de golos na tabela: leitura e eficácia acima da média. Fecha o corredor central, pressiona em momentos escolhidos e, na recuperação, ataca espaço com velocidade.`,
          "Equipa com saldo ofensivo muito positivo nos dados agregados: cuidado com o controlo do ritmo e com o meio-alto.",
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
          "Na tabela estão acima ou com melhor média de pontos: organização máxima, paciência e aproveitamento cirúrgico dos momentos a teu favor.",
          "Contexto desfavorável no ‘papel’: madurez colectiva e poucos erros forçados.",
        ],
        seed,
        20
      );
    case "opponent_weaker":
      return pick(
        [
          "Nos números da competição, tens margem para impor ritmo e domínio emocional — resolve situações sem dar oxigénio ao adversário.",
          "Leitura favorável na tabela ou nos pontos por jogo: intensidade e clareza para fechar o jogo.",
        ],
        seed,
        21
      );
    default:
      return pick(
        [
          "Forças parecidas no que a tabela e as médias mostram: ganham-se detalhes, segunda bola e a primeira meia hora.",
          "Encontro equilibrado nos indicadores: consistência e personalidade fazem a diferença.",
        ],
        seed,
        22
      );
  }
}

export function buildHowWeExpectOpponentNarrative(ctx: OpponentProfileContext, fixture: MatchFixture): string {
  const seed = dumbHash(`${fixture.kickoff}|expect|${ctx.profileSummaryLine}`);
  const oppAway = opponentPlaysAway(fixture);

  const parts: string[] = [];

  parts.push(
    pick(
      [
        oppAway
          ? `Neste jogo eles jogam fora de casa — foca o que esse contexto costuma alterar (~${ctx.themGpg.toFixed(2)} GM/jogo, ~${ctx.themGcpg.toFixed(2)} GS/jogo nos dados recentes).`
          : `Neste jogo eles jogam em casa — antecipa o que o factor do reduto costuma acrescentar (~${ctx.themGpg.toFixed(2)} GM/jogo, ~${ctx.themGcpg.toFixed(2)} GS/jogo nos dados recentes).`,
        oppAway
          ? `Adversário em deslocação: leitura com base no perfil e nos números importados (~${ctx.themGpg.toFixed(2)} a favor, ~${ctx.themGcpg.toFixed(2)} contra).`
          : `Adversário no próprio estádio: comportamento esperado à luz do perfil e dos dados (~${ctx.themGpg.toFixed(2)} GM, ~${ctx.themGcpg.toFixed(2)} GS).`,
      ],
      seed,
      30
    )
  );

  for (const a of ctx.archetypes.slice(0, 3)) {
    const line = expectChunkForArchetype(a, oppAway, ctx, seed + a.length * 19);
    if (line.trim()) parts.push(line);
  }

  parts.push(
    pick(
      [
        "Durante o jogo: se pressionarem alto, valoriza as costas; se baixarem o bloco, entra paciência e largura.",
        "Ajusta ao vivo: pressão alta pede saída limpa; bloco baixo pede circulação e bola parada bem ensaiada.",
      ],
      seed,
      31
    )
  );

  return dedupeSentences(parts.join(" "));
}

/** Só a parte do guia que corresponde a adversário fora OU adversário em casa. */
function expectChunkForArchetype(
  a: OpponentArchetype,
  opponentPlaysAway: boolean,
  ctx: OpponentProfileContext,
  seed: number
): string {
  switch (a) {
    case "table_top":
      return opponentPlaysAway
        ? pick(
            [
              "Equipa de topo em deslocação: mais pragmatismo, menos exposição, decisões calculadas e foco no resultado parcial.",
              "Fora, este tipo de equipa costuma gerir melhor o risco e o relógio emocional.",
            ],
            seed,
            40
          )
        : pick(
            [
              "No próprio reduto, equipa de topo entra forte, procura o primeiro golo e tenta controlar o ritmo; castiga erros e cresce com o apoio.",
              "Em casa, espera pressão alta no arranque e intensidade para marcar cedo.",
            ],
            seed,
            41
          );
    case "attacking":
      return opponentPlaysAway
        ? pick(
            [
              "Equipa muito ofensiva fora: continua perigosa, mas costuma deixar um pouco mais de espaço atrás — atenção às transições.",
              "Em deslocação, ainda atacam em volume, com um pouco menos de gente fixa no último terço.",
            ],
            seed,
            42
          )
        : pick(
            [
              "Em casa, equipa muito ofensiva: pressão alta, entrada agressiva e muitos jogadores em zonas de finalização.",
              "No seu estádio, espera jogo aberto e intensidade na recuperação.",
            ],
            seed,
            43
          );
    case "mid_balanced":
      return opponentPlaysAway
        ? pick(
            [
              "Meio da tabela fora: mais cautela, menos exposição e maior dependência do erro adversário.",
              "Em deslocação, equipa equilibrada costuma fechar um pouco mais e gerir o resultado.",
            ],
            seed,
            44
          )
        : pick(
            [
              "Meio da tabela em casa: intensidade alta no duelo, ritmo competitivo e vontade de impor o jogo.",
              "No reduto, espera-se equipa incómoda e agressiva na primeira bola.",
            ],
            seed,
            45
          );
    case "defensive_block":
      return opponentPlaysAway
        ? pick(
            [
              `Bloco defensivo fora: ainda mais fechados — um ponto já os pode satisfazer (~${ctx.themGcpg.toFixed(2)} GS/jogo nos dados recentes).`,
              "Em deslocação, linhas muito juntas e ritmo lento para tirar tempo ao relógio.",
            ],
            seed,
            46
          )
        : pick(
            [
              `Em casa, bloco baixo: linhas juntas, ritmo controlado e muitas situações de bola parada (~${ctx.themGcpg.toFixed(2)} GS/jogo).`,
              "No seu terreno, priorizam não sofrer e esperar o momento de transição.",
            ],
            seed,
            47
          );
    case "table_bottom":
      return opponentPlaysAway
        ? pick(
            [
              "Parte baixa da tabela fora: bloco mais baixo, jogo mais directo e pragmatismo extremo.",
              "Em deslocação, equipa em luta costuma fechar e apostar no pouco que precisa.",
            ],
            seed,
            48
          )
        : pick(
            [
              "Parte baixa em casa: entrada agressiva, muito duelo e emoção alta para levantar o público.",
              "No reduto, espera urgência e entrega máxima desde o apito inicial.",
            ],
            seed,
            49
          );
    case "physical_direct":
      return opponentPlaysAway
        ? pick(
            [
              "Jogo físico fora: ainda directo, mas por vezes com menos corredor para segunda bola longa.",
              "Em deslocação, continuam fortes no contacto — atenção aos duelos e às segundas bolas.",
            ],
            seed,
            50
          )
        : pick(
            [
              "Em casa, perfil físico: bola longa, segunda bola e cruzamentos com muitos corpos na área.",
              "No estádio deles, espera contacto constante e jogo directo.",
            ],
            seed,
            51
          );
    case "technical_possession":
      return opponentPlaysAway
        ? pick(
            [
              "Equipa técnica fora: circulação ainda boa, mas menos tempo com bola e mais transições longas.",
              "Em deslocação, procuram espaços interiores com menos gente por perto.",
            ],
            seed,
            52
          )
        : pick(
            [
              "Em casa, equipa técnica: circular muito, atrair pressão e procurar linha entrelinhas.",
              "No reduto, querem controlo do ritmo e domínio posicional.",
            ],
            seed,
            53
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
    const key = p.slice(0, 52);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(" ");
}
