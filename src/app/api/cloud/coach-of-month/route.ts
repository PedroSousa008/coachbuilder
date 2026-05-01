import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  defaultCoachOfMonthContent,
  normalizeCoachOfMonthContent,
  type CoachMonthWinner,
  type CoachOfMonthContent,
} from "@/lib/coach-of-month";
import { parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";

export const dynamic = "force-dynamic";

async function resolveCoachDetails(content: CoachOfMonthContent): Promise<CoachOfMonthContent> {
  const ids = Array.from(
    new Set(
      content.winners
        .map((w) => w.coachUserId?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );
  if (ids.length === 0) return content;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, workspace: { select: { payload: true } } },
  });
  const byId = new Map(
    users.map((u) => {
      const snap = u.workspace?.payload ? parseWorkspacePayload(u.workspace.payload) : null;
      const profile = snap?.coachProfile;
      return [
        u.id,
        {
          name: u.name ?? "",
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
    return {
      ...winner,
      coachName: winner.coachName.trim() || linked.profileName.trim() || linked.name.trim() || winner.coachName,
      clubName: winner.clubName.trim() || linked.profileClub.trim() || winner.clubName,
      photoUrl: winner.photoUrl?.trim() || linked.profileAvatar.trim() || winner.photoUrl,
    };
  });

  return { ...content, winners };
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({
      ok: true,
      payload: defaultCoachOfMonthContent(),
      updatedAt: null,
      source: "default",
    });
  }
  try {
    const row = await (prisma as unknown as { coachOfMonthContent?: { findUnique: Function } }).coachOfMonthContent?.findUnique({
      where: { id: "global" },
      select: { payload: true, updatedAt: true },
    });
    const raw = row?.payload ?? defaultCoachOfMonthContent();
    const normalized = normalizeCoachOfMonthContent(raw);
    const resolved = await resolveCoachDetails(normalized);
    return NextResponse.json({
      ok: true,
      payload: resolved,
      updatedAt: row?.updatedAt?.toISOString?.() ?? null,
      source: row ? "db" : "default",
    });
  } catch (e) {
    console.error("[coach-of-month GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao carregar Treinador do Mês." }, { status: 500 });
  }
}
