import type { DrillCategory, Player, TacticMatch, TrainingSession } from "@/types";
import type { TrainingCatalogItem } from "@/lib/training-session-local";
import { calendarDayLisbon } from "@/lib/lisbon-date";

export type WeeklyReportMatchAgg = {
  id: string;
  date: string;
  opponent: string;
  outcome: TacticMatch["outcome"];
  teamGoals: number;
  opponentGoals: number;
};

export type WeeklyReportPlayerAgg = {
  playerId: string;
  games: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
  wins: number;
  draws: number;
  losses: number;
};

export type WeeklyReportInput = {
  weekStart: string;
  weekEnd: string;
  players: Player[];
  tacticMatches: TacticMatch[];
  trainingSessionsInWeek: TrainingSession[];
  /** Notas opcionais do treinador sobre treinos da semana (peso complementar). */
  coachTrainingNotes: string;
  /** Notas gerais livres do treinador antes de gerar. */
  coachGeneralNotes: string;
};

export type WeeklyReportData = {
  label: string;
  weekStart: string;
  weekEnd: string;
  matches: WeeklyReportMatchAgg[];
  prevWeekMatches: WeeklyReportMatchAgg[];
  teamTotals: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  prevTeamTotals: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  playerAggs: WeeklyReportPlayerAgg[];
  trainingSessionsInWeek: TrainingSession[];
  gamesInWeekCount: number;
};

function ymdKeyFromMatch(m: TacticMatch): string {
  const raw = (m.date ?? "").trim();
  if (!raw) return "";
  try {
    return calendarDayLisbon(raw);
  } catch {
    return raw.slice(0, 10);
  }
}

function inRangeInclusive(day: string, start: string, end: string): boolean {
  if (!day || day.length < 10) return false;
  return day >= start && day <= end;
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd;
  const u = Date.UTC(y, m - 1, d + delta);
  return calendarDayLisbon(u);
}

/** Semana segunda–domingo (Europe/Lisbon) que contém o dia `anchorYmd` (YYYY-MM-DD). */
export function lisbonWeekRangeContaining(anchorYmd: string): { start: string; end: string } {
  const [y, m, d] = anchorYmd.split("-").map((x) => parseInt(x, 10));
  const refMs = Date.UTC(y, m - 1, d, 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", weekday: "short" }).format(refMs);
  const short = wd.slice(0, 3);
  const mondayOffset: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const off = mondayOffset[short] ?? 0;
  const dayInLisbon = calendarDayLisbon(refMs);
  const start = addDaysYmd(dayInLisbon, -off);
  const end = addDaysYmd(start, 6);
  return { start, end };
}

function summarizeMatches(matches: TacticMatch[]): WeeklyReportMatchAgg[] {
  return matches.map((m) => ({
    id: m.id,
    date: ymdKeyFromMatch(m),
    opponent: m.opponent,
    outcome: m.outcome,
    teamGoals: m.teamGoals,
    opponentGoals: m.opponentGoals,
  }));
}

function teamTotalsFromMatches(matches: WeeklyReportMatchAgg[]) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const m of matches) {
    if (m.outcome === "win") wins += 1;
    else if (m.outcome === "draw") draws += 1;
    else losses += 1;
    goalsFor += m.teamGoals;
    goalsAgainst += m.opponentGoals;
  }
  return {
    games: matches.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
  };
}

function aggregatePlayers(matches: TacticMatch[]): WeeklyReportPlayerAgg[] {
  const byId = new Map<string, WeeklyReportPlayerAgg>();
  for (const m of matches) {
    for (const line of m.playerStats) {
      const row =
        byId.get(line.playerId) ??
        ({
          playerId: line.playerId,
          games: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutes: 0,
          wins: 0,
          draws: 0,
          losses: 0,
        } satisfies WeeklyReportPlayerAgg);
      row.games += 1;
      row.goals += line.goals;
      row.assists += line.assists;
      row.yellowCards += line.yellowCards;
      row.redCards += line.redCards;
      row.minutes += line.minutesPlayed;
      if (m.outcome === "win") row.wins += 1;
      else if (m.outcome === "draw") row.draws += 1;
      else row.losses += 1;
      byId.set(line.playerId, row);
    }
  }
  return [...byId.values()];
}

export function buildWeeklyReportData(input: WeeklyReportInput): WeeklyReportData {
  const { weekStart, weekEnd } = input;
  const weekMatches = input.tacticMatches.filter((m) => inRangeInclusive(ymdKeyFromMatch(m), weekStart, weekEnd));
  const prevEnd = addDaysYmd(weekStart, -1);
  const prevStart = addDaysYmd(weekStart, -7);
  const prevWeekMatches = input.tacticMatches.filter((m) => inRangeInclusive(ymdKeyFromMatch(m), prevStart, prevEnd));

  const matches = summarizeMatches(weekMatches);
  const prevSummaries = summarizeMatches(prevWeekMatches);

  return {
    label: `${weekStart} a ${weekEnd}`,
    weekStart,
    weekEnd,
    matches,
    prevWeekMatches: prevSummaries,
    teamTotals: teamTotalsFromMatches(matches),
    prevTeamTotals: teamTotalsFromMatches(prevSummaries),
    playerAggs: aggregatePlayers(weekMatches),
    trainingSessionsInWeek: input.trainingSessionsInWeek,
    gamesInWeekCount: matches.length,
  };
}

function playerName(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

function cumulativeYellowsByPlayer(matches: TacticMatch[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of matches) {
    for (const line of g.playerStats) {
      m.set(line.playerId, (m.get(line.playerId) ?? 0) + line.yellowCards);
    }
  }
  return m;
}

function formatList(names: string[]): string {
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** Relatório em texto puro (pt-PT), só com base nos dados agregados. */
export function renderWeeklyReportText(data: WeeklyReportData, input: WeeklyReportInput): string {
  const { players, coachTrainingNotes, coachGeneralNotes } = input;
  const t = data.teamTotals;
  const p = data.prevTeamTotals;
  const lines: string[] = [];

  lines.push("RELATÓRIO SEMANAL INTELIGENTE");
  lines.push(`Período: ${data.label} (jogos registados nas táticas)`);
  lines.push("");

  lines.push("🧠 1. Resumo geral da semana");
  if (t.games === 0) {
    lines.push("Não há jogos com estatísticas registadas neste período nas táticas. Adiciona resultados e linhas de jogadores nos jogos para alimentar este relatório.");
  } else {
    lines.push(`Resultados: ${t.wins} vitórias, ${t.draws} empates, ${t.losses} derrotas (${t.games} jogos).`);
    lines.push(`Golos: ${t.goalsFor} marcados, ${t.goalsAgainst} sofridos (média ${(t.goalsFor / t.games).toFixed(2)} / ${(t.goalsAgainst / t.games).toFixed(2)} por jogo).`);
    if (p.games > 0) {
      const gd = t.goalsFor - t.goalsAgainst;
      const pgd = p.goalsFor - p.goalsAgainst;
      if (t.wins > p.wins) lines.push(`Tendência vs semana anterior: mais vitórias (${t.wins} agora, ${p.wins} antes).`);
      else if (t.wins < p.wins) lines.push(`Tendência vs semana anterior: menos vitórias (${t.wins} agora, ${p.wins} antes).`);
      else lines.push(`Vitórias iguais à semana anterior (${t.wins}).`);
      if (gd > pgd) lines.push(`Saldo de golos melhor que na semana anterior (${gd} vs ${pgd}).`);
      else if (gd < pgd) lines.push(`Saldo de golos pior que na semana anterior (${gd} vs ${pgd}).`);
      else lines.push(`Saldo de golos igual ao da semana anterior (${gd}).`);
    } else {
      lines.push("Sem jogos na semana anterior para comparar tendência.");
    }
    if (t.losses > t.wins && t.games >= 2) {
      lines.push("Diagnóstico: semana com mais derrotas que vitórias — rever equilíbrio ofensivo/defensivo com base nos números abaixo.");
    } else if (t.wins > t.losses && t.games >= 2) {
      lines.push("Diagnóstico: semana positiva em resultados; manter consistência e gestão de carga.");
    } else if (t.games === 1) {
      lines.push("Diagnóstico: apenas um jogo no período — evita conclusões largas; usa os blocos seguintes como foco.");
    } else {
      lines.push("Diagnóstico: resultados equilibrados no período; afinar detalhe nas áreas ofensiva e defensiva.");
    }
  }
  lines.push("");

  lines.push("⚽ 2. Análise ofensiva");
  if (t.games === 0) {
    lines.push("Sem dados de jogos.");
  } else {
    const scorers = [...data.playerAggs].filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
    const assisters = [...data.playerAggs].filter((x) => x.assists > 0).sort((a, b) => b.assists - a.assists);
    lines.push(`Golos da equipa no período: ${t.goalsFor}.`);
    if (scorers.length === 0) {
      lines.push("Nenhum golo atribuído a jogadores nas estatísticas dos jogos — confirma as linhas por jogador em cada jogo.");
    } else {
      lines.push(
        `Golos por jogador: ${scorers.map((s) => `${playerName(players, s.playerId)} (${s.goals})`).join(", ")}.`
      );
      const distinct = scorers.length;
      if (t.goalsFor >= 3 && distinct === 1) {
        lines.push("Padrão: concentração de golos num único jogador — trabalhar finalização e entradas de outros elementos.");
      } else if (distinct >= 3) {
        lines.push("Padrão: repartição de golos entre vários jogadores.");
      }
    }
    if (assisters.length > 0) {
      lines.push(
        `Assistências: ${assisters.map((s) => `${playerName(players, s.playerId)} (${s.assists})`).join(", ")}.`
      );
    } else if (t.goalsFor > 0) {
      lines.push("Sem assistências registadas nos jogos do período.");
    }
  }
  lines.push("");

  lines.push("🛡️ 3. Análise defensiva");
  if (t.games === 0) {
    lines.push("Sem dados de jogos.");
  } else {
    lines.push(`Golos sofridos: ${t.goalsAgainst} (${(t.goalsAgainst / t.games).toFixed(2)} por jogo).`);
    const heavyLosses = data.matches.filter((m) => m.opponentGoals >= 3);
    if (heavyLosses.length > 0) {
      lines.push(
        `Jogos com 3+ golos sofridos: ${heavyLosses.map((m) => `${m.opponent} (${m.opponentGoals}-${m.teamGoals})`).join("; ")}.`
      );
    } else {
      lines.push("Nenhum jogo com 3 ou mais golos sofridos registado neste período.");
    }
  }
  lines.push("");

  lines.push("📈 4. Destaques individuais");
  if (data.playerAggs.length === 0) {
    lines.push("Sem linhas de jogadores nos jogos do período.");
  } else {
    const score = (x: WeeklyReportPlayerAgg) => x.goals * 4 + x.assists * 2 + x.wins * 3 + x.minutes / 30;
    const top = [...data.playerAggs].sort((a, b) => score(b) - score(a)).slice(0, 3);
    lines.push(
      "Top 3 (ponderação objetiva: golos, assistências, vitórias em que participou, minutos):"
    );
    for (const row of top) {
      lines.push(
        `• ${playerName(players, row.playerId)} — ${row.goals} golos, ${row.assists} assistências, ${row.minutes} min, ${row.wins}V ${row.draws}E ${row.losses}D em ${row.games} jogos.`
      );
    }
    const low = [...data.playerAggs]
      .filter((x) => x.games >= 2)
      .sort((a, b) => score(a) - score(b))
      .slice(0, 2);
    if (low.length > 0) {
      lines.push("Quebra relativa (entre jogadores com 2+ jogos no período, menor pontuação na mesma fórmula):");
      for (const row of low) {
        lines.push(
          `• ${playerName(players, row.playerId)} — ${row.goals} golos, ${row.assists} assistências, ${row.minutes} min em ${row.games} jogos.`
        );
      }
    } else {
      lines.push("Menos de dois jogadores com 2+ jogos no período — não há comparação de quebra entre pares.");
    }
  }
  lines.push("");

  lines.push("🧪 5. Impacto dos treinos");
  const sessions = data.trainingSessionsInWeek;
  if (!coachTrainingNotes.trim() && sessions.length === 0) {
    lines.push("Sem notas de treino introduzidas e sem sessões de treino datadas nesta semana na app — bloco opcional em branco.");
  } else {
    if (sessions.length > 0) {
      lines.push(
        `Sessões registadas na app nesta semana (${sessions.length}): ${sessions.map((s) => `${s.title} (${s.date}, ${s.durationMin} min, intensidade ${s.intensity})`).join("; ")}.`
      );
    }
    if (coachTrainingNotes.trim()) {
      lines.push("Notas do treinador sobre a semana de treino:");
      lines.push(coachTrainingNotes.trim());
    }
    lines.push(
      "Interpretação: correlaciona manualmente estes dados com o bloco 1 — a app não infere causalidade entre treino e resultado sem registos estruturados."
    );
  }
  lines.push("");

  lines.push("🚨 6. Alertas importantes");
  if (data.playerAggs.length === 0) {
    lines.push("Sem estatísticas por jogador no período.");
  } else {
    const cards = [...data.playerAggs].filter((x) => x.yellowCards + x.redCards > 0).sort(
      (a, b) => b.yellowCards + b.redCards - (a.yellowCards + a.redCards)
    );
    if (cards.length > 0) {
      lines.push(
        `Cartões no período: ${cards.map((c) => `${playerName(players, c.playerId)} (${c.yellowCards}A${c.redCards > 0 ? `, ${c.redCards}V` : ""})`).join("; ")}.`
      );
    } else {
      lines.push("Sem cartões registados nas linhas dos jogadores neste período.");
    }
    const gamesThisWeek = data.gamesInWeekCount;
    const lowMin = [...data.playerAggs]
      .filter((x) => x.games >= 1 && x.minutes < 45)
      .sort((a, b) => a.minutes - b.minutes);
    if (gamesThisWeek >= 2 && lowMin.length > 0) {
      lines.push(
        `Com ${gamesThisWeek} jogos na semana, jogadores com menos de 45 min totais no período: ${formatList(lowMin.map((x) => playerName(players, x.playerId)))}.`
      );
    }
    const RISK_AMARELOS = new Set([4, 7, 10, 13, 16]);
    const cum = cumulativeYellowsByPlayer(input.tacticMatches);
    const atRisk = [...cum.entries()]
      .filter(([, y]) => RISK_AMARELOS.has(y))
      .sort((a, b) => b[1] - a[1]);
    if (atRisk.length > 0) {
      lines.push(
        `Acumulação de amarelos (todos os jogos nas táticas — limiares de risco 4, 7, 10, 13, 16): ${atRisk.map(([id, y]) => `${playerName(players, id)} (${y})`).join("; ")}.`
      );
    }
  }
  lines.push("");

  lines.push("🎯 7. Recomendações para o treinador");
  if (t.games === 0) {
    lines.push("Regista jogos nas táticas com estatísticas por jogador para obter recomendações objetivas.");
  } else {
    const recs: string[] = [];
    if (t.goalsAgainst / t.games > t.goalsFor / t.games) {
      recs.push("Prioridade tática: organização defensiva e transição defensiva (golos sofridos por jogo superiores aos marcados).");
    }
    if (t.goalsFor / t.games < 1.2 && t.games >= 2) {
      recs.push("Foco ofensivo: finalização e último terço (média de golos marcados baixa no período).");
    }
    const scorers = [...data.playerAggs].filter((x) => x.goals > 0);
    if (t.goalsFor >= 2 && scorers.length === 1) {
      recs.push("Rotação de referências no último terço: variar conclusores nos exercícios e no jogo.");
    }
    if (data.gamesInWeekCount >= 3) {
      recs.push("Gestão de carga: semana com muitos jogos — priorizar recuperação e treinos de baixa/média intensidade pontuais.");
    }
    if (recs.length === 0) {
      recs.push("Manter o plano com base nos números: equilíbrio entre continuidade e pequenos ajustes posicionais.");
    }
    recs.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  }
  lines.push("");

  lines.push("Notas gerais (treinador)");
  if (coachGeneralNotes.trim()) {
    lines.push(coachGeneralNotes.trim());
  } else {
    lines.push("—");
  }

  return lines.join("\n");
}

export type AutoPlanFocus = "finishing" | "defensive" | "transition" | "possession" | "physical" | "balanced";

export function inferFocusFromReport(data: WeeklyReportData): AutoPlanFocus {
  const t = data.teamTotals;
  if (t.games === 0) return "balanced";
  const gf = t.goalsFor / t.games;
  const ga = t.goalsAgainst / t.games;
  if (ga > gf + 0.5) return "defensive";
  if (gf < 1 && ga < 1.5) return "finishing";
  if (t.losses > t.wins && t.games >= 2) return "transition";
  if (gf >= 2 && ga >= 2) return "transition";
  return "balanced";
}

function catalogScoreForFocus(item: TrainingCatalogItem, focus: AutoPlanFocus): number {
  const cats = item.filterCategories;
  let s = 0;
  if (focus === "finishing") {
    if (cats.includes("finishing")) s += 4;
    if (cats.includes("transition")) s += 1;
  } else if (focus === "defensive") {
    if (cats.includes("defensive")) s += 4;
    if (cats.includes("pressing")) s += 2;
  } else if (focus === "transition") {
    if (cats.includes("transition")) s += 4;
    if (cats.includes("finishing")) s += 1;
  } else if (focus === "possession") {
    if (cats.includes("possession")) s += 4;
  } else if (focus === "physical") {
    if (cats.includes("physical")) s += 4;
  } else {
    s += 1;
  }
  return s;
}

/** Preferir exercícios cujo título aparece em sessões recentes (antes de vitórias). */
function boostFromRecentSessions(
  item: TrainingCatalogItem,
  sessions: TrainingSession[],
  winningMatchDates: Set<string>
): number {
  let bonus = 0;
  const title = item.title.toLowerCase();
  for (const s of sessions) {
    const blob = `${s.title} ${s.description}`.toLowerCase();
    if (!blob.includes(title.slice(0, Math.min(12, title.length)))) continue;
    const day = calendarDayLisbon(s.date);
    if (winningMatchDates.has(day)) bonus += 2;
    else bonus += 1;
  }
  return bonus;
}

export function buildAutoTrainingPlanText(
  data: WeeklyReportData,
  catalog: TrainingCatalogItem[],
  recentSessions: TrainingSession[],
  tacticMatches: TacticMatch[]
): { text: string; totalMin: number; intensity: TrainingSession["intensity"]; focus: AutoPlanFocus } {
  const focus = inferFocusFromReport(data);
  const warmup = catalog.find((c) => c.catalogId === "template:warmup");
  const cooldown = catalog.find((c) => c.catalogId === "template:cooldown");
  const mainsPool = catalog.filter((c) => c.catalogId.startsWith("main:"));

  const winningDates = new Set<string>();
  for (const m of tacticMatches) {
    if (m.outcome !== "win") continue;
    winningDates.add(ymdKeyFromMatch(m));
  }

  const scored = mainsPool.map((item) => ({
    item,
    score: catalogScoreForFocus(item, focus) + boostFromRecentSessions(item, recentSessions.slice(0, 12), winningDates),
  }));
  scored.sort((a, b) => b.score - a.score || b.item.durationMin - a.item.durationMin);
  const pick = scored.slice(0, 3).map((x) => x.item);

  const wDur = warmup?.durationMin ?? 10;
  const cDur = cooldown?.durationMin ?? 10;
  const mainDur = pick.reduce((s, x) => s + x.durationMin, 0);
  const totalMin = wDur + mainDur + cDur;

  const games = data.gamesInWeekCount;
  const intensity: TrainingSession["intensity"] = games >= 3 ? "low" : games <= 1 ? "high" : "medium";

  const lines: string[] = [];
  lines.push("PLANO DE TREINO GERADO AUTOMATICAMENTE");
  lines.push(`Com base no relatório da semana (${data.label}). Foco inferido: ${focus}.`);
  lines.push(`Duração total sugerida: ${totalMin} min. Intensidade sugerida: ${intensity}.`);
  lines.push("");
  lines.push("Aquecimento");
  if (warmup) {
    lines.push(`• ${warmup.title} — ${warmup.durationMin} min`);
    lines.push(`  ${warmup.brief}`);
  } else {
    lines.push("• Aquecimento com bola (catálogo) — 10 min");
  }
  lines.push("");
  lines.push("Parte principal");
  if (pick.length === 0) {
    lines.push("Sem seleção automática — verifica o catálogo.");
  } else {
    for (const m of pick) {
      lines.push(`• ${m.title} — ${m.durationMin} min`);
      lines.push(`  ${m.brief}`);
    }
  }
  lines.push("");
  lines.push("Alongamentos finais");
  if (cooldown) {
    lines.push(`• ${cooldown.title} — ${cooldown.durationMin} min`);
    lines.push(`  ${cooldown.brief}`);
  } else {
    lines.push("• Volta à calma — 10 min");
  }
  lines.push("");
  lines.push("Nota: exercícios retirados do catálogo local; prioridade relativa ao foco identificado e à recorrência em sessões recentes / jogos ganhos.");

  return { text: lines.join("\n"), totalMin, intensity, focus };
}

export function newSessionInputFromPlan(
  plan: { text: string; totalMin: number; intensity: TrainingSession["intensity"]; focus: AutoPlanFocus },
  dateYmd: string
): {
  title: string;
  date: string;
  durationMin: number;
  intensity: TrainingSession["intensity"];
  categories: DrillCategory[];
  description: string;
} {
  const categories: DrillCategory[] = [];
  if (plan.focus === "finishing") categories.push("Finishing");
  else if (plan.focus === "defensive") categories.push("Defensive shape", "Pressing");
  else if (plan.focus === "transition") categories.push("Finishing", "Pressing");
  else if (plan.focus === "possession") categories.push("Possession");
  else categories.push("Possession", "Finishing");

  return {
    title: `Sessão automática — ${plan.focus} (${dateYmd})`,
    date: dateYmd,
    durationMin: plan.totalMin,
    intensity: plan.intensity,
    categories: categories.length ? categories : ["Possession"],
    description: plan.text,
  };
}
