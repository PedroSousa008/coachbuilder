import type { PresidentClubState } from "@/types/president-club";
import { paymentEffectiveEUR, QUOTA_INCOME_FINANCE_CATEGORY } from "@/lib/president-finance";

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

/** Receita de quotas cobradas num mês (YYYY-MM), alinhada com o módulo Finanças. */
export function monthlyCollectedQuotasEUR(state: PresidentClubState, ymPrefix: string): number {
  return state.payments
    .filter((p) => !p.archived && p.status === "pago" && p.lastPaidAt && p.lastPaidAt.startsWith(ymPrefix))
    .reduce((s, p) => s + paymentEffectiveEUR(p), 0);
}

/**
 * Receitas «outras» (movimentos manuais / não-quota) no mês.
 * Movimentos com categoria de quotas são ignorados aqui porque o total de quotas
 * vem sempre de `monthlyCollectedQuotasEUR` (fonte única com o painel de quotas).
 */
export function monthlyNonQuotaIncomeEUR(state: PresidentClubState, ymPrefix: string): number {
  return state.financeMovements
    .filter(
      (m) =>
        m.kind === "income" &&
        m.date.startsWith(ymPrefix) &&
        m.category.trim() !== QUOTA_INCOME_FINANCE_CATEGORY
    )
    .reduce((s, m) => s + m.amountEUR, 0);
}

export function monthlyConsolidatedIncomeEUR(state: PresidentClubState, ymPrefix: string): number {
  return monthlyNonQuotaIncomeEUR(state, ymPrefix) + monthlyCollectedQuotasEUR(state, ymPrefix);
}

/** Últimos 6 meses (YYYY-MM) com totais de receita/despesa agregados por mês. */
export function buildFinanceChart(state: PresidentClubState): { income: PresidentChartPoint[]; expense: PresidentChartPoint[] } {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const income = labels.map((ym) => {
    const v = monthlyConsolidatedIncomeEUR(state, ym);
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
  const activePay = state.payments.filter((p) => !p.archived);
  const monthlyIncomeEUR = monthlyConsolidatedIncomeEUR(state, ym);
  const monthlyExpenseEUR = state.financeMovements
    .filter((m) => m.kind === "expense" && m.date.startsWith(ym))
    .reduce((s, m) => s + m.amountEUR, 0);

  const pendingPaymentsEUR = activePay
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + paymentEffectiveEUR(p), 0);
  const overduePaymentsEUR = activePay
    .filter((p) => p.status === "atrasado")
    .reduce((s, p) => s + paymentEffectiveEUR(p), 0);

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
    injuredPlayers: state.injuries.filter((i) => i.status !== "plenas_condicoes").length,
    disciplineOpen: state.disciplineIncidents.length,
    operationsThisWeek: state.operationsEvents.filter((e) => e.start >= fromIso).length,
  };
}

export function presidentUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
