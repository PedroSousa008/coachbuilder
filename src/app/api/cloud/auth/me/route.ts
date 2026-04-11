import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { isCoachingRoleId } from "@/types/auth";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, cloud: false }, { status: 503 });
  }
  try {
    const claims = await readSessionFromCookies();
    if (!claims) {
      return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.email !== claims.email) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      cloud: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coachingRole: isCoachingRoleId(user.coachingRole) ? user.coachingRole : "head-coach",
      },
    });
  } catch (e) {
    console.error("[cloud/me]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler sessão." }, { status: 500 });
  }
}
