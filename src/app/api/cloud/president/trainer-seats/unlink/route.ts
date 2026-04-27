import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";

export const dynamic = "force-dynamic";

function normalizeId(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  const session = await getCloudUserFromSessionCookies();
  if (!session?.user.id) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  if (session.user.coachingRole !== "club-president") {
    return NextResponse.json({ ok: false, error: "Apenas contas Presidente." }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const coachUserId = normalizeId(body.coachUserId);
    if (!coachUserId) {
      return NextResponse.json({ ok: false, error: "coachUserId em falta." }, { status: 400 });
    }

    const coach = await prisma.user.findUnique({
      where: { id: coachUserId },
      select: { id: true, clubPresidentUserId: true },
    });
    if (!coach) {
      return NextResponse.json({ ok: false, error: "Treinador não encontrado." }, { status: 404 });
    }
    if (coach.clubPresidentUserId !== session.user.id) {
      return NextResponse.json({ ok: false, error: "Sem permissão para este treinador." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: coachUserId },
      data: {
        clubPresidentUserId: null,
        trainerSeatIndex: null,
        trainerSeatActive: true,
        sessionInvalidatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[president/trainer-seats/unlink POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao desassociar treinador." }, { status: 500 });
  }
}

