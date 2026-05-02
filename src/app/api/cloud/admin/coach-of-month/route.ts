import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-guard";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { defaultCoachOfMonthContent, normalizeCoachOfMonthContent } from "@/lib/coach-of-month";
import { resolveCoachOfMonthContent } from "@/lib/coach-of-month-resolve";
import { applyCoachOfMonthHonorsAfterPublish } from "@/lib/coach-of-month-honors-sync";

export const dynamic = "force-dynamic";

type Body = { payload?: unknown };

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  try {
    const row = await (prisma as unknown as { coachOfMonthContent?: { findUnique: Function } }).coachOfMonthContent?.findUnique({
      where: { id: "global" },
      select: { payload: true, updatedAt: true },
    });
    const normalized = normalizeCoachOfMonthContent(row?.payload ?? defaultCoachOfMonthContent());
    const resolved = await resolveCoachOfMonthContent(normalized);
    return NextResponse.json({
      ok: true,
      payload: resolved,
      updatedAt: row?.updatedAt?.toISOString?.() ?? null,
    });
  } catch (e) {
    console.error("[admin/coach-of-month GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao carregar conteúdo." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Body;
    const normalized = normalizeCoachOfMonthContent(body.payload);
    const resolved = await resolveCoachOfMonthContent(normalized);
    const row = await (prisma as unknown as { coachOfMonthContent?: { upsert: Function } }).coachOfMonthContent?.upsert({
      where: { id: "global" },
      create: { id: "global", payload: resolved as unknown as object, updatedByUserId: gate.userId },
      update: { payload: resolved as unknown as object, updatedByUserId: gate.userId },
      select: { updatedAt: true },
    });
    try {
      await applyCoachOfMonthHonorsAfterPublish(resolved);
    } catch (e) {
      console.error("[admin/coach-of-month PUT] palmarés Treinador do Mês", e);
    }
    return NextResponse.json({
      ok: true,
      payload: resolved,
      updatedAt: row?.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin/coach-of-month PUT]", e);
    return NextResponse.json({ ok: false, error: "Erro ao guardar conteúdo." }, { status: 500 });
  }
}
