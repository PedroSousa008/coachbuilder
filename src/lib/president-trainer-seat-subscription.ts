import type { PrismaClient, User } from "@prisma/client";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import type { SubscriptionAccessPayload } from "@/types/subscription";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";

/**
 * Treinadores ligados ao clube (`clubPresidentUserId`) herdam o mesmo pacote CoachPro que o
 * presidente enquanto `trainerSeatActive` e a subscrição do presidente o permitirem — em
 * `/auth/login`, `/auth/me` e APIs que usem esta função, o efeito é o mesmo que um subscritor
 * Pro individual (`hasProAccess`, `effectiveMode`, datas de renovação, etc.).
 */
export async function resolveSubscriptionAccessForCloudUser(
  prisma: PrismaClient,
  user: User
): Promise<SubscriptionAccessPayload> {
  const base = computeSubscriptionAccess(user);

  if (!user.clubPresidentUserId) return base;
  if (user.trainerSeatActive === false) return base;

  const president = await transitionExpiredSubscriptionState(user.clubPresidentUserId);
  if (!president || president.coachingRole !== "club-president") return base;

  const presAccess = computeSubscriptionAccess(president);
  if (!presAccess.hasProAccess) return base;

  return {
    ...presAccess,
    isComped: true,
  };
}
