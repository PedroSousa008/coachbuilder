import type { PrismaClient, User } from "@prisma/client";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import type { SubscriptionAccessPayload } from "@/types/subscription";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";

/**
 * Treinadores criados num **lugar** do presidente (`trainerSeatIndex` definido) herdam o mesmo
 * `subscriptionAccess` que o presidente (CoachPro completo: `hasProAccess`, preços, datas, etc.),
 * enquanto `trainerSeatActive` e a subscrição do presidente o permitirem.
 *
 * Ligações manuais por email (`clubPresidentUserId` sem lugar) mantêm só o plano próprio na BD.
 */
export async function resolveSubscriptionAccessForCloudUser(
  prisma: PrismaClient,
  user: User
): Promise<SubscriptionAccessPayload> {
  const base = computeSubscriptionAccess(user);

  if (!user.clubPresidentUserId) return base;
  if (user.trainerSeatActive === false) return base;
  if (user.trainerSeatIndex == null) return base;

  const president = await transitionExpiredSubscriptionState(user.clubPresidentUserId);
  if (!president || president.coachingRole !== "club-president") return base;

  const presAccess = computeSubscriptionAccess(president);
  if (!presAccess.hasProAccess) return base;

  return {
    ...presAccess,
    isComped: true,
  };
}
