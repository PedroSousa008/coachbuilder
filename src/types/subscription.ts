export type SubscriptionEffectiveMode = "admin" | "pro_trial" | "pro_monthly" | "grace" | "free";

/** Estado de subscrição exposto pela API (`/me`, login, registo). */
export type SubscriptionAccessPayload = {
  hasProAccess: boolean;
  effectiveMode: SubscriptionEffectiveMode;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  renewsAt: string | null;
  displayPriceEur: number;
  defaultPriceEur: number;
  isComped: boolean;
};
