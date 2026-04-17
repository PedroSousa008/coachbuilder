import type { LeagueTableRow, MatchFixture } from "@/types";
import { normalizeTeamLabel, pickBestTeamMatch, teamNameSimilarity } from "@/lib/team-match";
import {
  APPROACH_BY_ARCH,
  EXPECT_BY_ARCH,
  type ExpectVenue,
  type RankBucket,
} from "@/lib/opponent-profile-narrative-variants";

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
  /** Seed estável por jogo — garante variação de frases entre encontros. */
  narrativeSeed: number;
};

export type { RankBucket };

function dumbHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Escolha determinística mas distinta entre secções (evita repetir a mesma frase). */
function pickVariant(lines: string[], seed: number, salt: number): string {
  if (lines.length === 0) return "";
  const mixed = (seed ^ salt * 0x9e3779b9) >>> 0;
  const idx = mixed % lines.length;
  return lines[idx]!;
}

function ordinalPt(n: number): string {
  return `${n}.º`;
}

function rankBucket(oppRank: number | null, total: number): RankBucket {
  if (oppRank == null || oppRank < 1 || total < 1) return "unknown";
  if (total >= 10) {
    if (oppRank <= 5) return "top";
    if (oppRank >= total - 4) return "bottom";
    return "mid";
  }
  if (total >= 6) {
    if (oppRank <= 3) return "top";
    if (oppRank >= total - 2) return "bottom";
    return "mid";
  }
  if (total === 1) return "mid";
  if (oppRank === 1) return "top";
  if (oppRank === total) return "bottom";
  return "mid";
}

function fillNarrativeTemplate(s: string, ctx: OpponentProfileContext): string {
  const rank = ctx.oppRank != null ? ordinalPt(ctx.oppRank) : "—";
  const total = String(ctx.totalTeams);
  const g = ctx.themGpg.toFixed(2);
  const gc = ctx.themGcpg.toFixed(2);
  return s
    .replace(/\{\{rank\}\}/g, rank)
    .replace(/\{\{total\}\}/g, total)
    .replace(/\{\{g\}\}/g, g)
    .replace(/\{\{gc\}\}/g, gc);
}

function fillApproachUs(s: string, ctx: OpponentProfileContext, us: { gpg: number; gcpg: number }): string {
  return fillNarrativeTemplate(s, ctx)
    .replace(/\{\{ug\}\}/g, us.gpg.toFixed(2))
    .replace(/\{\{ugc\}\}/g, us.gcpg.toFixed(2));
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

  const narrativeSeed = dumbHash(
    `${fixture.kickoff}|${opponentName}|${coachClub}|${oppRank ?? 0}|${totalTeams}|${archetypes.join("|")}|${them.ppg.toFixed(3)}|${us.ppg.toFixed(3)}`
  );

  const profileSummaryLine = buildProfileSummaryLine(
    archetypes,
    oppRank,
    totalTeams,
    rows.length >= 5,
    them,
    narrativeSeed
  );

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
    narrativeSeed,
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
  if (oppRank != null) parts.push(`${oppRank}.º / ${totalTeams} equipas na tabela`);
  if (them.n >= 2) {
    parts.push(`últimos jogos: ~${them.gpg.toFixed(2)} GM/jogo, ~${them.gcpg.toFixed(2)} GS/jogo`);
  }
  const labels = arch.slice(0, 4).map(archetypeLabelPt);
  const intro = pickVariant(
    ["Perfil (regras da tabela importada):", "Classificação automática:", "Leitura da competição:"],
    seed,
    0
  );
  const tableNote = tableOk ? "" : " (tabela parcial — reforça o URL da liga para cruzar GM/GS/PTS/DG com toda a divisão).";
  return `${intro} ${labels.join(" + ")}${parts.length ? ` — ${parts.join(" · ")}` : ""}${tableNote}`;
}

function venueOur(fixture: MatchFixture): "home" | "away" {
  return fixture.venue === "home" ? "home" : "away";
}

function opponentPlaysAway(fixture: MatchFixture): boolean {
  return fixture.venue === "home";
}

function linesForApproach(arch: OpponentArchetype, bucket: RankBucket): string[] {
  const pool = APPROACH_BY_ARCH[arch];
  if (!pool) return [];
  const primary = pool[bucket];
  if (primary && primary.length > 0) return primary;
  if (pool.unknown?.length) return pool.unknown;
  if (pool.mid?.length) return pool.mid;
  return [...(pool.top ?? []), ...(pool.mid ?? []), ...(pool.bottom ?? [])];
}

function linesForExpect(arch: OpponentArchetype, oppVenue: ExpectVenue, bucket: RankBucket): string[] {
  const a = EXPECT_BY_ARCH[arch];
  if (!a) return [];
  const v = a[oppVenue];
  if (!v) return [];
  const primary = v[bucket];
  if (primary && primary.length > 0) return primary;
  if (v.unknown?.length) return v.unknown;
  if (v.mid?.length) return v.mid;
  return [...(v.top ?? []), ...(v.mid ?? []), ...(v.bottom ?? [])];
}

function approachArchetypeLine(
  arch: OpponentArchetype,
  ctx: OpponentProfileContext,
  bucket: RankBucket,
  seed: number,
  idx: number
): string {
  const lines = linesForApproach(arch, bucket);
  const salt = idx * 131 + arch.length * 17 + 400;
  const raw = pickVariant(lines, seed, salt);
  return fillNarrativeTemplate(raw, ctx);
}

function expectArchetypeLine(
  arch: OpponentArchetype,
  ctx: OpponentProfileContext,
  oppVenue: ExpectVenue,
  bucket: RankBucket,
  seed: number,
  idx: number
): string {
  const lines = linesForExpect(arch, oppVenue, bucket);
  const salt = idx * 137 + arch.charCodeAt(0) + 900;
  const raw = pickVariant(lines, seed ^ 0xdeadbeef, salt);
  return fillNarrativeTemplate(raw, ctx);
}

const APPROACH_OPENERS_WE_HOME = [
  "Encontro no nosso terreno contra quem está no {{rank}} lugar ({{total}} equipas): os teus registos recentes apontam ~{{ug}} GM/jogo e ~{{ugc}} GS/jogo — constrói o plano em função desse duelo de classificação.",
  "Jogas em casa: o adversário surge no {{rank}} posto da tabela ({{total}} equipas). Com base no que tens na app (~{{ug}} golos marcados e ~{{ugc}} sofridos por jogo), equilibra iniciativa e segurança.",
  "No teu estádio, defrontas equipa no {{rank}} lugar. Os teus números (~{{ug}} GM/jogo, ~{{ugc}} GS/jogo) dizem-te o risco que podes correr para impor o teu jogo.",
  "Casa: adversário classificado em {{rank}} entre {{total}}. Usa a amostra recente (~{{ug}} / ~{{ugc}}) para calibrar pressão e transição.",
  "Reduto próprio, adversário no {{rank}} lugar: lê o encontro como jogo de tabela — os teus dados (~{{ug}} e ~{{ugc}} por jogo) guiam o ritmo ofensivo.",
  "Em casa, com oposição no {{rank}} posto ({{total}} equipas), o ponto de partida é a tua forma recente: ~{{ug}} GM/jogo, ~{{ugc}} GS/jogo.",
  "Factor casa + adversário no {{rank}} lugar: traduz a classificação em tarefas claras; a tua amostra (~{{ug}} / ~{{ugc}}) define quanto podes investir na pressão.",
  "Recebes equipa no {{rank}} lugar: com ~{{ug}} GM e ~{{ugc}} GS por jogo na app, escolhe o equilíbrio entre domínio e proteção às costas.",
  "No teu campo, {{rank}} na tabela adversária ({{total}} equipas). Os teus indicadores (~{{ug}}, ~{{ugc}}) ajudam a decidir se assumis mais risco ou gestão.",
  "Jogo em casa frente ao {{rank}} classificado: usa os teus números (~{{ug}} GM/jogo, ~{{ugc}} GS/jogo) para definir o tom do primeiro tempo.",
];

const APPROACH_OPENERS_WE_AWAY = [
  "Vais jogar fora contra equipa no {{rank}} lugar ({{total}} equipas). Os teus dados recentes (~{{ug}} GM/jogo, ~{{ugc}} GS/jogo) indicam o teu leque táctico como visitante.",
  "Deslocação: adversário no {{rank}} posto. Com base no que registaste (~{{ug}} / ~{{ugc}}), planeia entrada madura e crescimento ao longo do jogo.",
  "Como visitante, defrontas o {{rank}} classificado entre {{total}} equipas. A tua amostra (~{{ug}} GM, ~{{ugc}} GS) diz-te quanta folga podes dar na saída.",
  "Fora de casa, {{rank}} na tabela adversária: disciplina colectiva primeiro; os teus números (~{{ug}} e ~{{ugc}}) orientam quando acelerar.",
  "Estádio alheio, adversário no {{rank}} lugar. Usa ~{{ug}} / ~{{ugc}} por jogo para calibrar se apostas mais em transição ou em posse segura.",
  "Visitante: encontro com equipa no {{rank}} posto ({{total}} equipas). Os registos (~{{ug}} GM, ~{{ugc}} GS) ajudam a definir o bloco inicial.",
  "Jogo fora frente ao {{rank}} classificado: com ~{{ug}} e ~{{ugc}} na app, escolhe o nível de pressão sem te expores cedo.",
  "Deslocação para defrontar o {{rank}} lugar: ponto de partida nos teus últimos jogos (~{{ug}} GM/jogo, ~{{ugc}} GS/jogo).",
  "Adversário no {{rank}} posto, tu como visitante: lê a tabela e cruza com a tua forma (~{{ug}} / ~{{ugc}}) para não repetires erros.",
  "Fora, contra quem está {{rank}} entre {{total}}: entra organizado; a tua amostra (~{{ug}}, ~{{ugc}}) define o timing para assumir risco.",
];

const EXPECT_OPENERS = [
  "Neste encontro o adversário está no {{rank}} lugar ({{total}} equipas) e, nos dados recentes, ronda ~{{g}} GM/jogo e ~{{gc}} GS/jogo.",
  "Classificação adversária: {{rank}} entre {{total}}. A amostra importada sugere ~{{g}} golos marcados e ~{{gc}} sofridos por jogo.",
  "Olhando para a tabela, ocupam o {{rank}} posto (de {{total}} equipas); nos últimos jogos registados, ~{{g}} a favor e ~{{gc}} contra por jogo.",
  "Perfil numérico: {{rank}} lugar, com médias de ~{{g}} GM/jogo e ~{{gc}} GS/jogo na app.",
  "Contexto de competição: adversário no {{rank}} entre {{total}}; números recentes ~{{g}} / ~{{gc}} por jogo.",
  "Na classificação estão {{rank}} ({{total}} equipas). Nos dados que tens, ~{{g}} GM e ~{{gc}} GS por encontro.",
  "Posição {{rank}} na tabela geral ({{total}} equipas); últimos jogos na ordem dos ~{{g}} GM e ~{{gc}} GS por jogo.",
  "Referência: {{rank}} lugar — cruza isso com ~{{g}} golos marcados e ~{{gc}} sofridos por jogo nos registos recentes.",
];

const VENUE_US_HOME = [
  "No teu reduto: procura iniciativa clara, subir a linha de pressão quando o bloco estiver compacto e usar o apoio para desconfortar o adversário no relógio.",
  "Em casa, o desafio é traduzir o factor campos em ritmo e responsabilidade ofensiva sem te expores em transição.",
  "Jogando em Portugal no teu estádio: força erros com pressão coordenada e evita o jogo de ida-e-volta sem controlo.",
  "Factor casa: domina o meio-campo nos primeiros minutos e faz o adversário correr para o lado que queres.",
  "No teu terreno, o público empurra — canaliza isso em organização e claridade no último passe.",
];

const VENUE_US_AWAY = [
  "Como visitante: entrada madura, pouca folga entre linhas nos primeiros minutos e capacidade de crescer se o resultado o permitir.",
  "Fora, a prioridade é não regalar transições; depois escolhe os momentos para subir a pressão.",
  "Em deslocação: disciplina colectiva, poucos erros na saída e leitura paciente do momento certo para acelerar.",
  "Visitante: fecha o jogo interior primeiro; o espaço costuma aparecer quando o adversário se desgasta.",
  "No estádio alheio, gere o jogo emocional — não abras sem ter superioridade no meio.",
];

const TACTIC_CLOSE_APPROACH = [
  "Ao longo do jogo: se fecharem o eixo, abre largura; se subirem laterais, fecha as costas; se pressionarem alto, valoriza saída limpa ou ruptura.",
  "Sinais em tempo real: bloco baixo pede paciência e último passe; pressão alta pede coragem na saída ou bola por cima.",
  "Ajusta ao vivo: se o bloco baixa, circula e procura o desequilíbrio; se sobem a pressão, ataca o espaço por trás.",
  "Leitura de meio-parto: se não há linha entrelinhas, força o jogo às alas; se há pressão na saída, simplifica.",
  "Último terço: se não há remate, recicla e troca o jogo; se há transição, ataca com poucos toques.",
  "Bola parada: tanto defensiva como ofensiva pode decidir — antecipa bloqueios e segundas bolas.",
];

const TACTIC_CLOSE_EXPECT = [
  "Durante o jogo: se pressionarem alto, valoriza as costas; se baixarem o bloco, entra paciência e largura.",
  "Ajusta ao vivo: pressão alta pede saída limpa; bloco baixo pede circulação e bola parada bem ensaiada.",
  "Se fecharem o meio, força o jogo ao corredor; se abrirem, fecha o corredor central e protege transição.",
  "Lê o desgaste: equipas que fecham cedo costumam ceder espaço na segunda parte — antecipa a mudança de ritmo.",
  "Se o resultado aperta, o adversário pode subir linhas ou baixar ainda mais — adapta a pressão em janelas curtas.",
  "Bola parada defensiva: atenção aos bloqueios e aos ressaltos na grande área.",
];

function relativeLevelChunk(level: RelativeLevel, seed: number): string {
  const stronger = [
    "Na tabela estão acima ou com melhor média de pontos: organização máxima, paciência e aproveitamento cirúrgico dos momentos a teu favor.",
    "Contexto desfavorável no ‘papel’: madurez colectiva, poucos erros forçados e leitura fria nos lances decisivos.",
    "Leitura de força adversária: não persigas o jogo caótico; força-os a jogar de lado e castiga transições bem escolhidas.",
    "Indicadores apontam para adversário forte: disciplina táctica e gestão emocional do resultado.",
    "No confronto directo de classificação, eles levam vantagem numérica na tabela — exige eficácia e pouca folga defensiva.",
  ];
  const weaker = [
    "Nos números da competição, tens margem para impor ritmo e domínio emocional — resolve situações sem dar oxigénio ao adversário.",
    "Leitura favorável na tabela ou nos pontos por jogo: intensidade, claridade e capacidade de feitar o jogo.",
    "Contexto que te permite assumir mais iniciativa — sem confiança desmedida nem jogo de ida-e-volta inconsciente.",
    "Indicadores a teu favor: força o teu modelo, mas respeita o momento em que o adversário possa arriscar tudo.",
    "Vantagem no ‘papel’: traduz em golos e não regales esperança com erros individuais.",
  ];
  const similar = [
    "Forças parecidas no que a tabela e as médias mostram: ganham-se detalhes, segunda bola e a primeira meia hora.",
    "Encontro equilibrado nos indicadores: consistência e personalidade fazem a diferença.",
    "Nada está decidido antes do apito: o jogo pede concentração e adaptação ao que o adversário permitir.",
    "Classificação e forma próximas: o resultado pode nascer de bola parada ou de um lance de segunda jogada.",
    "Equilíbrio relativo: evita o erro forçado e procura superioridade nas transições.",
  ];
  switch (level) {
    case "opponent_stronger":
      return pickVariant(stronger, seed, 2000);
    case "opponent_weaker":
      return pickVariant(weaker, seed, 2100);
    default:
      return pickVariant(similar, seed, 2200);
  }
}

export function buildHowWeShouldApproachNarrative(
  ctx: OpponentProfileContext,
  fixture: MatchFixture,
  us: { gpg: number; gcpg: number; n: number }
): string {
  const seed = ctx.narrativeSeed;
  const weHome = venueOur(fixture) === "home";
  const bucket = rankBucket(ctx.oppRank, ctx.totalTeams);
  const chunks: string[] = [];

  const openerPool = weHome ? APPROACH_OPENERS_WE_HOME : APPROACH_OPENERS_WE_AWAY;
  chunks.push(fillApproachUs(pickVariant(openerPool, seed, 101), ctx, us));

  let i = 0;
  for (const a of ctx.archetypes.slice(0, 3)) {
    const line = approachArchetypeLine(a, ctx, bucket, seed, i);
    if (line.trim()) chunks.push(line);
    i += 1;
  }

  chunks.push(relativeLevelChunk(ctx.relativeLevel, seed));

  chunks.push(weHome ? pickVariant(VENUE_US_HOME, seed, 108) : pickVariant(VENUE_US_AWAY, seed, 109));

  chunks.push(pickVariant(TACTIC_CLOSE_APPROACH, seed, 112));

  return dedupeSentences(chunks.join(" "));
}

export function buildHowWeExpectOpponentNarrative(ctx: OpponentProfileContext, fixture: MatchFixture): string {
  const seed = ctx.narrativeSeed;
  const oppVenue: ExpectVenue = opponentPlaysAway(fixture) ? "away" : "home";
  const bucket = rankBucket(ctx.oppRank, ctx.totalTeams);
  const parts: string[] = [];

  const venueNote = opponentPlaysAway(fixture)
    ? pickVariant(
        [
          "Neste jogo disputam fora do seu reduto — antecipa o comportamento típico de visitante.",
          "Condição de visitantes: o factor casa não está do lado deles; lê bem o arranque.",
          "Jogam como equipa visitante: menos tempo com bola em alguns momentos, mais gestão do risco.",
        ],
        seed,
        300
      )
    : pickVariant(
        [
          "Neste jogo atuam em casa, com o apoio e o factor estádio a favor.",
          "No próprio terreno: mais iniciativa e pressão em determinados momentos.",
          "Condição de anfitriões: procuram impor o seu ritmo e explorar o último terço.",
        ],
        seed,
        301
      );

  parts.push(fillNarrativeTemplate(pickVariant(EXPECT_OPENERS, seed, 302), ctx) + " " + venueNote);

  let j = 0;
  for (const a of ctx.archetypes.slice(0, 3)) {
    const line = expectArchetypeLine(a, ctx, oppVenue, bucket, seed, j);
    if (line.trim()) parts.push(line);
    j += 1;
  }

  parts.push(pickVariant(TACTIC_CLOSE_EXPECT, seed ^ 0xcafebabe, 303));

  return dedupeSentences(parts.join(" "));
}

function dedupeSentences(text: string): string {
  const split = text.split(/(?<=[.!?])\s+/);
  const parts = split.map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.slice(0, 88);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(" ");
}
