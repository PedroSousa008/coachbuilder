/** Score 0–100 para cartões do Mercado de Transferências (heurística interna). */
export function coachBuilderPerformanceScore(args: {
  winPct: number;
  honorCount: number;
  loginCount: number;
  accountAgeDays: number;
}): number {
  const win = Math.min(100, Math.max(0, Number.isFinite(args.winPct) ? args.winPct : 0));
  const trophies = Math.min(100, Math.max(0, args.honorCount) * 12);
  const days = Math.max(0, Number.isFinite(args.accountAgeDays) ? args.accountAgeDays : 0);
  const appSignal = Math.log10((Math.max(0, args.loginCount) + 1) * 5) * 22 + Math.min(25, days / 14);
  const app = Math.min(100, Math.max(0, appSignal));
  return Math.round(win * 0.45 + trophies * 0.25 + app * 0.3);
}
