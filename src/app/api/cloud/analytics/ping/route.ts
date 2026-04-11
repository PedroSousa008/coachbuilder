import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { recordUserHeartbeatSafe } from "@/lib/server-analytics";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    let pathname: unknown;
    try {
      const text = await req.text();
      if (text.trim()) {
        const body = JSON.parse(text) as Record<string, unknown>;
        pathname = body.pathname;
      }
    } catch {
      pathname = undefined;
    }

    const claims = await readSessionFromCookies();
    if (!claims) {
      return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.email !== claims.email) {
      return NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 });
    }
    await recordUserHeartbeatSafe(user.id, typeof pathname === "string" ? pathname : undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics/ping]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
