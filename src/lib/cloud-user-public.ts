import type { AuthUser } from "@/types/auth";
import { isCoachingRoleId } from "@/types/auth";

export type CloudUserPublic = AuthUser & {
  role: "user" | "admin";
  subscriptionPlan: string;
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

export function parseCloudUserFromApi(raw: unknown): CloudUserPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.email !== "string") {
    return null;
  }
  const sp = o.subscriptionPlan;
  const subscriptionPlan = typeof sp === "string" || sp === null ? sp : null;
  return toCloudUserPublic({
    id: o.id,
    email: o.email,
    name: typeof o.name === "string" ? o.name : "",
    coachingRole: typeof o.coachingRole === "string" ? o.coachingRole : "head-coach",
    role: typeof o.role === "string" ? o.role.trim().toLowerCase() : "user",
    subscriptionPlan,
  });
}
