import type { PrismaClient, User } from "@prisma/client";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import { coachProDefaultPriceEur } from "@/lib/subscription-env";
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
 * Contas criadas num **lugar** do presidente (`trainerSeatIndex`) devem ter sempre Coach Pro completo
 * quando o sponsor é uma conta com função Presidente — mesmo que o Stripe/plano na BD ainda não
 * mostre `pro_monthly` (sincronização atrasada ou preço definido à parte).
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
    const listPrice = coachProDefaultPriceEur();
    return {
      hasProAccess: true,
      effectiveMode: "pro_monthly",
      trialEndsAt: null,
      graceEndsAt: null,
      renewsAt: president.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur: listPrice,
      defaultPriceEur: listPrice,
      adminMonthlyPriceEur: presAccess.adminMonthlyPriceEur,
      isComped: true,
    };
  }

  if (!presAccess.hasProAccess) return base;

  return {
    ...presAccess,
    isComped: true,
  };
}
