/** Textos automáticos do chat de grupo (português). */

export function ptGroupCreatedBody(groupTitle: string, memberNames: string[]): string {
  const t = groupTitle.trim() || "Grupo";
  if (memberNames.length === 0) return `${t} criado.`;
  return `${t} criado. Membros adicionados: ${memberNames.join(", ")}.`;
}

export function ptGroupRenamePreview(title: string): string {
  return `Grupo renomeado para ${title}`;
}

export function ptGroupRenameBody(title: string): string {
  return `O grupo foi renomeado para «${title}».`;
}

export function ptMembersAddedPreview(addedNames: string[]): string {
  if (addedNames.length === 0) return "Membros atualizados";
  if (addedNames.length === 1) return `${addedNames[0]} entrou no grupo.`;
  return `${addedNames.length} pessoas entraram no grupo.`;
}

export function ptMembersAddedBody(addedNames: string[]): string {
  if (addedNames.length === 0) return "";
  if (addedNames.length === 1) return `${addedNames[0]} foi adicionado ao grupo.`;
  if (addedNames.length === 2) return `${addedNames[0]} e ${addedNames[1]} foram adicionados ao grupo.`;
  const head = addedNames.slice(0, -1).join(", ");
  const last = addedNames[addedNames.length - 1]!;
  return `${head} e ${last} foram adicionados ao grupo.`;
}

export function ptMemberRemovedPreview(actorName: string): string {
  return `${actorName} removeu um membro`;
}

export function ptMemberRemovedBody(): string {
  return "Um membro foi removido do grupo.";
}

export function ptMemberCountSubtitle(count: number): string {
  if (count === 1) return "1 membro";
  return `${count} membros`;
}
