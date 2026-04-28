import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, snapshotHasMeaningfulData } from "@/lib/workspace-snapshot";
import { workspaceDataCounts } from "@/lib/workspace-counts";

export const dynamic = "force-dynamic";

type RestoreBody = {
  email?: string;
  beforeIso?: string | null;
};

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as RestoreBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email em falta." }, { status: 400 });
    }
    const beforeIso = typeof body.beforeIso === "string" && body.beforeIso.trim() ? body.beforeIso.trim() : null;
    const beforeDate = beforeIso ? new Date(beforeIso) : null;
    if (beforeDate && !Number.isFinite(beforeDate.getTime())) {
      return NextResponse.json({ ok: false, error: "beforeIso inválido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, workspace: { select: { payload: true, updatedAt: true } } },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }

    const versions = await prisma.workspaceVersion.findMany({
      where: {
        userId: user.id,
        ...(beforeDate ? { createdAt: { lte: beforeDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { payload: true, createdAt: true, source: true },
    });

    const picked = versions
      .map((v) => ({ ...v, snap: parseWorkspacePayload(v.payload) ?? emptyWorkspaceSnapshot() }))
      .find((v) => snapshotHasMeaningfulData(v.snap));

    if (!picked) {
      return NextResponse.json(
        { ok: false, error: "Sem versões antigas com dados relevantes para restaurar." },
        { status: 404 }
      );
    }

    await prisma.workspace.upsert({
      where: { userId: user.id },
      create: { userId: user.id, payload: picked.snap as object },
      update: { payload: picked.snap as object },
    });

    await prisma.workspaceVersion.create({
      data: {
        userId: user.id,
        payload: picked.snap as object,
        source: "admin_restore",
      },
    });

    return NextResponse.json({
      ok: true,
      email: user.email,
      restoredFrom: picked.createdAt.toISOString(),
      restoredSource: picked.source,
      counts: workspaceDataCounts(picked.snap),
    });
  } catch (e) {
    console.error("[admin/workspaces/restore POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao restaurar workspace." }, { status: 500 });
  }
}

