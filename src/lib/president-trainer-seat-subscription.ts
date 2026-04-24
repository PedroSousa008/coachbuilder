import type { PrismaClient, User } from "@prisma/client";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import type { SubscriptionAccessPayload } from "@/types/subscription";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";

/**
 * Treinadores com `clubPresidentUserId` herdam o mesmo pacote CoachPro que essa conta enquanto
 * `trainerSeatActive` e a subscrição dela o permitirem (não exigimos `coachingRole === "club-president"`
 * na BD — o email da conta que paga o Pro pode estar com outro papel registado).
 */
export async function resolveSubscriptionAccessForCloudUser(
  prisma: PrismaClient,
  user: User
): Promise<SubscriptionAccessPayload> {
  const base = computeSubscriptionAccess(user);

  if (!user.clubPresidentUserId) return base;
  if (user.trainerSeatActive === false) return base;

  const president = await transitionExpiredSubscriptionState(user.clubPresidentUserId);
  if (!president) return base;

  const presAccess = computeSubscriptionAccess(president);
  if (!presAccess.hasProAccess) return base;

  return {
    ...presAccess,
    isComped: true,
  };
}
