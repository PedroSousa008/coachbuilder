import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { workspaceDataCounts } from "@/lib/workspace-counts";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  if (!userId?.trim()) {
    return NextResponse.json({ ok: false, error: "userId em falta." }, { status: 400 });
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        workspace: { select: { updatedAt: true, payload: true } },
      },
    });

    if (!row) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }

    const w = row.workspace;
    const payload: WorkspaceSnapshotV1 = w ? parseWorkspacePayload(w.payload) ?? emptyWorkspaceSnapshot() : emptyWorkspaceSnapshot();

    return NextResponse.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
      },
      workspaceUpdatedAt: w?.updatedAt.toISOString() ?? null,
      hasWorkspace: Boolean(w),
      counts: workspaceDataCounts(payload),
      payload,
    });
  } catch (e) {
    console.error("[admin/workspaces/userId GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler workspace." }, { status: 500 });
  }
}
