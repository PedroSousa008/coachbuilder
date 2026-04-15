/** Chave estável para mensagens DM entre dois utilizadores (ids Prisma cuid). */
export function dmThreadKey(userIdA: string, userIdB: string): string {
  return userIdA < userIdB ? `dm:${userIdA}:${userIdB}` : `dm:${userIdB}:${userIdA}`;
}
