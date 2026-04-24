import type { AuthUser } from "@/types/auth";
import { isCoachingRoleId } from "@/types/auth";
import type { SubscriptionAccessPayload, SubscriptionEffectiveMode } from "@/types/subscription";

export type CloudUserPublic = AuthUser & {
  role: "user" | "admin";
  subscriptionPlan: string;
  subscriptionAccess?: SubscriptionAccessPayload;
};

function coercePrice(n: unknown): number | undefined {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string") {
    const v = parseFloat(n);
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
}

export function toCloudUserPublic(u: {
  id: string;
  email: string;
  name?: string | null;
  nametag?: string | null;
  coachingRole?: string | null;
  role?: string | null;
  subscriptionPlan?: string | null;
  createdAt?: Date | null;
  clubPresidentUserId?: string | null;
  trainerSeatIndex?: number | null;
}): CloudUserPublic {
  const cr = typeof u.coachingRole === "string" ? u.coachingRole : "head-coach";
  const r = typeof u.role === "string" ? u.role.trim().toLowerCase() : "user";
  const tag = typeof u.nametag === "string" && u.nametag.trim() !== "" ? u.nametag.trim() : undefined;
  const createdAt =
    u.createdAt instanceof Date && !Number.isNaN(u.createdAt.getTime()) ? u.createdAt.toISOString() : undefined;
  return {
    id: u.id,
    email: u.email,
    name: typeof u.name === "string" ? u.name : "",
    ...(tag ? { nametag: tag } : {}),
    coachingRole: isCoachingRoleId(cr) ? cr : "head-coach",
    role: r === "admin" ? "admin" : "user",
    subscriptionPlan: (typeof u.subscriptionPlan === "string" && u.subscriptionPlan) || "free",
    ...(createdAt ? { createdAt } : {}),
    ...("clubPresidentUserId" in u ? { clubPresidentUserId: u.clubPresidentUserId ?? null } : {}),
    ...("trainerSeatIndex" in u ? { trainerSeatIndex: u.trainerSeatIndex ?? null } : {}),
  };
}

const EFFECTIVE_MODES = new Set(["admin", "pro_trial", "pro_monthly", "president_pro_monthly", "grace", "free"]);

function parseSubscriptionAccessPayload(raw: unknown): SubscriptionAccessPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.hasProAccess !== "boolean") return undefined;
  const displayPriceEur = coercePrice(o.displayPriceEur);
  const defaultPriceEur = coercePrice(o.defaultPriceEur);
  if (displayPriceEur === undefined || defaultPriceEur === undefined) return undefined;
  const rawMode = typeof o.effectiveMode === "string" ? o.effectiveMode.trim() : "";
  const effectiveMode: SubscriptionEffectiveMode = EFFECTIVE_MODES.has(rawMode)
    ? (rawMode as SubscriptionEffectiveMode)
    : o.hasProAccess === true
      ? "pro_monthly"
      : "free";
  const isComped = typeof o.isComped === "boolean" ? o.isComped : false;
  let adminMonthlyPriceEur: number | null = null;
  if ("adminMonthlyPriceEur" in o) {
    const v = o.adminMonthlyPriceEur;
    if (v === null) adminMonthlyPriceEur = null;
    else {
      const n = coercePrice(v);
      if (n === undefined) return undefined;
      adminMonthlyPriceEur = n;
    }
  }
  const trialEndsAt = typeof o.trialEndsAt === "string" || o.trialEndsAt === null ? (o.trialEndsAt as string | null) : null;
  const graceEndsAt = typeof o.graceEndsAt === "string" || o.graceEndsAt === null ? (o.graceEndsAt as string | null) : null;
  const renewsAt = typeof o.renewsAt === "string" || o.renewsAt === null ? (o.renewsAt as string | null) : null;
  return {
    hasProAccess: o.hasProAccess === true,
    effectiveMode,
    trialEndsAt,
    graceEndsAt,
    renewsAt,
    displayPriceEur,
    defaultPriceEur,
    adminMonthlyPriceEur,
    isComped,
  };
}

/** Respostas antigas sem `subscriptionAccess`: inferir só a partir do plano. */
function legacySubscriptionAccess(plan: string, role: string): SubscriptionAccessPayload {
  if (role === "admin") {
    return {
      hasProAccess: true,
      effectiveMode: "admin",
      trialEndsAt: null,
      graceEndsAt: null,
      renewsAt: null,
      displayPriceEur: 6.99,
      defaultPriceEur: 6.99,
      adminMonthlyPriceEur: null,
      isComped: false,
    };
  }
  const hasProAccess = plan === "pro_monthly" || plan === "president_pro_monthly";
  const legacyDefault = plan === "president_pro_monthly" ? 59.99 : 6.99;
  return {
    hasProAccess,
    effectiveMode: plan === "president_pro_monthly" ? "president_pro_monthly" : hasProAccess ? "pro_monthly" : "free",
    trialEndsAt: null,
    graceEndsAt: null,
    renewsAt: null,
    displayPriceEur: legacyDefault,
    defaultPriceEur: legacyDefault,
    adminMonthlyPriceEur: null,
    isComped: false,
  };
}

export function parseCloudUserFromApi(raw: unknown): CloudUserPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.email !== "string") {
    return null;
  }
  const sp = o.subscriptionPlan;
  const subscriptionPlan = typeof sp === "string" || sp === null ? sp : null;
  const roleLower = typeof o.role === "string" ? o.role.trim().toLowerCase() : "user";
  const createdAtIso = typeof o.createdAt === "string" ? o.createdAt : undefined;
  const base = toCloudUserPublic({
    id: o.id,
    email: o.email,
    name: typeof o.name === "string" ? o.name : "",
    nametag: typeof o.nametag === "string" ? o.nametag : null,
    coachingRole: typeof o.coachingRole === "string" ? o.coachingRole : "head-coach",
    role: roleLower,
    subscriptionPlan,
    ...(createdAtIso ? { createdAt: new Date(createdAtIso) } : {}),
    ...(typeof o.clubPresidentUserId === "string" || o.clubPresidentUserId === null
      ? { clubPresidentUserId: o.clubPresidentUserId as string | null }
      : {}),
    ...(typeof o.trainerSeatIndex === "number" || o.trainerSeatIndex === null
      ? { trainerSeatIndex: o.trainerSeatIndex as number | null }
      : {}),
  });
  const subscriptionAccess =
    parseSubscriptionAccessPayload(o.subscriptionAccess) ?? legacySubscriptionAccess(base.subscriptionPlan, base.role);
  return { ...base, subscriptionAccess };
}
