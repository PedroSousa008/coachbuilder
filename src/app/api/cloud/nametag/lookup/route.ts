import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { normalizeNametagInput } from "@/lib/user-nametag";

export const dynamic = "force-dynamic";

/**
 * Verifica se existe conta com o nametag dado (sessão obrigatória).
 * GET ?tag=pedrosousa
 */
export async function GET(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const cloudAuth = await getCloudUserFromSessionCookies();
  if (!cloudAuth) {
    return NextResponse.json({ ok: false, error: "Sessão necessária." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("tag") ?? "";
  const tag = normalizeNametagInput(raw);
  if (!tag) {
    return NextResponse.json({ ok: true, exists: false, normalized: "" });
  }

  try {
    const row = await prisma.user.findUnique({
      where: { nametag: tag },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, exists: Boolean(row), normalized: tag });
  } catch (e) {
    console.error("[nametag/lookup]", e);
    return NextResponse.json({ ok: false, error: "Erro ao verificar." }, { status: 500 });
  }
}
