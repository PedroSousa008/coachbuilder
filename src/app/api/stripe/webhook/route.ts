import { NextResponse } from "next/server";

/**
 * Webhook Stripe — placeholder.
 * Eventos típicos: invoice.payment_failed → plano grace + paymentGraceEndsAt + lastPaymentFailedAt;
 * invoice.paid → pro_monthly, limpar grace.
 */
export async function POST() {
  return NextResponse.json({ ok: true, received: true, note: "Webhook não processado — integra Stripe." });
}
