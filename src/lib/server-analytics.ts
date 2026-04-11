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

/**
 * Igual a `recordUserLogin`, mas nunca falha o pedido HTTP se a tabela AppEvent ou migrações falharem.
 */
export async function recordUserLoginSafe(userId: string, email: string): Promise<void> {
  try {
    await recordUserLogin(userId, email);
  } catch (e) {
    console.error("[analytics] recordUserLogin failed, fallback update only", e);
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeenAt: new Date(),
          loginCount: { increment: 1 },
          ...(isOwnerAdminEmail(email) ? { role: "admin" } : {}),
        },
      });
    } catch (e2) {
      console.error("[analytics] recordUserLogin fallback failed", e2);
    }
  }
}

export async function recordAccountCreatedSafe(
  userId: string,
  email: string,
  kind: "signup" | "cloud_migrate"
): Promise<void> {
  try {
    await recordAccountCreated(userId, email, kind);
  } catch (e) {
    console.error("[analytics] recordAccountCreated failed, fallback", e);
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeenAt: new Date(),
          ...(isOwnerAdminEmail(email) ? { role: "admin" } : {}),
        },
      });
    } catch (e2) {
      console.error("[analytics] recordAccountCreated fallback failed", e2);
    }
  }
}

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

export async function recordUserHeartbeatSafe(userId: string): Promise<void> {
  try {
    await recordUserHeartbeat(userId);
  } catch (e) {
    console.error("[analytics] heartbeat failed, lastSeenAt only", e);
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch (e2) {
      console.error("[analytics] heartbeat fallback failed", e2);
    }
  }
}
