import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { isOwnerAdminEmail, parseAdminOwnerEmailsFromEnv } from "@/lib/admin-owner";
import { toCloudUserPublic } from "@/lib/cloud-user-public";
import { computeSubscriptionAccess } from "@/lib/subscription-access";
import { transitionExpiredSubscriptionState } from "@/lib/subscription-transition";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, cloud: false }, { status: 503 });
  }
  try {
    const claims = await readSessionFromCookies();
    if (!claims) {
      return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
    }
    let user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.email !== claims.email) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }
    const listed = isOwnerAdminEmail(user.email);
    const roleLower = user.role?.trim().toLowerCase() ?? "user";
    if (listed && roleLower !== "admin") {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    }
    const transitioned = await transitionExpiredSubscriptionState(user.id);
    if (!transitioned) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }
    const subscriptionAccess = computeSubscriptionAccess(transitioned);
    return NextResponse.json({
      ok: true,
      cloud: true,
      user: { ...toCloudUserPublic(transitioned), subscriptionAccess },
      adminDiagnostics: {
        ownerEnvConfigured: parseAdminOwnerEmailsFromEnv().length > 0,
        sessionEmailListedAsOwner: listed,
      },
    });
  } catch (e) {
    console.error("[cloud/me]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler sessão." }, { status: 500 });
  }
}
