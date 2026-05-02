import { prisma } from "@/lib/prisma";
import { normalizeNametagInput } from "@/lib/user-nametag";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { upsertWorkspaceSafely } from "@/lib/workspace-write-safety";
import type { CoachMonthAgeGroupId, CoachMonthWinner, CoachOfMonthContent } from "@/lib/coach-of-month";
import type { CoachHonorEntry } from "@/types";

function formatCoachOfMonthPeriodPt(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 15))
  );
}

export function coachOfMonthHonorStableId(winnerId: CoachMonthAgeGroupId, year: number, month: number): string {
  return `hon-com-${winnerId}-${year}-${String(month).padStart(2, "0")}`;
}

export function buildCoachOfMonthHonorEntry(
  winner: CoachMonthWinner,
  year: number,
  month: number
): CoachHonorEntry {
  const period = formatCoachOfMonthPeriodPt(year, month);
  return {
    id: coachOfMonthHonorStableId(winner.id, year, month),
    category: "individual",
    title: `Treinador do Mês: ${period} · ${winner.ageGroup}`,
    seasonLabel: `${year}-${String(month).padStart(2, "0")}`,
    club: winner.clubName.trim() || "—",
    ageGroup: winner.ageGroup.trim() || "—",
    origin: "coach_of_month",
  };
}

/**
 * Após publicar o Treinador do Mês (admin PUT), grava no workspace de cada vencedor
 * uma entrada de palmarés com origem `coach_of_month`, identificada por escalão + mês/ano.
 * Resolução por `User.nametag` (normalizado como na app).
 */
export async function applyCoachOfMonthHonorsAfterPublish(content: CoachOfMonthContent): Promise<void> {
  const { awardYear, awardMonth, winners } = content;
  if (awardMonth < 1 || awardMonth > 12 || awardYear < 2000 || awardYear > 2100) return;

  for (const w of winners) {
    const tagKey = normalizeNametagInput(w.nametag);
    if (!tagKey) continue;

    const user = await prisma.user.findUnique({
      where: { nametag: tagKey },
      select: { id: true, role: true, email: true, name: true },
    });
    if (!user || user.role === "admin") continue;

    const honor = buildCoachOfMonthHonorEntry(w, awardYear, awardMonth);
    const row = await prisma.workspace.findUnique({ where: { userId: user.id } });
    const snap = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
    const honors = snap.coachProfile.honors ?? [];
    const without = honors.filter((h) => h.id !== honor.id);
    const nextHonors = [...without, honor];

    await upsertWorkspaceSafely({
      userId: user.id,
      incomingPayload: {
        ...snap,
        coachProfile: {
          ...snap.coachProfile,
          name: snap.coachProfile.name?.trim() || user.name || "",
          email: snap.coachProfile.email?.trim() || user.email || "",
          honors: nextHonors,
        },
      },
      actorUserId: user.id,
    });
  }
}
