import type { SubscriptionAccessPayload } from "@/types/subscription";

export const COACHING_ROLES = [
  { id: "club-president", label: "Presidente" },
  { id: "head-coach", label: "Treinador principal" },
  { id: "assistant-coach", label: "Treinador adjunto" },
  { id: "goalkeeper-coach", label: "Treinador de guarda-redes" },
  { id: "fitness-coach", label: "Treinador de preparação física" },
  { id: "analyst", label: "Analista" },
  { id: "youth-coach", label: "Treinador de formação" },
] as const;

export type CoachingRoleId = (typeof COACHING_ROLES)[number]["id"];

export function isCoachingRoleId(r: string): r is CoachingRoleId {
  return COACHING_ROLES.some((x) => x.id === r);
}

/** Label shown in profile / tactics (English, matches legacy `CoachProfileState`). */
export function coachingRoleProfileLabel(id: CoachingRoleId): string {
  const map: Record<CoachingRoleId, string> = {
    "club-president": "Club President",
    "head-coach": "Head Coach",
    "assistant-coach": "Assistant Coach",
    "goalkeeper-coach": "Goalkeeper Coach",
    "fitness-coach": "Fitness Coach",
    analyst: "Analyst",
    "youth-coach": "Youth Coach",
  };
  return map[id];
}

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  coachingRole: CoachingRoleId;
  passwordHash: string;
  salt: string;
  createdAt: string;
  emailVerified: boolean;
};

/** Dados de sessão expostos à UI (sem credenciais). */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  /** Cloud: gerado no registo, único, não editável pelo utilizador. */
  nametag?: string;
  coachingRole: CoachingRoleId;
  /** Só preenchido com cloud + API atualizada */
  role?: "user" | "admin";
  subscriptionPlan?: string;
  /** Calculado no servidor (GET /me, login, registo). */
  subscriptionAccess?: SubscriptionAccessPayload;
  /** ISO 8601 — data de criação da conta (calendário Coaching by Professionals, etc.). */
  createdAt?: string;
};

export type SignUpCredentials = {
  name: string;
  coachingRole: CoachingRoleId;
  email: string;
  password: string;
};
