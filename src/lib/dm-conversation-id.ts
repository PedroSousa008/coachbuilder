/**
 * ID de conversa DM partilhado entre dois utilizadores cloud (mesmo valor nos dois browsers).
 */
export function cloudDmConversationId(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `conv-dm-${a}__${b}`;
}

/** Parse `conv-dm-{cuid1}__{cuid2}` (ids ordenados). */
export function parseCloudDmConversationId(
  conversationId: string
): { userIdA: string; userIdB: string } | null {
  const m = conversationId.match(/^conv-dm-(.+)__(.+)$/);
  if (!m) return null;
  return { userIdA: m[1], userIdB: m[2] };
}
