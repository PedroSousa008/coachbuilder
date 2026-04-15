import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { normalizeNametagInput } from "@/lib/user-nametag";

export const dynamic = "force-dynamic";

const MAX_TAGS = 48;

/**
 * Resolve vários nametags de uma vez: existe conta? qual o user id?
 * POST { tags: string[] } — sessão obrigatória.
 */
export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sessão necessária." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { tags?: unknown };
    const raw = Array.isArray(body.tags) ? body.tags : [];
    const normalized = [
      ...new Set(
        raw
          .filter((t): t is string => typeof t === "string")
          .map((t) => normalizeNametagInput(t))
          .filter(Boolean)
      ),
    ].slice(0, MAX_TAGS);

    if (normalized.length === 0) {
      return NextResponse.json({ ok: true, byTag: {} as Record<string, { exists: boolean; userId: string | null }> });
    }

    const users = await prisma.user.findMany({
      where: { nametag: { in: normalized } },
      select: { id: true, nametag: true },
    });

    const byTag: Record<string, { exists: boolean; userId: string | null }> = {};
    for (const t of normalized) {
      byTag[t] = { exists: false, userId: null };
    }
    for (const u of users) {
      if (u.nametag) {
        byTag[u.nametag] = { exists: true, userId: u.id };
      }
    }

    return NextResponse.json({ ok: true, byTag });
  } catch (e) {
    console.error("[nametag/resolve-batch]", e);
    return NextResponse.json({ ok: false, error: "Erro ao resolver nametags." }, { status: 500 });
  }
}
