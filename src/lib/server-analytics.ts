import { prisma } from "@/lib/prisma";
import { isOwnerAdminEmail } from "@/lib/admin-owner";

const HEARTBEAT_MIN_MS = 120_000;

export async function recordUserLogin(userId: string, email: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        loginCount: { increment: 1 },
        ...(isOwnerAdminEmail(email) ? { role: "admin" } : {}),
      },
    }),
    prisma.appEvent.create({
      data: { userId, type: "login" },
    }),
  ]);
}

export async function recordAccountCreated(userId: string, email: string, kind: "signup" | "cloud_migrate"): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        ...(isOwnerAdminEmail(email) ? { role: "admin" } : {}),
      },
    }),
    prisma.appEvent.create({
      data: { userId, type: kind },
    }),
  ]);
}

/** Atualiza presença; regista heartbeat no máximo ~1x por 2 min para não explodir a BD. */
export async function recordUserHeartbeat(userId: string): Promise<void> {
  const since = new Date(Date.now() - HEARTBEAT_MIN_MS);
  const recent = await prisma.appEvent.findFirst({
    where: { userId, type: "heartbeat", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  if (recent) {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } });
    return;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } }),
    prisma.appEvent.create({ data: { userId, type: "heartbeat" } }),
  ]);
}
