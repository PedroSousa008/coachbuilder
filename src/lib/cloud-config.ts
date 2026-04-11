/** Cliente: definir `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true` na Vercel quando a BD estiver configurada. */
export function isCloudSyncEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === "true";
}

/** IDs Prisma (cuid); contas só-local usam prefixo `usr-`. */
export function isLikelyCloudUserId(userId: string): boolean {
  return Boolean(userId) && !userId.startsWith("usr-");
}

/** Usar APIs cloud (heartbeat, diagnósticos) mesmo se o flag público faltar, desde que a sessão seja da BD. */
export function shouldUseCloudClientApis(user: { id: string } | null | undefined): boolean {
  return isCloudSyncEnabledClient() || isLikelyCloudUserId(user?.id ?? "");
}

export function isCloudSyncEnabledServer(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.SESSION_SECRET?.trim());
}

/** Mensagem quando DATABASE_URL ou SESSION_SECRET faltam no deploy (ex.: Vercel). */
export const CLOUD_SERVER_UNAVAILABLE_MESSAGE =
  "Cloud inativa: falta DATABASE_URL ou SESSION_SECRET no servidor. Na Vercel → Environment Variables (Production), define-as (e NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true) e faz Redeploy. Se usas Vercel Postgres, copia a connection string para DATABASE_URL.";
