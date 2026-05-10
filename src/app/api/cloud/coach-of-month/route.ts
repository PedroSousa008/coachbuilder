import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultCoachOfMonthContent, normalizeCoachOfMonthContent } from "@/lib/coach-of-month";
import { resolveCoachOfMonthContent } from "@/lib/coach-of-month-resolve";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({
      ok: true,
      payload: defaultCoachOfMonthContent(),
      updatedAt: null,
      source: "default",
    });
  }
  try {
    const row = await (prisma as unknown as { coachOfMonthContent?: { findUnique: Function } }).coachOfMonthContent?.findUnique({
      where: { id: "global" },
      select: { payload: true, updatedAt: true },
    });
    const raw = row?.payload ?? defaultCoachOfMonthContent();
    const normalized = normalizeCoachOfMonthContent(raw);
    const resolved = await resolveCoachOfMonthContent(normalized);
    return NextResponse.json(
      {
        ok: true,
        payload: resolved,
        updatedAt: row?.updatedAt?.toISOString?.() ?? null,
        source: row ? "db" : "default",
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("[coach-of-month GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao carregar Treinador do Mês." }, { status: 500 });
  }
}
