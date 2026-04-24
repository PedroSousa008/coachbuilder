/** URL pública da app (success/cancel do Checkout). */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

/** Price ID mensal Coach Pro (`price_...`). */
export function coachProStripePriceId(): string | null {
  const a = process.env.STRIPE_PRICE_ID_COACH_PRO?.trim();
  const b = process.env.STRIPE_COACH_PRO_PRICE_ID?.trim();
  return a || b || null;
}

/** Price ID de compra única de 1 lugar extra de treinador (`price_...`). */
export function presidentExtraSeatStripePriceId(): string | null {
  const a = process.env.STRIPE_PRICE_ID_PRESIDENT_EXTRA_SEAT?.trim();
  const b = process.env.STRIPE_PRESIDENT_EXTRA_SEAT_PRICE_ID?.trim();
  return a || b || null;
}
