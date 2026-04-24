import { NextResponse } from "next/server";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getStripe } from "@/lib/stripe-server";
import { getAppBaseUrl, presidentExtraSeatStripePriceId } from "@/lib/stripe-env";
import { prisma } from "@/lib/prisma";
import { PRESIDENT_EXTRA_SEAT_PRICE_EUR } from "@/lib/president-constants";

export const runtime = "nodejs";

export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud não configurada." }, { status: 503 });
  }
  const auth = await getCloudUserFromSessionCookies();
  if (!auth?.user.id) {
    return NextResponse.json({ ok: false, error: "Inicia sessão para continuar." }, { status: 401 });
  }
  if (auth.user.coachingRole !== "club-president") {
    return NextResponse.json({ ok: false, error: "Apenas contas Presidente." }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripe não configurado no servidor." }, { status: 501 });
  }
  const u = auth.user;
  let customerId = u.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u.email,
      name: u.name?.trim() || undefined,
      metadata: { userId: u.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: u.id }, data: { stripeCustomerId: customerId } });
  }

  const base = getAppBaseUrl();
  const priceId = presidentExtraSeatStripePriceId();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: u.id,
    ...(priceId
      ? { line_items: [{ price: priceId, quantity: 1 }] }
      : {
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "eur",
                unit_amount: Math.round(PRESIDENT_EXTRA_SEAT_PRICE_EUR * 100),
                product_data: {
                  name: "CoachBuilder — Lugar extra de treinador (Presidente)",
                  description: "Pagamento único. Acrescenta +1 lugar cloud de treinador ao teu clube.",
                },
              },
            },
          ],
        }),
    metadata: {
      userId: u.id,
      purchaseType: "president_extra_seat",
      seats: "1",
    },
    success_url: `${base}/app/president/definicoes?extraSeat=success`,
    cancel_url: `${base}/app/president/definicoes?extraSeat=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ ok: false, error: "Não foi possível criar checkout." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url: session.url });
}
