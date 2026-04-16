import type { Message } from "@/types";

/**
 * Ordena por data de envio (mais antigas primeiro).
 */
export function sortMessagesChronological(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
}

/**
 * Onde fazer scroll ao abrir o fio:
 * - Sem `lastReadMessageId` ou não encontrada: última mensagem (fim do histórico).
 * - Com última lida: primeira mensagem **depois** dessa (primeira não lida).
 * - Se não há mensagens depois: última (tudo já estava lido).
 */
export function getScrollTargetMessageId(
  sortedMessages: Message[],
  lastReadMessageId: string | undefined
): string | null {
  if (sortedMessages.length === 0) return null;
  const last = sortedMessages[sortedMessages.length - 1]!;
  if (!lastReadMessageId?.trim()) {
    return last.id;
  }
  const idx = sortedMessages.findIndex((m) => m.id === lastReadMessageId);
  if (idx < 0) {
    return last.id;
  }
  const firstUnread = sortedMessages[idx + 1];
  if (firstUnread) {
    return firstUnread.id;
  }
  return last.id;
}
