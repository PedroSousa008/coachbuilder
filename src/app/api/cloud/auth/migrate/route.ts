import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { hashPasswordNode } from "@/lib/password-node";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { createSessionToken, setSessionCookie } from "@/lib/cloud-session";
import { isCoachingRoleId } from "@/types/auth";
import {
  emptyWorkspaceSnapshot,
  parseWorkspacePayload,
  snapshotHasMeaningfulData,
  type WorkspaceSnapshotV1,
} from "@/lib/workspace-snapshot";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json(
      { ok: false, error: "Sincronização cloud não está configurada no servidor." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const coachingRole = typeof body.coachingRole === "string" ? body.coachingRole.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const workspaceRaw = body.workspace;

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ ok: false, error: "Dados em falta." }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ ok: false, error: "Nome demasiado longo." }, { status: 400 });
    }
    const roleOk = isCoachingRoleId(coachingRole) ? coachingRole : "head-coach";

    const norm = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: norm } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Esta conta já existe na cloud. Usa Entrar em vez de migrar." },
        { status: 409 }
      );
    }

    const { salt, hash } = hashPasswordNode(password);
    let workspacePayload: WorkspaceSnapshotV1 = emptyWorkspaceSnapshot();
    if (workspaceRaw != null) {
      const parsed = parseWorkspacePayload(workspaceRaw);
      if (parsed) workspacePayload = parsed;
    }
    if (!snapshotHasMeaningfulData(workspacePayload) && name.length < 1) {
      return NextResponse.json({ ok: false, error: "Sem dados para migrar." }, { status: 400 });
    }

    const displayName = name || "Coach";

    const user = await prisma.user.create({
      data: {
        email: norm,
        name: displayName,
        coachingRole: roleOk,
        passwordHash: hash,
        salt,
        workspace: {
          create: { payload: workspacePayload as object },
        },
      },
    });

    const token = await createSessionToken(user.id, user.email);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coachingRole: isCoachingRoleId(user.coachingRole) ? user.coachingRole : "head-coach",
      },
    });
  } catch (e) {
    console.error("[cloud/migrate]", e);
    return NextResponse.json({ ok: false, error: "Não foi possível migrar a conta." }, { status: 500 });
  }
}
