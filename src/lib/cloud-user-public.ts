import type { AuthUser } from "@/types/auth";
import { isCoachingRoleId } from "@/types/auth";

export type CloudUserPublic = AuthUser & {
  role: "user" | "admin";
  subscriptionPlan: string;
};

export function toCloudUserPublic(u: {
  id: string;
  email: string;
  name: string;
  coachingRole: string;
  role: string;
  subscriptionPlan: string | null;
}): CloudUserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    coachingRole: isCoachingRoleId(u.coachingRole) ? u.coachingRole : "head-coach",
    role: u.role === "admin" ? "admin" : "user",
    subscriptionPlan: u.subscriptionPlan || "free",
  };
}

export function parseCloudUserFromApi(raw: unknown): CloudUserPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.email !== "string" ||
    typeof o.name !== "string" ||
    typeof o.coachingRole !== "string" ||
    typeof o.role !== "string"
  ) {
    return null;
  }
  const sp = o.subscriptionPlan;
  const subscriptionPlan = typeof sp === "string" || sp === null ? sp : null;
  return toCloudUserPublic({
    id: o.id,
    email: o.email,
    name: o.name,
    coachingRole: o.coachingRole,
    role: o.role,
    subscriptionPlan: subscriptionPlan,
  });
}
