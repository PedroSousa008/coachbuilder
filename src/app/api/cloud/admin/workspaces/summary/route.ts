import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { workspaceDataCounts, type WorkspaceDataCounts } from "@/lib/workspace-counts";

export const dynamic = "force-dynamic";

export type AdminWorkspaceSummaryRow = {
  userId: string;
  email: string;
  name: string;
  role: string;
  subscriptionPlan: string;
  workspaceUpdatedAt: string | null;
  hasWorkspace: boolean;
  counts: WorkspaceDataCounts;
};

function safeSnapshot(raw: unknown): WorkspaceSnapshotV1 {
  return parseWorkspacePayload(raw) ?? emptyWorkspaceSnapshot();
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionPlan: true,
        workspace: { select: { updatedAt: true, payload: true } },
      },
    });

    const rows: AdminWorkspaceSummaryRow[] = users.map((u) => {
      const w = u.workspace;
      const snap = w ? safeSnapshot(w.payload) : emptyWorkspaceSnapshot();
      return {
        userId: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        subscriptionPlan: u.subscriptionPlan,
        workspaceUpdatedAt: w?.updatedAt.toISOString() ?? null,
        hasWorkspace: Boolean(w),
        counts: workspaceDataCounts(snap),
      };
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      totalUsers: rows.length,
      rows,
    });
  } catch (e) {
    console.error("[admin/workspaces/summary]", e);
    return NextResponse.json({ ok: false, error: "Erro ao agregar workspaces." }, { status: 500 });
  }
}
