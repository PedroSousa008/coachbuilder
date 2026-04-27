import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";
import { resolveSubscriptionAccessForCloudUser } from "@/lib/president-trainer-seat-subscription";
import { isOwnerAdminEmail } from "@/lib/admin-owner";

const PAYWALL_MESSAGE =
  "O período experimental terminou ou a subscrição não está activa. Vai a Definições e subscreve o PresidentPro para voltares a aceder ao modo clube.";

export type PresidentPremiumGate =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Exige sessão Presidente com PresidentPro (trial, mensal, grace, comped, etc.) activo na cloud.
 */
export async function requirePresidentPremiumAccess(): Promise<PresidentPremiumGate> {
  const session = await getCloudUserFromSessionCookies();
  if (!session?.user.id) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 }) };
  }
  if (session.user.coachingRole !== "club-president") {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Apenas contas com função Presidente." }, { status: 403 }),
    };
  }

  const user = await transitionExpiredSubscriptionState(session.user.id);
  if (!user) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Conta não encontrada." }, { status: 401 }) };
  }

  if (isOwnerAdminEmail(user.email)) {
    return { ok: true, user };
  }

  const access = await resolveSubscriptionAccessForCloudUser(prisma, user);
  if (!access.hasProAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: PAYWALL_MESSAGE, code: "PRESIDENT_PREMIUM_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
