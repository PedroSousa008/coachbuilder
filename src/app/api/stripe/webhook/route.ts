import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe-server";
import {
  activateFromCheckoutSession,
  applyInvoicePaid,
  applyInvoicePaymentFailed,
  clearSubscriptionAfterStripeEnd,
  syncFromStripeSubscription,
} from "@/lib/stripe-subscription-sync";

export const runtime = "nodejs";

/**
 * Webhook Stripe — requer STRIPE_WEBHOOK_SECRET e corpo RAW (não uses JSON.parse antes da verificação).
 * Eventos: checkout.session.completed, customer.subscription.*, invoice.paid, invoice.payment_failed
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ ok: false, error: "Webhook não configurado." }, { status: 501 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "Cabeçalho stripe-signature em falta." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("[stripe webhook] assinatura inválida", e);
    return NextResponse.json({ ok: false, error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await activateFromCheckoutSession(session, stripe);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncFromStripeSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await clearSubscriptionAfterStripeEnd(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
        await applyInvoicePaymentFailed(subId);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await applyInvoicePaid(invoice, stripe);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] erro ao processar", event.type, e);
    return NextResponse.json({ ok: false, error: "Erro ao processar evento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: true });
}
