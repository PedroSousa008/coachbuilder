import type {
  DrillCategory,
  Player,
  SketchCalendarEvent,
  SketchFileEntry,
  SketchStaffNote,
  SketchTask,
  Tactic,
  TacticMatch,
  TrainingSession,
} from "@/types";
import type { TrainingCatalogItem } from "@/lib/training-session-local";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { buildCoachNotesLineupSynthesisPt } from "@/lib/coach-notes-lineup-synthesis";

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
  /** Ex.: «março de 2026» */
  periodMonthLabel: string;
  players: Player[];
  /** Táticas guardadas — para cruzar com a nota do treinador (11, posições). */
  savedTactics: Tactic[];
  tacticMatches: TacticMatch[];
  trainingSessionsInPeriod: TrainingSession[];
  /** Notas opcionais do treinador sobre treinos no período do relatório (peso complementar). */
  coachTrainingNotes: string;
  /** Notas gerais livres do treinador antes de gerar. */
  coachGeneralNotes: string;
  sketchNotesInPeriod: SketchStaffNote[];
  sketchEventsInPeriod: SketchCalendarEvent[];
  sketchTasksTouchingPeriod: SketchTask[];
  sketchFilesInPeriod: SketchFileEntry[];
  pastReportSnippetsInMonth: { title: string; excerpt: string; at: string }[];
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
  trainingSessionsInPeriod: TrainingSession[];
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

function ymdInRange(iso: string, start: string, end: string): boolean {
  try {
    const d = calendarDayLisbon(iso);
    return d.length >= 10 && d >= start && d <= end;
  } catch {
    const d = iso.slice(0, 10);
    return d.length >= 10 && d >= start && d <= end;
  }
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

/** Notas da Sketch que parecem relatórios guardados e foram actualizadas dentro do intervalo do relatório. */
export function collectPastReportSnippetsInMonth(
  notes: SketchStaffNote[],
  periodStart: string,
  periodEnd: string
): { title: string; excerpt: string; at: string }[] {
  const isReportLike = (n: SketchStaffNote) =>
    /relatório/i.test(n.title) ||
    /\bRELATÓRIO\b/.test(n.body) ||
    n.body.includes("Relatório semanal") ||
    n.body.includes("Relatório mensal") ||
    n.body.includes("RELATÓRIO SEMANAL") ||
    n.body.includes("RELATÓRIO MENSAL");
  return notes
    .filter((n) => {
      if (!isReportLike(n)) return false;
      const at = calendarDayLisbon(n.updatedAt);
      return at >= periodStart && at <= periodEnd;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
    .map((n) => ({
      title: n.title.trim() || "(sem título)",
      excerpt: n.body.replace(/\s+/g, " ").trim().slice(0, 220),
      at: calendarDayLisbon(n.updatedAt),
    }));
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
    trainingSessionsInPeriod: input.trainingSessionsInPeriod,
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

/** Relatório em texto puro (pt-PT), só com base nos dados agregados. */
export function renderWeeklyReportText(data: WeeklyReportData, input: WeeklyReportInput): string {
  const {
    players,
    coachTrainingNotes,
    coachGeneralNotes,
    sketchNotesInPeriod,
    sketchEventsInPeriod,
    sketchTasksTouchingPeriod,
    sketchFilesInPeriod,
    pastReportSnippetsInMonth,
  } = input;
  const t = data.teamTotals;
  const p = data.prevTeamTotals;
  const lines: string[] = [];

  lines.push("RELATÓRIO INTELIGENTE — ÚLTIMOS 30 DIAS");
  lines.push(`Período: ${data.label}.`);
  lines.push(
    "Jogos: contam-se só os registos em Táticas cuja data do jogo cai neste intervalo — em cada jogo, usa a tática certa e a data em que foi disputado."
  );
  lines.push(
    "Ponderação: dados de jogos são a base principal; Sketch Area e treinos na app entram como complemento."
  );
  lines.push("");

  lines.push("🧠 1. Resumo geral do período");
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
  lines.push("Sketch Area (últimos 30 dias, mesma janela):");
  const tasksCompletedInMonth = sketchTasksTouchingPeriod.filter(
    (x) => x.completed && x.completedAt && ymdInRange(x.completedAt, data.periodStart, data.periodEnd)
  );
  const tasksOpenDueInMonth = sketchTasksTouchingPeriod.filter(
    (x) => !x.completed && x.dueDate && ymdInRange(x.dueDate, data.periodStart, data.periodEnd)
  );
  const sketchHasAnything =
    sketchNotesInPeriod.length > 0 ||
    sketchEventsInPeriod.length > 0 ||
    sketchFilesInPeriod.length > 0 ||
    tasksCompletedInMonth.length > 0 ||
    tasksOpenDueInMonth.length > 0 ||
    pastReportSnippetsInMonth.length > 0;
  if (!sketchHasAnything) {
    lines.push("Sem notas, eventos de calendário, ficheiros, tarefas (concluídas ou com prazo na janela) nem relatórios guardados identificáveis na Sketch neste intervalo.");
  }
  if (sketchNotesInPeriod.length > 0) {
    lines.push(
      `Notas (${sketchNotesInPeriod.length}): ${sketchNotesInPeriod
        .slice(0, 8)
        .map((n) => (n.title.trim() || "(sem título)").replace(/\s+/g, " "))
        .join("; ")}${sketchNotesInPeriod.length > 8 ? "…" : ""}.`
    );
  }
  if (sketchEventsInPeriod.length > 0) {
    lines.push(
      `Calendário (${sketchEventsInPeriod.length} eventos): ${sketchEventsInPeriod
        .slice(0, 6)
        .map((e) => `${e.title.replace(/\s+/g, " ")} (${e.date})`)
        .join("; ")}${sketchEventsInPeriod.length > 6 ? "…" : ""}.`
    );
  }
  if (tasksCompletedInMonth.length > 0) {
    lines.push(
      `Tarefas concluídas (${tasksCompletedInMonth.length}): ${tasksCompletedInMonth
        .slice(0, 6)
        .map((x) => x.title.replace(/\s+/g, " "))
        .join("; ")}${tasksCompletedInMonth.length > 6 ? "…" : ""}.`
    );
  }
  if (tasksOpenDueInMonth.length > 0) {
    lines.push(
      `Tarefas ainda em aberto com prazo nesta janela (${tasksOpenDueInMonth.length}): ${tasksOpenDueInMonth
        .slice(0, 5)
        .map((x) => `${x.title.replace(/\s+/g, " ")} (até ${x.dueDate})`)
        .join("; ")}${tasksOpenDueInMonth.length > 5 ? "…" : ""}.`
    );
  }
  if (sketchFilesInPeriod.length > 0) {
    lines.push(
      `Ficheiros adicionados à Sketch (${sketchFilesInPeriod.length}): ${sketchFilesInPeriod
        .slice(0, 6)
        .map((f) => f.name.replace(/\s+/g, " "))
        .join("; ")}${sketchFilesInPeriod.length > 6 ? "…" : ""}.`
    );
  }
  if (pastReportSnippetsInMonth.length > 0) {
    lines.push("Relatórios de texto guardados na Sketch (referência cruzada):");
    for (const s of pastReportSnippetsInMonth) {
      const tail = s.excerpt.length >= 220 ? "…" : "";
      lines.push(`• ${s.at} — ${s.title}: ${s.excerpt}${tail}`);
    }
  } else if (sketchHasAnything) {
    lines.push(
      "Relatórios guardados: nenhum identificado nesta janela (título ou corpo com «relatório» nas notas da Sketch — podes usar essa convenção para arquivo)."
    );
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
  const sessions = data.trainingSessionsInPeriod;
  const lineupSynthesis = buildCoachNotesLineupSynthesisPt({
    coachTrainingNotes,
    coachGeneralNotes,
    players,
    savedTactics: input.savedTactics,
    tacticMatches: input.tacticMatches,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    trainingSessionsInPeriod: sessions,
  });
  const hasBlock5Body =
    sessions.length > 0 || coachTrainingNotes.trim().length > 0 || lineupSynthesis.trim().length > 0;
  if (!hasBlock5Body) {
    lines.push("Sem notas de treino introduzidas e sem sessões de treino datadas nesta janela na app — bloco opcional em branco.");
  } else {
    if (sessions.length > 0) {
      lines.push(
        `Sessões registadas na app nesta janela (${sessions.length}): ${sessions.map((s) => `${s.title} (${s.date}, ${s.durationMin} min, intensidade ${s.intensity})`).join("; ")}.`
      );
    }
    if (coachTrainingNotes.trim()) {
      lines.push("Notas do treinador sobre treinos (período do relatório):");
      lines.push(coachTrainingNotes.trim());
    } else if (coachGeneralNotes.trim() && lineupSynthesis.trim()) {
      lines.push(
        "(Sem notas específicas de treino neste campo — a síntese abaixo usa também as notas gerais no final do relatório.)"
      );
    }
    if (lineupSynthesis.trim()) {
      lines.push("");
      lines.push(lineupSynthesis);
    }
    lines.push(
      "Interpretação: a síntese acima cruza o teu texto com dados estruturados (jogos do período, tática mais usada, lugares no 11, pares na mesma função). Não prova causalidade treino→resultado nem substitui o teu juízo."
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
    if (data.gamesInPeriodCount >= 10) {
      recs.push("Gestão de carga: muitos jogos nestes 30 dias — priorizar recuperação e treinos de baixa/média intensidade pontuais.");
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

  const games = data.gamesInPeriodCount;
  const intensity: TrainingSession["intensity"] = games >= 9 ? "low" : games <= 3 ? "high" : "medium";

  const lines: string[] = [];
  lines.push("PLANO DE TREINO GERADO AUTOMATICAMENTE");
  lines.push(`Com base no relatório dos últimos 30 dias (${data.label}). Foco inferido: ${focus}.`);
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
