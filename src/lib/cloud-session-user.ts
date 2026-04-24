import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionFromCookies, type SessionClaims } from "@/lib/cloud-session";

const SKEW_MS = 2_000;

/** Sessão JWT ainda válida face a mudanças de email ou invalidação explícita (ex.: presidente mudou password). */
export function isCloudSessionIssuedAfterInvalidation(
  user: Pick<User, "sessionInvalidatedAt" | "email">,
  issuedAtMs: number,
  claimsEmail: string
): boolean {
  if (user.email.trim().toLowerCase() !== claimsEmail.trim().toLowerCase()) return false;
  if (user.sessionInvalidatedAt == null) return true;
  return issuedAtMs >= user.sessionInvalidatedAt.getTime() - SKEW_MS;
}

export async function getCloudUserFromSessionCookies(): Promise<{ user: User; claims: SessionClaims } | null> {
  const claims = await readSessionFromCookies();
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) return null;
  if (!isCloudSessionIssuedAfterInvalidation(user, claims.issuedAtMs, claims.email)) return null;
  return { user, claims };
}

export async function bumpUserSessionInvalidation(client: PrismaClient, userId: string): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { sessionInvalidatedAt: new Date() },
  });
}
