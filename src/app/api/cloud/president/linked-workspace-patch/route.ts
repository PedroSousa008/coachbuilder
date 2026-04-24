import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { presidentCanAccessCoachWorkspace } from "@/lib/president-cloud-server";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { patchSnapshotForPresident } from "@/lib/president-workspace-patch";
import type { PresidentLinkedCoachProfilePatchInput, PresidentLinkedPlayerPatchInput } from "@/lib/president-workspace-patch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const session = await getCloudUserFromSessionCookies();
    if (!session?.user.id || session.user.coachingRole !== "club-president") {
      return NextResponse.json({ ok: false, error: "Apenas contas com função Presidente." }, { status: 403 });
    }
    const presidentId = session.user.id;

    const body = (await req.json()) as {
      coachUserId?: string;
      playerId?: string;
      playerPatch?: PresidentLinkedPlayerPatchInput;
      coachProfilePatch?: PresidentLinkedCoachProfilePatchInput;
    };
    const coachUserId = typeof body.coachUserId === "string" ? body.coachUserId.trim() : "";
    if (!coachUserId) {
      return NextResponse.json({ ok: false, error: "coachUserId em falta." }, { status: 400 });
    }

    const allowed = await presidentCanAccessCoachWorkspace(presidentId, coachUserId);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Sem permissão para alterar esta conta." }, { status: 403 });
    }

    const hasPlayer = typeof body.playerId === "string" && body.playerId.trim() && body.playerPatch && typeof body.playerPatch === "object";
    const hasCoach = body.coachProfilePatch && typeof body.coachProfilePatch === "object";
    if (!hasPlayer && !hasCoach) {
      return NextResponse.json({ ok: false, error: "playerPatch ou coachProfilePatch em falta." }, { status: 400 });
    }
    if (hasPlayer && hasCoach) {
      return NextResponse.json({ ok: false, error: "Envia apenas um tipo de alteração por pedido." }, { status: 400 });
    }

    const row = await prisma.workspace.findUnique({ where: { userId: coachUserId } });
    const snap = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();

    let next: WorkspaceSnapshotV1;
    if (hasPlayer) {
      const playerId = body.playerId!.trim();
      next = patchSnapshotForPresident(snap, {
        kind: "player",
        playerId,
        patch: body.playerPatch!,
      });
    } else {
      next = patchSnapshotForPresident(snap, {
        kind: "coachProfile",
        patch: body.coachProfilePatch!,
      });
    }

    await prisma.workspace.upsert({
      where: { userId: coachUserId },
      create: { userId: coachUserId, payload: next as object },
      update: { payload: next as object },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[president/linked-workspace-patch POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao guardar." }, { status: 500 });
  }
}
