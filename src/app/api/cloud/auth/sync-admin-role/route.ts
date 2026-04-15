import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { isOwnerAdminEmail } from "@/lib/admin-owner";
import { toCloudUserPublic } from "@/lib/cloud-user-public";
import { ensureUserNametagIfMissing } from "@/lib/user-nametag";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
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
    if (!isOwnerAdminEmail(user.email)) {
      return NextResponse.json({ ok: false, error: "Este email não está na lista de donos." }, { status: 403 });
    }
    if (user.role?.trim().toLowerCase() !== "admin") {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    }
    const withNametag = (await ensureUserNametagIfMissing(prisma, user.id)) ?? user;
    return NextResponse.json({ ok: true, user: toCloudUserPublic(withNametag) });
  } catch (e) {
    console.error("[cloud/sync-admin-role]", e);
    return NextResponse.json({ ok: false, error: "Erro interno." }, { status: 500 });
  }
}
