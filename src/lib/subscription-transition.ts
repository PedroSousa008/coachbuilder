import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Expira trial e período de graça; deve ser chamado antes de expor o estado ao cliente (ex.: GET /me).
 */
export async function transitionExpiredSubscriptionState(userId: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;

  const now = new Date();
  const data: {
    subscriptionPlan?: string;
    proTrialEndsAt?: null;
    paymentGraceEndsAt?: null;
    lastPaymentFailedAt?: null;
  } = {};

  if (
    u.subscriptionPlan === "pro_trial" &&
    (!u.proTrialEndsAt || u.proTrialEndsAt <= now)
  ) {
    data.subscriptionPlan = "free";
    data.proTrialEndsAt = null;
  }

  if (u.subscriptionPlan === "grace" && u.paymentGraceEndsAt && u.paymentGraceEndsAt <= now) {
    data.subscriptionPlan = "free";
    data.paymentGraceEndsAt = null;
    data.lastPaymentFailedAt = null;
  }

  if (Object.keys(data).length === 0) return u;

  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
