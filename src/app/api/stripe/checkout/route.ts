import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { prisma } from "@/lib/prisma";
import { coachProStripePriceId, getAppBaseUrl, presidentProStripePriceId } from "@/lib/stripe-env";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud não configurada." }, { status: 503 });
  }
  const cloudAuth = await getCloudUserFromSessionCookies();
  if (!cloudAuth) {
    return NextResponse.json({ ok: false, error: "Inicia sessão para subscrever." }, { status: 401 });
  }

  const stripe = getStripe();
  const isPresident = cloudAuth.user.coachingRole === "club-president";
  const priceId = isPresident ? presidentProStripePriceId() : coachProStripePriceId();
  if (!stripe || !priceId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          isPresident
            ? "Stripe não configurado para PresidentPro. Define STRIPE_SECRET_KEY e STRIPE_PRICE_ID_PRESIDENT_PRO."
            : "Stripe não configurado para CoachPro. Define STRIPE_SECRET_KEY e STRIPE_PRICE_ID_COACH_PRO.",
      },
      { status: 501 }
    );
  }

  const u = cloudAuth.user;

  if (u.customMonthlyPriceEur != null && new Prisma.Decimal(u.customMonthlyPriceEur).equals(0)) {
    return NextResponse.json(
      { ok: false, error: "A tua conta já tem Coach Pro sem custo mensal." },
      { status: 400 }
    );
  }

  if (u.stripeSubscriptionId) {
    const existing = await stripe.subscriptions.retrieve(u.stripeSubscriptionId).catch(() => null);
    if (existing && (existing.status === "active" || existing.status === "trialing")) {
      return NextResponse.json(
        { ok: false, error: "Já tens uma subscrição Coach Pro activa." },
        { status: 400 }
      );
    }
  }

  let customerId = u.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u.email,
      name: u.name?.trim() || undefined,
      metadata: { userId: u.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: u.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = getAppBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: u.id,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId: u.id },
    subscription_data: {
      metadata: { userId: u.id, planKind: isPresident ? "president_pro_monthly" : "pro_monthly" },
    },
    success_url: `${base}/app/settings?subscription=success`,
    cancel_url: `${base}/app/settings?subscription=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ ok: false, error: "Não foi possível criar a sessão de pagamento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: session.url });
}
