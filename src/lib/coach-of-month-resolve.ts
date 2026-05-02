import { prisma } from "@/lib/prisma";
import { parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { CoachMonthWinner, CoachOfMonthContent } from "@/lib/coach-of-month";

/**
 * Preenche nome, clube, foto e nametag a partir da conta ligada (`coachUserId`), quando existir.
 * Usado na API pública e antes de guardar no admin (payload persistido com nametag resolvida).
 */
export async function resolveCoachOfMonthContent(content: CoachOfMonthContent): Promise<CoachOfMonthContent> {
  const ids = Array.from(
    new Set(content.winners.map((w) => w.coachUserId?.trim()).filter((id): id is string => Boolean(id)))
  );
  if (ids.length === 0) return content;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, nametag: true, workspace: { select: { payload: true } } },
  });
  const byId = new Map(
    users.map((u) => {
      const snap = u.workspace?.payload ? parseWorkspacePayload(u.workspace.payload) : null;
      const profile = snap?.coachProfile;
      return [
        u.id,
        {
          name: u.name ?? "",
          nametag: u.nametag ?? "",
          profileName: profile?.name ?? "",
          profileClub: profile?.club ?? "",
          profileAvatar: profile?.avatarDataUrl ?? "",
        },
      ] as const;
    })
  );

  const winners: CoachMonthWinner[] = content.winners.map((winner) => {
    const linked = winner.coachUserId ? byId.get(winner.coachUserId) : null;
    if (!linked) return winner;
    const accountNametag = linked.nametag.trim();
    return {
      ...winner,
      coachName: winner.coachName.trim() || linked.profileName.trim() || linked.name.trim() || winner.coachName,
      nametag: winner.nametag.trim() || accountNametag,
      clubName: winner.clubName.trim() || linked.profileClub.trim() || winner.clubName,
      photoUrl: winner.photoUrl?.trim() || linked.profileAvatar.trim() || winner.photoUrl,
    };
  });

  return { ...content, winners };
}
