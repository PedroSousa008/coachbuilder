import type { Message } from "@/types";

/** Automated group/DM channel lines (not user-authored chat). */
export function isChannelSystemMessage(m: Message): boolean {
  if (m.system) return true;
  const b = m.body.trim();
  // Português (atual)
  if (b.startsWith("O grupo foi renomeado para") || b.startsWith("Grupo renomeado para")) return true;
  if (b.includes(" foi adicionado ao grupo.") || b.includes(" foram adicionados ao grupo.")) return true;
  if (b.endsWith(" entrou no grupo.") || b.includes(" pessoas entraram no grupo.")) return true;
  if (b.includes("foi removido do grupo") || b.includes("Um membro foi removido do grupo")) return true;
  if (/^.+\ criado\.(\s*$| Membros adicionados:)/.test(b)) return true;
  // Inglês (legado)
  if (b.startsWith("Group renamed to")) return true;
  if (b.includes(" was added to the group.") || b.includes(" were added to the group.")) return true;
  if (b.includes("was removed from the group")) return true;
  if (/^.+\ created\.(\s*$| Members added:)/.test(b)) return true;
  return false;
}
