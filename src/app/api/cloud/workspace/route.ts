import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";

async function requireUserId(): Promise<string | null> {
  const claims = await readSessionFromCookies();
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email) return null;
  return user.id;
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const row = await prisma.workspace.findUnique({ where: { userId } });
    if (!row) {
      return NextResponse.json({
        ok: true,
        updatedAt: null,
        payload: null,
      });
    }

    const payload = parseWorkspacePayload(row.payload) ?? emptyWorkspaceSnapshot();
    return NextResponse.json({
      ok: true,
      updatedAt: row.updatedAt.toISOString(),
      payload,
    });
  } catch (e) {
    console.error("[cloud/workspace GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler dados." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseWorkspacePayload(body.payload);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
    }

    const payload: WorkspaceSnapshotV1 = { ...parsed, version: 1 };

    await prisma.workspace.upsert({
      where: { userId },
      create: { userId, payload: payload as object },
      update: { payload: payload as object },
    });

    const row = await prisma.workspace.findUnique({ where: { userId } });
    return NextResponse.json({
      ok: true,
      updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cloud/workspace PUT]", e);
    return NextResponse.json({ ok: false, error: "Erro ao guardar dados." }, { status: 500 });
  }
}
