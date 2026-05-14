import type { Player, TacticMatch } from "@/types";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { matchOutcomeForStats } from "@/lib/tactics-match-stats";

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
  periodStart: string;
  periodEnd: string;
  /** Ex.: «Últimos 30 dias» */
  periodMonthLabel: string;
  players: Player[];
  tacticMatches: TacticMatch[];
};

export type WeeklyReportData = {
  label: string;
  periodStart: string;
  periodEnd: string;
  periodMonthLabel: string;
  matches: WeeklyReportMatchAgg[];
  prevPeriodMatches: WeeklyReportMatchAgg[];
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
  gamesInPeriodCount: number;
};

/**
 * Dia do jogo tal como guardado no registo da tática (`TacticMatch.date`).
 * Cada jogo deve estar associado à tática usada; o relatório filtra só por esta data (Europe/Lisbon).
 */
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

/** Número de dias corridos na janela do relatório Sketch (inclui início e fim). */
export const SKETCH_REPORT_ROLLING_DAYS = 30;

/**
 * Janela móvel dos últimos N dias terminando em `anchorYmd` (Europe/Lisbon).
 * Por defeito N=30: o fim é o dia de referência (hoje, se for esse o ancor), o início é 29 dias antes.
 */
export function lisbonRollingDaysEnding(
  anchorYmd: string,
  days: number = SKETCH_REPORT_ROLLING_DAYS
): { start: string; end: string; label: string } {
  let end: string;
  try {
    end = calendarDayLisbon(anchorYmd);
  } catch {
    end = anchorYmd.slice(0, 10);
  }
  const span = Math.max(1, days);
  const start = addDaysYmd(end, -(span - 1));
  return {
    start,
    end,
    label: span === SKETCH_REPORT_ROLLING_DAYS ? "Últimos 30 dias" : `Últimos ${span} dias`,
  };
}

/** @deprecated Preferir `lisbonRollingDaysEnding` (janela móvel). Mantido por compatibilidade. */
export function lisbonReportMonthBeforeAnchorsMonth(anchorYmd: string): { start: string; end: string; label: string } {
  const [y, m] = anchorYmd.split("-").map((x) => parseInt(x, 10));
  const startMs = Date.UTC(y, m - 2, 1);
  const endMs = Date.UTC(y, m - 1, 0);
  const start = calendarDayLisbon(startMs);
  const end = calendarDayLisbon(endMs);
  const rawLabel = new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date(startMs));
  const label = rawLabel.length ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) : `${start.slice(0, 7)}`;
  return { start, end, label };
}

/** Os `days` dias de calendário imediatamente anteriores à janela que começa em `currentWindowStart`. */
function previousAdjacentRollingWindow(currentWindowStart: string, days: number): { start: string; end: string } {
  const prevEnd = addDaysYmd(currentWindowStart, -1);
  const prevStart = addDaysYmd(currentWindowStart, -days);
  return { start: prevStart, end: prevEnd };
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
    outcome: matchOutcomeForStats(m),
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
      const o = matchOutcomeForStats(m);
      if (o === "win") row.wins += 1;
      else if (o === "draw") row.draws += 1;
      else row.losses += 1;
      byId.set(line.playerId, row);
    }
  }
  return [...byId.values()];
}

export function buildWeeklyReportData(input: WeeklyReportInput): WeeklyReportData {
  const { periodStart, periodEnd } = input;
  const periodMatches = input.tacticMatches.filter((m) => inRangeInclusive(ymdKeyFromMatch(m), periodStart, periodEnd));
  const { start: prevStart, end: prevEnd } = previousAdjacentRollingWindow(periodStart, SKETCH_REPORT_ROLLING_DAYS);
  const prevPeriodMatches = input.tacticMatches.filter((m) => inRangeInclusive(ymdKeyFromMatch(m), prevStart, prevEnd));

  const matches = summarizeMatches(periodMatches);
  const prevSummaries = summarizeMatches(prevPeriodMatches);

  return {
    label: `${input.periodMonthLabel} (${periodStart} a ${periodEnd})`,
    periodMonthLabel: input.periodMonthLabel,
    periodStart,
    periodEnd,
    matches,
    prevPeriodMatches: prevSummaries,
    teamTotals: teamTotalsFromMatches(matches),
    prevTeamTotals: teamTotalsFromMatches(prevSummaries),
    playerAggs: aggregatePlayers(periodMatches),
    gamesInPeriodCount: matches.length,
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

/** Relatório em texto puro (pt-PT), só com base nos dados agregados dos jogos em táticas. */
export function renderWeeklyReportText(data: WeeklyReportData, input: WeeklyReportInput): string {
  const { players } = input;
  const t = data.teamTotals;
  const p = data.prevTeamTotals;
  const lines: string[] = [];

  lines.push("RELATÓRIO — ÚLTIMOS 30 DIAS");
  lines.push(`Período: ${data.label}.`);
  lines.push(
    "Fonte: registos em Táticas — em cada jogo, a data usada é a do próprio registo (dia em que foi disputado), com a tática associada."
  );
  lines.push("");

  lines.push("1. Resumo geral do período");
  if (t.games === 0) {
    lines.push("Não há jogos com estatísticas registadas neste intervalo nas táticas. Adiciona jogos com data correcta e linhas de jogadores para alimentar o relatório.");
  } else {
    lines.push(`Resultados: ${t.wins} vitórias, ${t.draws} empates, ${t.losses} derrotas (${t.games} jogos).`);
    lines.push(`Golos: ${t.goalsFor} marcados, ${t.goalsAgainst} sofridos (média ${(t.goalsFor / t.games).toFixed(2)} / ${(t.goalsAgainst / t.games).toFixed(2)} por jogo).`);
    if (p.games > 0) {
      const gd = t.goalsFor - t.goalsAgainst;
      const pgd = p.goalsFor - p.goalsAgainst;
      if (t.wins > p.wins) {
        lines.push(`Tendência vs os 30 dias anteriores: mais vitórias (${t.wins} nesta janela, ${p.wins} na anterior).`);
      } else if (t.wins < p.wins) {
        lines.push(`Tendência vs os 30 dias anteriores: menos vitórias (${t.wins} nesta janela, ${p.wins} na anterior).`);
      } else lines.push(`Vitórias iguais entre as duas janelas de 30 dias (${t.wins}).`);
      if (gd > pgd) lines.push(`Saldo de golos melhor que nos 30 dias anteriores (${gd} vs ${pgd}).`);
      else if (gd < pgd) lines.push(`Saldo de golos pior que nos 30 dias anteriores (${gd} vs ${pgd}).`);
      else lines.push(`Saldo de golos igual ao dos 30 dias anteriores (${gd}).`);
    } else {
      lines.push("Sem jogos nos 30 dias imediatamente anteriores a este período para comparar tendência.");
    }
    if (t.losses > t.wins && t.games >= 2) {
      lines.push("Diagnóstico: mais derrotas que vitórias nesta janela — rever equilíbrio ofensivo/defensivo com base nos números abaixo.");
    } else if (t.wins > t.losses && t.games >= 2) {
      lines.push("Diagnóstico: janela positiva em resultados; manter consistência e gestão de carga.");
    } else if (t.games === 1) {
      lines.push("Diagnóstico: apenas um jogo no período — evita conclusões largas; usa os blocos seguintes como foco.");
    } else {
      lines.push("Diagnóstico: resultados equilibrados no período; afinar detalhe nas áreas ofensiva e defensiva.");
    }
  }

  lines.push("");

  lines.push("2. Análise ofensiva");
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

  lines.push("3. Análise defensiva");
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

  lines.push("4. Destaques individuais");
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

  lines.push("5. Alertas importantes");
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
    const gamesInMonth = data.gamesInPeriodCount;
    const lowMin = [...data.playerAggs]
      .filter((x) => x.games >= 1 && x.minutes < 45)
      .sort((a, b) => a.minutes - b.minutes);
    if (gamesInMonth >= 6 && lowMin.length > 0) {
      lines.push(
        `Com ${gamesInMonth} jogos nesta janela de 30 dias, jogadores com menos de 45 min totais no período: ${formatList(lowMin.map((x) => playerName(players, x.playerId)))}.`
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

  return lines.join("\n");
}
