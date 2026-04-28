import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import {
  emptyWorkspaceSnapshot,
  parseWorkspacePayload,
  snapshotHasMeaningfulData,
  type WorkspaceSnapshotV1,
} from "@/lib/workspace-snapshot";
import { upsertWorkspaceSafely } from "@/lib/workspace-write-safety";

async function requireUserId(): Promise<string | null> {
  const session = await getCloudUserFromSessionCookies();
  return session?.user.id ?? null;
}

async function saveWorkspaceVersion(userId: string, payload: WorkspaceSnapshotV1, source = "autosave") {
  try {
    await prisma.workspaceVersion.create({
      data: {
        userId,
        payload: payload as object,
        source,
      },
    });
  } catch (e) {
    console.error("[cloud/workspace saveWorkspaceVersion]", e);
  }
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

    const incomingPayload: WorkspaceSnapshotV1 = { ...parsed, version: 1 };
    const existingRow = await prisma.workspace.findUnique({ where: { userId } });
    const existingPayload = parseWorkspacePayload(existingRow?.payload) ?? emptyWorkspaceSnapshot();

    // Safety net: never allow accidental wipe from an empty/near-empty payload over existing rich workspace.
    // Destructive reset should only happen through explicit admin/user tooling, not silent sync races.
    const incomingMeaningful = snapshotHasMeaningfulData(incomingPayload);
    const existingMeaningful = snapshotHasMeaningfulData(existingPayload);
    if (!incomingMeaningful && existingMeaningful) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Proteção anti-perda: payload recebido sem dados relevantes. Workspace existente foi preservado sem alterações.",
        },
        { status: 409 }
      );
    }

    const payload = await upsertWorkspaceSafely({
      userId,
      incomingPayload,
      actorUserId: userId,
    });

    if (existingRow) {
      await saveWorkspaceVersion(userId, existingPayload, "pre_update");
    }

    await saveWorkspaceVersion(userId, payload, "post_update");

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
