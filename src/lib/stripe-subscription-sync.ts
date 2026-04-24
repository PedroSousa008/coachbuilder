import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { coachProStripePriceId, presidentProStripePriceId } from "@/lib/stripe-env";
import { graceEndsAtFromNow } from "@/lib/subscription-access";

/** Plano mensal pago: Stripe (price ID) > metadata explícita > função na conta. */
function resolvePaidMonthlyPlanFromStripe(
  sub: Stripe.Subscription,
  coachingRole: string | null | undefined
): "pro_monthly" | "president_pro_monthly" {
  const item = sub.items?.data?.[0];
  const rawPrice = item?.price;
  const linePriceId = typeof rawPrice === "string" ? rawPrice : rawPrice?.id ?? null;
  const coachId = coachProStripePriceId();
  const presidentId = presidentProStripePriceId();
  if (linePriceId && presidentId && linePriceId === presidentId) return "president_pro_monthly";
  if (linePriceId && coachId && linePriceId === coachId) return "pro_monthly";

  const kind = typeof sub.metadata?.planKind === "string" ? sub.metadata.planKind.trim() : "";
  const isPresident = coachingRole === "club-president";
  const byRole = isPresident ? "president_pro_monthly" : "pro_monthly";
  if (kind === "president_pro_monthly") return "president_pro_monthly";
  if (kind === "pro_monthly") return "pro_monthly";
  return byRole;
}

function customerId(c: Stripe.Subscription["customer"]): string | null {
  return typeof c === "string" ? c : c?.id ?? null;
}

async function userByStripeSubscription(sub: Stripe.Subscription) {
  const fromMeta = typeof sub.metadata?.userId === "string" ? sub.metadata.userId : null;
  if (fromMeta) {
    const u = await prisma.user.findUnique({ where: { id: fromMeta } });
    if (u) return u;
  }
  return prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
}

export async function activateFromCheckoutSession(session: Stripe.Checkout.Session, stripe: Stripe) {
  if (session.mode === "payment" && session.metadata?.purchaseType === "president_extra_seat") {
    const userId = typeof session.metadata?.userId === "string" ? session.metadata.userId : null;
    if (!userId) return;
    const seatsRaw = session.metadata?.seats;
    const seats = Number.parseInt(typeof seatsRaw === "string" ? seatsRaw : "1", 10);
    const qty = Number.isFinite(seats) && seats > 0 ? seats : 1;
    await prisma.user.update({
      where: { id: userId },
      data: { trainerExtraSeatsPurchased: { increment: qty } },
    });
    return;
  }
  if (session.mode !== "subscription") return;
  const userId = typeof session.metadata?.userId === "string" ? session.metadata.userId : null;
  if (!userId) return;

  const customerIdRaw =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionIdRaw =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  if (!customerIdRaw || !subscriptionIdRaw) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionIdRaw);
  await applyActiveSubscription(userId, customerIdRaw, sub);
}

async function applyActiveSubscription(userId: string, customerId: string, sub: Stripe.Subscription) {
  const renewsAt = new Date(sub.current_period_end * 1000);
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { coachingRole: true } });
  const plan = resolvePaidMonthlyPlanFromStripe(sub, me?.coachingRole);
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionPlan: plan,
      subscriptionRenewsAt: renewsAt,
      proTrialEndsAt: null,
      paymentGraceEndsAt: null,
      lastPaymentFailedAt: null,
    },
  });
}

export async function syncFromStripeSubscription(sub: Stripe.Subscription) {
  const user = await userByStripeSubscription(sub);
  if (!user) return;

  const renewsAt = new Date(sub.current_period_end * 1000);
  const cust = customerId(sub.customer);

  if (sub.status === "active" || sub.status === "trialing") {
    const plan = resolvePaidMonthlyPlanFromStripe(sub, user.coachingRole);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: cust ?? user.stripeCustomerId,
        stripeSubscriptionId: sub.id,
        subscriptionPlan: plan,
        subscriptionRenewsAt: renewsAt,
        paymentGraceEndsAt: null,
        lastPaymentFailedAt: null,
      },
    });
    return;
  }

  if (sub.status === "past_due") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: "grace",
        subscriptionRenewsAt: renewsAt,
        paymentGraceEndsAt: graceEndsAtFromNow(),
        lastPaymentFailedAt: new Date(),
      },
    });
  }
}

export async function clearSubscriptionAfterStripeEnd(sub: Stripe.Subscription) {
  const user = await userByStripeSubscription(sub);
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlan: "free",
      stripeSubscriptionId: null,
      subscriptionRenewsAt: null,
      paymentGraceEndsAt: null,
      lastPaymentFailedAt: null,
    },
  });
}

export async function applyInvoicePaymentFailed(subscriptionId: string | null | undefined) {
  if (!subscriptionId) return;
  const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlan: "grace",
      paymentGraceEndsAt: graceEndsAtFromNow(),
      lastPaymentFailedAt: new Date(),
    },
  });
}

export async function applyInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe) {
  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
  if (!subId) return;

  let user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subId } });
  if (!user) {
    const custId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
    if (custId) {
      user = await prisma.user.findFirst({ where: { stripeCustomerId: custId } });
    }
  }
  if (!user) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  if (sub.status !== "active" && sub.status !== "trialing") return;
  const plan = resolvePaidMonthlyPlanFromStripe(sub, user.coachingRole);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      subscriptionPlan: plan,
      subscriptionRenewsAt: new Date(sub.current_period_end * 1000),
      paymentGraceEndsAt: null,
      lastPaymentFailedAt: null,
    },
  });
}
