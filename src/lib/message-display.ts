import type { Message } from "@/types";

/** Automated group/DM channel lines (not user-authored chat). */
export function isChannelSystemMessage(m: Message): boolean {
  if (m.system) return true;
  const b = m.body.trim();
  if (b.startsWith("Group renamed to")) return true;
  if (b.includes(" was added to the group.") || b.includes(" were added to the group.")) return true;
  if (b.includes("was removed from the group")) return true;
  if (/^.+\ created\.(\s*$| Members added:)/.test(b)) return true;
  return false;
}
