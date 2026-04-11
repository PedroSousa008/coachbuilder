/** Cliente: definir `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true` na Vercel quando a BD estiver configurada. */
export function isCloudSyncEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === "true";
}

export function isCloudSyncEnabledServer(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.SESSION_SECRET?.trim());
}
