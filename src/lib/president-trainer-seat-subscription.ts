import type { PrismaClient, User } from "@prisma/client";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import type { SubscriptionAccessPayload } from "@/types/subscription";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";

function isSeatCoachUser(user: Pick<User, "trainerSeatIndex">): boolean {
  return (
    user.trainerSeatIndex != null &&
    Number.isInteger(user.trainerSeatIndex) &&
    user.trainerSeatIndex >= 0
  );
}

function isClubPresidentAccount(sponsor: Pick<User, "coachingRole">): boolean {
  return sponsor.coachingRole?.trim().toLowerCase() === "club-president";
}

/**
 * Contas num **lugar** do presidente herdam o Pro do sponsor quando o Presidente tem subscrição activa
 * (Stripe ou comped). Sem Pro pago no presidente, o treinador do lugar fica com o próprio `computeSubscriptionAccess`.
 *
 * Ligações manuais (sem lugar) só herdam Pro se `computeSubscriptionAccess` do sponsor tiver Pro activo.
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
  const seat = isSeatCoachUser(user);
  const sponsorPresident = isClubPresidentAccount(president);

  if (seat && sponsorPresident) {
    if (presAccess.hasProAccess) {
      return { ...presAccess, isComped: true };
    }
    /** Presidente sem Pro pago (Stripe) — o lugar deixa de herdar acesso fictício. */
    return base;
  }

  if (!presAccess.hasProAccess) return base;

  return {
    ...presAccess,
    isComped: true,
  };
}
