import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { presidentCanAccessCoachWorkspace } from "@/lib/president-cloud-server";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { buildPresidentLinkedCoachBrief } from "@/lib/president-linked-coach-brief";
import { requirePresidentPremiumAccess } from "@/lib/require-president-premium-server";

export const dynamic = "force-dynamic";

const MAX = 24;

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const premium = await requirePresidentPremiumAccess();
    if (!premium.ok) return premium.response;
    const presidentId = premium.user.id;

    const body = (await req.json()) as { coachUserIds?: unknown };
    const raw = Array.isArray(body.coachUserIds) ? body.coachUserIds : [];
    const ids = [...new Set(raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean))].slice(0, MAX);

    const briefs: Record<string, ReturnType<typeof buildPresidentLinkedCoachBrief>> = {};

    for (const coachUserId of ids) {
      const ok = await presidentCanAccessCoachWorkspace(presidentId, coachUserId);
      if (!ok) continue;
      const userRow = await prisma.user.findUnique({
        where: { id: coachUserId },
        select: { email: true },
      });
      const email = userRow?.email ?? "";
      const row = await prisma.workspace.findUnique({ where: { userId: coachUserId } });
      const snap = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
      briefs[coachUserId] = buildPresidentLinkedCoachBrief(coachUserId, email, snap);
    }

    return NextResponse.json({ ok: true, briefs });
  } catch (e) {
    console.error("[president/linked-coaches-brief POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao carregar dados." }, { status: 500 });
  }
}
