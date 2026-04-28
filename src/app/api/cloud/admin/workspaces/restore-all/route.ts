import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, snapshotHasMeaningfulData } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

type Body = {
  beforeIso?: string | null;
  limit?: number;
};

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as Body;
    const beforeIso = typeof body.beforeIso === "string" && body.beforeIso.trim() ? body.beforeIso.trim() : null;
    const beforeDate = beforeIso ? new Date(beforeIso) : null;
    if (beforeDate && !Number.isFinite(beforeDate.getTime())) {
      return NextResponse.json({ ok: false, error: "beforeIso inválido." }, { status: 400 });
    }
    const max = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(500, Number(body.limit))) : 200;

    const users = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      take: max,
      select: { id: true, email: true },
      orderBy: { createdAt: "desc" },
    });

    const restored: Array<{ email: string; restoredFrom: string; source: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const u of users) {
      const versions = await prisma.workspaceVersion.findMany({
        where: {
          userId: u.id,
          ...(beforeDate ? { createdAt: { lte: beforeDate } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { payload: true, createdAt: true, source: true },
      });
      const picked = versions
        .map((v) => ({ ...v, snap: parseWorkspacePayload(v.payload) ?? emptyWorkspaceSnapshot() }))
        .find((v) => snapshotHasMeaningfulData(v.snap));
      if (!picked) {
        skipped.push({ email: u.email, reason: "no_meaningful_version" });
        continue;
      }
      await prisma.workspace.upsert({
        where: { userId: u.id },
        create: { userId: u.id, payload: picked.snap as object },
        update: { payload: picked.snap as object },
      });
      await prisma.workspaceVersion.create({
        data: {
          userId: u.id,
          payload: picked.snap as object,
          source: "admin_restore_all",
        },
      });
      restored.push({
        email: u.email,
        restoredFrom: picked.createdAt.toISOString(),
        source: picked.source,
      });
    }

    return NextResponse.json({
      ok: true,
      attempted: users.length,
      restoredCount: restored.length,
      skippedCount: skipped.length,
      restored,
      skipped,
    });
  } catch (e) {
    console.error("[admin/workspaces/restore-all POST]", e);
    return NextResponse.json({ ok: false, error: "Erro no restauro em massa." }, { status: 500 });
  }
}

