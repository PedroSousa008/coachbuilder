import type { PresidentClubState } from "@/types/president-club";

export type PresidentDashboardKpis = {
  activeCoaches: number;
  totalPlayers: number;
  topTalents: number;
  monthlyIncomeEUR: number;
  monthlyExpenseEUR: number;
  netEUR: number;
  pendingPaymentsEUR: number;
  overduePaymentsEUR: number;
  activeSponsorsEUR: number;
  potentialSponsorsEUR: number;
  injuredPlayers: number;
  disciplineOpen: number;
  operationsThisWeek: number;
};

export type PresidentChartPoint = { label: string; value: number };

/** Últimos 6 meses (YYYY-MM) com totais de receita/despesa agregados por mês. */
export function buildFinanceChart(state: PresidentClubState): { income: PresidentChartPoint[]; expense: PresidentChartPoint[] } {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const income = labels.map((ym) => {
    const v = state.financeMovements
      .filter((m) => m.kind === "income" && m.date.startsWith(ym))
      .reduce((s, m) => s + m.amountEUR, 0);
    return { label: ym, value: v };
  });
  const expense = labels.map((ym) => {
    const v = state.financeMovements
      .filter((m) => m.kind === "expense" && m.date.startsWith(ym))
      .reduce((s, m) => s + m.amountEUR, 0);
    return { label: ym, value: v };
  });
  return { income, expense };
}

export function computePresidentDashboardKpis(state: PresidentClubState): PresidentDashboardKpis {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyIncomeEUR = state.financeMovements
    .filter((m) => m.kind === "income" && m.date.startsWith(ym))
    .reduce((s, m) => s + m.amountEUR, 0);
  const monthlyExpenseEUR = state.financeMovements
    .filter((m) => m.kind === "expense" && m.date.startsWith(ym))
    .reduce((s, m) => s + m.amountEUR, 0);

  const pendingPaymentsEUR = state.payments
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + p.amountEUR, 0);
  const overduePaymentsEUR = state.payments
    .filter((p) => p.status === "atrasado")
    .reduce((s, p) => s + p.amountEUR, 0);

  const activeSponsorsEUR = state.sponsors
    .filter((s) => s.pipelineStage === "ativo")
    .reduce((s, x) => s + x.contractValueEUR, 0);
  const potentialSponsorsEUR = state.sponsors
    .filter((s) => s.pipelineStage === "potencial" || s.pipelineStage === "negociação")
    .reduce((s, x) => s + x.contractValueEUR, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromIso = thirtyDaysAgo.toISOString().slice(0, 10);

  return {
    activeCoaches: state.coaches.length,
    totalPlayers: state.players.length,
    topTalents: state.players.filter((p) => p.isTopTalent).length,
    monthlyIncomeEUR,
    monthlyExpenseEUR,
    netEUR: monthlyIncomeEUR - monthlyExpenseEUR,
    pendingPaymentsEUR,
    overduePaymentsEUR,
    activeSponsorsEUR,
    potentialSponsorsEUR,
    injuredPlayers: state.injuries.length,
    disciplineOpen: state.disciplineIncidents.length,
    operationsThisWeek: state.operationsEvents.filter((e) => e.start >= fromIso).length,
  };
}

export function presidentUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
