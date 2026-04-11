/**
 * Vercel Postgres liga ao projeto com POSTGRES_PRISMA_URL / POSTGRES_URL.
 * O Prisma e isCloudSyncEnabledServer esperam DATABASE_URL.
 */
if (typeof process !== "undefined" && process.env) {
  const cur = process.env.DATABASE_URL?.trim();
  if (!cur) {
    const fallback =
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      process.env.STORAGE_URL?.trim();
    if (fallback) {
      process.env.DATABASE_URL = fallback;
    }
  }
}
