import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordNode } from "@/lib/password-node";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { createSessionToken, setSessionCookie } from "@/lib/cloud-session";
import { isCoachingRoleId } from "@/types/auth";
import { isOwnerAdminEmail } from "@/lib/admin-owner";
import { recordAccountCreatedSafe } from "@/lib/server-analytics";
import { toCloudUserPublic } from "@/lib/cloud-user-public";
import { computeSubscriptionAccess, trialEndsAtFromNow } from "@/lib/subscription-access";
import {
  emptyWorkspaceSnapshot,
  parseWorkspacePayload,
  snapshotHasMeaningfulData,
  type WorkspaceSnapshotV1,
} from "@/lib/workspace-snapshot";
import { allocateUniqueNametag, isPrismaNametagConflict } from "@/lib/user-nametag";

export const dynamic = "force-dynamic";

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

    const isOwner = isOwnerAdminEmail(norm);

    let user = null as Awaited<ReturnType<typeof prisma.user.create>> | null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const nametag = await allocateUniqueNametag(prisma, { name: displayName, email: norm });
      try {
        user = await prisma.user.create({
          data: {
            email: norm,
            name: displayName,
            nametag,
            coachingRole: roleOk,
            passwordHash: hash,
            salt,
            role: isOwner ? "admin" : "user",
            ...(!isOwner
              ? {
                  subscriptionPlan: "pro_trial",
                  proTrialEndsAt: trialEndsAtFromNow(),
                }
              : {}),
            workspace: {
              create: { payload: workspacePayload as object },
            },
          },
        });
        break;
      } catch (e) {
        if (isPrismaNametagConflict(e)) continue;
        throw e;
      }
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não foi possível migrar a conta." }, { status: 500 });
    }

    await recordAccountCreatedSafe(user.id, norm, "cloud_migrate");

    const token = await createSessionToken(user.id, user.email);
    await setSessionCookie(token);

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh) {
      return NextResponse.json({ ok: false, error: "Erro interno." }, { status: 500 });
    }

    const subscriptionAccess = computeSubscriptionAccess(fresh);
    return NextResponse.json({
      ok: true,
      user: { ...toCloudUserPublic(fresh), subscriptionAccess },
    });
  } catch (e) {
    console.error("[cloud/migrate]", e);
    return NextResponse.json({ ok: false, error: "Não foi possível migrar a conta." }, { status: 500 });
  }
}
