import { coachProDefaultPriceEur, presidentProDefaultPriceEur } from "@/lib/subscription-env";
import type { SubscriptionAccessPayload } from "@/types/subscription";

export type { SubscriptionAccessPayload, SubscriptionEffectiveMode } from "@/types/subscription";

export type UserSubscriptionFields = {
  role: string | null | undefined;
  coachingRole?: string | null | undefined;
  subscriptionPlan: string;
  subscriptionRenewsAt: Date | null;
  proTrialEndsAt: Date | null;
  paymentGraceEndsAt: Date | null;
  customMonthlyPriceEur: { toNumber?: () => number } | number | string | null | undefined;
};

function toNumberPrice(v: UserSubscriptionFields["customMonthlyPriceEur"]): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && typeof v.toNumber === "function") {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function computeSubscriptionAccess(u: UserSubscriptionFields): SubscriptionAccessPayload {
  const isPresidentRole = (u.coachingRole ?? "").trim().toLowerCase() === "club-president";
  const isPresidentPlan = u.subscriptionPlan.trim() === "president_pro_monthly" || isPresidentRole;
  const defaultPriceEur = isPresidentPlan ? presidentProDefaultPriceEur() : coachProDefaultPriceEur();
  const custom = toNumberPrice(u.customMonthlyPriceEur);
  const adminMonthlyPriceEur = custom;
  const displayPriceEur = custom != null ? custom : defaultPriceEur;
  const isComped = custom === 0;

  const role = u.role?.trim().toLowerCase() ?? "user";
  if (role === "admin") {
    return {
      hasProAccess: true,
      effectiveMode: "admin",
      trialEndsAt: u.proTrialEndsAt?.toISOString() ?? null,
      graceEndsAt: u.paymentGraceEndsAt?.toISOString() ?? null,
      renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur,
      defaultPriceEur,
      adminMonthlyPriceEur,
      isComped,
    };
  }

  const plan = u.subscriptionPlan.trim();
  const now = Date.now();

  if (plan === "pro_trial" && u.proTrialEndsAt && u.proTrialEndsAt.getTime() > now) {
    return {
      hasProAccess: true,
      effectiveMode: "pro_trial",
      trialEndsAt: u.proTrialEndsAt.toISOString(),
      graceEndsAt: u.paymentGraceEndsAt?.toISOString() ?? null,
      renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur,
      defaultPriceEur,
      adminMonthlyPriceEur,
      isComped,
    };
  }

  if (plan === "grace" && u.paymentGraceEndsAt && u.paymentGraceEndsAt.getTime() > now) {
    return {
      hasProAccess: true,
      effectiveMode: "grace",
      trialEndsAt: u.proTrialEndsAt?.toISOString() ?? null,
      graceEndsAt: u.paymentGraceEndsAt.toISOString(),
      renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur,
      defaultPriceEur,
      adminMonthlyPriceEur,
      isComped,
    };
  }

  if (plan === "pro_monthly" || plan === "president_pro_monthly") {
    return {
      hasProAccess: true,
      effectiveMode: plan === "president_pro_monthly" ? "president_pro_monthly" : "pro_monthly",
      trialEndsAt: u.proTrialEndsAt?.toISOString() ?? null,
      graceEndsAt: u.paymentGraceEndsAt?.toISOString() ?? null,
      renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur,
      defaultPriceEur,
      adminMonthlyPriceEur,
      isComped,
    };
  }

  /** Pro oferecido pelo Owner (0 €/mês): o plano na BD pode continuar `free`, mas o acesso é Pro completo. */
  if (isComped) {
    const compedMode =
      isPresidentRole ? ("president_pro_monthly" as const) : ("pro_monthly" as const);
    return {
      hasProAccess: true,
      effectiveMode: compedMode,
      trialEndsAt: u.proTrialEndsAt?.toISOString() ?? null,
      graceEndsAt: u.paymentGraceEndsAt?.toISOString() ?? null,
      renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      displayPriceEur,
      defaultPriceEur,
      adminMonthlyPriceEur,
      isComped,
    };
  }

  return {
    hasProAccess: false,
    effectiveMode: "free",
    trialEndsAt: u.proTrialEndsAt?.toISOString() ?? null,
    graceEndsAt: u.paymentGraceEndsAt?.toISOString() ?? null,
    renewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
    displayPriceEur,
    defaultPriceEur,
    adminMonthlyPriceEur,
    isComped,
  };
}

/** Fim do trial: 7 dias a partir de agora. */
export function trialEndsAtFromNow(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/** Período de graça após falha de pagamento: 3 dias. */
export function graceEndsAtFromNow(): Date {
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
}
