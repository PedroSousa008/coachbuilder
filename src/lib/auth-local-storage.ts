import { AUTH_STORAGE_KEYS } from "@/lib/coachbuilder-persist";
import type { CoachingRoleId, StoredUser } from "@/types/auth";
import { isCoachingRoleId } from "@/types/auth";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function defaultCoachingRole(raw: unknown): CoachingRoleId {
  if (typeof raw === "string" && isCoachingRoleId(raw)) return raw;
  return "head-coach";
}

/** Normaliza contas antigas (sem nome / sem verificação explícita). */
export function migrateStoredUser(raw: unknown): StoredUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (typeof u.id !== "string" || typeof u.email !== "string") return null;
  if (typeof u.passwordHash !== "string" || typeof u.salt !== "string") return null;
  const createdAt = typeof u.createdAt === "string" ? u.createdAt : new Date().toISOString();
  const emailVerified = u.emailVerified === false ? false : true;
  const name = typeof u.name === "string" ? u.name.trim() : "";
  const coachingRole = defaultCoachingRole(u.coachingRole);
  return {
    id: u.id,
    email: u.email,
    name,
    coachingRole,
    passwordHash: u.passwordHash,
    salt: u.salt,
    createdAt,
    emailVerified,
  };
}

export function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.users);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateStoredUser).filter((x): x is StoredUser => x != null);
  } catch {
    return [];
  }
}

export function saveUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEYS.users, JSON.stringify(users));
}

/**
 * Após confirmação por email: remove pendentes não verificados com o mesmo email
 * e acrescenta / substitui a conta verificada.
 */
export function mergeVerifiedUserFromSignup(verified: StoredUser): { ok: true } | { ok: false; error: string } {
  const norm = normalizeEmail(verified.email);
  const users = loadUsers();
  if (users.some((u) => normalizeEmail(u.email) === norm && u.emailVerified)) {
    return { ok: false, error: "Já existe uma conta verificada com este email. Faz login." };
  }
  const withoutDup = users.filter((u) => !(normalizeEmail(u.email) === norm && !u.emailVerified));
  const withoutId = withoutDup.filter((u) => u.id !== verified.id);
  saveUsers([...withoutId, verified]);
  return { ok: true };
}
