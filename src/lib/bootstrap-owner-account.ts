import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPasswordNode } from "@/lib/password-node";
import { emptyWorkspaceSnapshot } from "@/lib/workspace-snapshot";
import { getBuiltinBootstrapOwnerEmails, isOwnerAdminEmail, normalizeAdminEmail } from "@/lib/admin-owner";
import { isCoachingRoleId } from "@/types/auth";

const DEFAULT_NAME = "Pedro Sousa";
const DEFAULT_COACHING_ROLE = "head-coach";

/**
 * Palavra-passe inicial da conta dono. Define `BOOTSTRAP_OWNER_PASSWORD` na Vercel (recomendado).
 * Sem env, usa o valor por defeito do produto (repositório público: altera em produção).
 */
export function getBootstrapOwnerPassword(): string {
  const p = process.env.BOOTSTRAP_OWNER_PASSWORD?.trim();
  if (p && p.length >= 8) return p;
  return "pedrosousa10";
}

function resolveBootstrapName(): string {
  const n = process.env.BOOTSTRAP_OWNER_NAME?.trim();
  return n && n.length > 0 && n.length <= 120 ? n : DEFAULT_NAME;
}

function resolveBootstrapCoachingRole(): string {
  const r = process.env.BOOTSTRAP_OWNER_COACHING_ROLE?.trim();
  if (r && isCoachingRoleId(r)) return r;
  return DEFAULT_COACHING_ROLE;
}

/** Login: só emails reconhecidos como dono + palavra-passe bootstrap. */
export function canProvisionBootstrapOwner(normEmail: string, password: string): boolean {
  if (!isOwnerAdminEmail(normEmail)) return false;
  return password === getBootstrapOwnerPassword();
}

export async function provisionBootstrapOwnerUser(normEmail: string, password: string) {
  const { salt, hash } = hashPasswordNode(password);
  const payload = emptyWorkspaceSnapshot() as object;
  return prisma.user.create({
    data: {
      email: normEmail,
      name: resolveBootstrapName(),
      coachingRole: resolveBootstrapCoachingRole(),
      passwordHash: hash,
      salt,
      role: "admin",
      workspace: {
        create: { payload },
      },
    },
  });
}

/**
 * Seed / deploy: cria contas dono em falta (idempotente).
 */
export async function ensureBootstrapOwnersSeeded(db: PrismaClient): Promise<void> {
  const pwd = getBootstrapOwnerPassword();
  const names = getBuiltinBootstrapOwnerEmails();
  const name = resolveBootstrapName();
  const coachingRole = resolveBootstrapCoachingRole();

  for (const email of names) {
    const norm = normalizeAdminEmail(email);
    const existing = await db.user.findUnique({ where: { email: norm } });
    if (existing) continue;

    const { salt, hash } = hashPasswordNode(pwd);
    const payload = emptyWorkspaceSnapshot() as object;
    await db.user.create({
      data: {
        email: norm,
        name,
        coachingRole,
        passwordHash: hash,
        salt,
        role: "admin",
        workspace: { create: { payload } },
      },
    });
    console.log(`[bootstrap-seed] Utilizador dono criado: ${norm}`);
  }
}
