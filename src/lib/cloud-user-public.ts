import type { AuthUser } from "@/types/auth";
import { isCoachingRoleId } from "@/types/auth";
import type { SubscriptionAccessPayload } from "@/types/subscription";

export type CloudUserPublic = AuthUser & {
  role: "user" | "admin";
  subscriptionPlan: string;
  subscriptionAccess?: SubscriptionAccessPayload;
};

export function toCloudUserPublic(u: {
  id: string;
  email: string;
  name?: string | null;
  coachingRole?: string | null;
  role?: string | null;
  subscriptionPlan?: string | null;
}): CloudUserPublic {
  const cr = typeof u.coachingRole === "string" ? u.coachingRole : "head-coach";
  const r = typeof u.role === "string" ? u.role.trim().toLowerCase() : "user";
  return {
    id: u.id,
    email: u.email,
    name: typeof u.name === "string" ? u.name : "",
    coachingRole: isCoachingRoleId(cr) ? cr : "head-coach",
    role: r === "admin" ? "admin" : "user",
    subscriptionPlan: (typeof u.subscriptionPlan === "string" && u.subscriptionPlan) || "free",
  };
}

function parseSubscriptionAccessPayload(raw: unknown): SubscriptionAccessPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.hasProAccess !== "boolean") return undefined;
  if (typeof o.effectiveMode !== "string") return undefined;
  if (typeof o.displayPriceEur !== "number" || typeof o.defaultPriceEur !== "number") return undefined;
  if (typeof o.isComped !== "boolean") return undefined;
  return o as SubscriptionAccessPayload;
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
      isComped: false,
    };
  }
  const hasProAccess = plan === "pro_monthly";
  return {
    hasProAccess,
    effectiveMode: hasProAccess ? "pro_monthly" : "free",
    trialEndsAt: null,
    graceEndsAt: null,
    renewsAt: null,
    displayPriceEur: 6.99,
    defaultPriceEur: 6.99,
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
  const base = toCloudUserPublic({
    id: o.id,
    email: o.email,
    name: typeof o.name === "string" ? o.name : "",
    coachingRole: typeof o.coachingRole === "string" ? o.coachingRole : "head-coach",
    role: roleLower,
    subscriptionPlan,
  });
  const subscriptionAccess =
    parseSubscriptionAccessPayload(o.subscriptionAccess) ?? legacySubscriptionAccess(base.subscriptionPlan, base.role);
  return { ...base, subscriptionAccess };
}
