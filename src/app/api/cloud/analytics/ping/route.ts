import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { recordUserHeartbeat } from "@/lib/server-analytics";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false }, { status: 503 });
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
    await recordUserHeartbeat(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics/ping]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
