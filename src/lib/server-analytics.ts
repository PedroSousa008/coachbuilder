import { prisma } from "@/lib/prisma";
import { isOwnerAdminEmail } from "@/lib/admin-owner";

const HEARTBEAT_MIN_MS = 120_000;
const MAX_ROUTE_LEN = 512;

/** Pathname da app (ex. /app/calendar); rejeita valores inválidos. */
export function sanitizeClientPathname(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, MAX_ROUTE_LEN);
  if (!t.startsWith("/")) return undefined;
  if (/[\0\r\n]/.test(t)) return undefined;
  return t;
}

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

export type AccountCreatedKind = "signup" | "cloud_migrate" | "president_trainer_seat";

export async function recordAccountCreated(userId: string, email: string, kind: AccountCreatedKind): Promise<void> {
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

export async function recordAccountCreatedSafe(userId: string, email: string, kind: AccountCreatedKind): Promise<void> {
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

export async function recordUserHeartbeat(userId: string, pathname?: string | null): Promise<void> {
  const route = pathname ? sanitizeClientPathname(pathname) : undefined;
  const since = new Date(Date.now() - HEARTBEAT_MIN_MS);
  const recent = await prisma.appEvent.findFirst({
    where: { userId, type: "heartbeat", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const presence = {
    lastSeenAt: now,
    ...(route != null ? { lastRoute: route } : {}),
  };
  if (recent) {
    await prisma.user.update({ where: { id: userId }, data: presence });
    return;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: presence }),
    prisma.appEvent.create({ data: { userId, type: "heartbeat" } }),
  ]);
}

export async function recordUserHeartbeatSafe(userId: string, pathname?: string | null): Promise<void> {
  try {
    await recordUserHeartbeat(userId, pathname);
  } catch (e) {
    console.error("[analytics] heartbeat failed, lastSeenAt only", e);
    try {
      const route = pathname ? sanitizeClientPathname(pathname) : undefined;
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeenAt: new Date(),
          ...(route != null ? { lastRoute: route } : {}),
        },
      });
    } catch (e2) {
      console.error("[analytics] heartbeat fallback failed", e2);
    }
  }
}
