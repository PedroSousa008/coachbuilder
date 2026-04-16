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

/** Chave estável na BD (`DmChatMessage.threadKey`) — dois user ids ordenados com `__`. */
export function dmThreadKey(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `${a}__${b}`;
}

export function peerUserIdFromThreadKey(threadKey: string, meUserId: string): string | null {
  const parts = threadKey.split("__");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (a === meUserId) return b;
  if (b === meUserId) return a;
  return null;
}
