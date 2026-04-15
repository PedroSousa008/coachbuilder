import type { PrismaClient, User } from "@prisma/client";

const MAX_BASE_LEN = 32;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Base slug a partir do nome no registo; fallback para a parte local do email. */
export function nameEmailToNametagBase(name: string, email: string): string {
  const fromName = stripDiacritics(name.trim().toLowerCase()).replace(/[^a-z0-9]+/g, "");
  if (fromName.length >= 2) return fromName.slice(0, MAX_BASE_LEN);
  const local = (email.split("@")[0] ?? "").trim();
  const fromEmail = stripDiacritics(local.toLowerCase()).replace(/[^a-z0-9]+/g, "");
  if (fromEmail.length >= 1) return fromEmail.slice(0, MAX_BASE_LEN);
  return "user";
}

/** P2002 só no índice único `nametag` (para retry em corridas). */
export function isPrismaNametagConflict(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as { code?: string; meta?: { target?: string | string[] } };
  if (o.code !== "P2002") return false;
  const t = o.meta?.target;
  if (Array.isArray(t)) return t.includes("nametag");
  if (typeof t === "string") return t.includes("nametag");
  return false;
}

/**
 * Escolhe um nametag livre: base, base1, base2, … (consulta à BD).
 * Em corrida rara, o create/update pode falhar com P2002 — repetir com nova tentativa.
 */
export async function allocateUniqueNametag(
  db: PrismaClient,
  input: { name: string; email: string }
): Promise<string> {
  const base = nameEmailToNametagBase(input.name, input.email);
  for (let i = 0; i < 50_000; i++) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const taken = await db.user.findUnique({ where: { nametag: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new Error("allocateUniqueNametag: limite de tentativas");
}

/** Preenche `nametag` em contas antigas (null) de forma idempotente. */
export async function ensureUserNametagIfMissing(db: PrismaClient, userId: string): Promise<User | null> {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  if (u.nametag) return u;

  for (let attempt = 0; attempt < 30; attempt++) {
    const tag = await allocateUniqueNametag(db, { name: u.name, email: u.email });
    try {
      return await db.user.update({
        where: { id: userId },
        data: { nametag: tag },
      });
    } catch (e) {
      if (isPrismaNametagConflict(e)) continue;
      throw e;
    }
  }
  throw new Error("ensureUserNametagIfMissing: falha ao atribuir nametag");
}
