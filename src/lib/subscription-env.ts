/** Preço público Coach Pro (€/mês). ADMIN_PRO_MONTHLY_PRICE_EUR mantém compatibilidade. */
export function coachProDefaultPriceEur(): number {
  const raw =
    (typeof process.env.COACH_PRO_MONTHLY_PRICE_EUR === "string" && process.env.COACH_PRO_MONTHLY_PRICE_EUR.trim()) ||
    (typeof process.env.ADMIN_PRO_MONTHLY_PRICE_EUR === "string" && process.env.ADMIN_PRO_MONTHLY_PRICE_EUR.trim()) ||
    "6.99";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 6.99;
}
