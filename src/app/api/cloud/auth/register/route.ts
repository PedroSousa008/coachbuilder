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
    const initialWorkspaceRaw = body.initialWorkspace;

    if (name.length < 1 || name.length > 120) {
      return NextResponse.json({ ok: false, error: "Indica o teu nome (até 120 caracteres)." }, { status: 400 });
    }
    if (!isCoachingRoleId(coachingRole)) {
      return NextResponse.json({ ok: false, error: "Escolhe uma função válida." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Introduz um email válido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    const norm = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: norm } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Já existe uma conta com este email." }, { status: 409 });
    }

    const { salt, hash } = hashPasswordNode(password);
    let workspacePayload: WorkspaceSnapshotV1 = emptyWorkspaceSnapshot();
    if (initialWorkspaceRaw != null) {
      const parsed = parseWorkspacePayload(initialWorkspaceRaw);
      if (parsed && snapshotHasMeaningfulData(parsed)) workspacePayload = parsed;
    }

    const isOwner = isOwnerAdminEmail(norm);

    let user = null as Awaited<ReturnType<typeof prisma.user.create>> | null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const nametag = await allocateUniqueNametag(prisma, { name, email: norm });
      try {
        user = await prisma.user.create({
          data: {
            email: norm,
            name,
            nametag,
            coachingRole,
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
      return NextResponse.json({ ok: false, error: "Não foi possível criar a conta." }, { status: 500 });
    }

    await recordAccountCreatedSafe(user.id, norm, "signup");

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
    console.error("[cloud/register]", e);
    return NextResponse.json({ ok: false, error: "Não foi possível criar a conta." }, { status: 500 });
  }
}
