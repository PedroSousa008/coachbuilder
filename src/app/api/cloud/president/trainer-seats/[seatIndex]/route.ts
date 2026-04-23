import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { hashPasswordNode } from "@/lib/password-node";
import { PRESIDENT_INCLUDED_COACH_SEATS } from "@/lib/president-constants";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ seatIndex: string }> };

async function requirePresident() {
  const claims = await readSessionFromCookies();
  if (!claims) return { response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email) {
    return { response: NextResponse.json({ ok: false, error: "Sessão inválida." }, { status: 401 }) };
  }
  if (user.coachingRole !== "club-president") {
    return { response: NextResponse.json({ ok: false, error: "Apenas contas Presidente." }, { status: 403 }) };
  }
  return { president: user };
}

function parseSeat(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n >= PRESIDENT_INCLUDED_COACH_SEATS) return null;
  return n;
}

/** Presidente define nova palavra-passe do treinador deste lugar (o treinador deixa de entrar com a antiga). */
export async function PATCH(req: Request, ctx: RouteCtx) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  const gate = await requirePresident();
  if ("response" in gate) return gate.response;

  const seatIndex = parseSeat((await ctx.params).seatIndex ?? "");
  if (seatIndex == null) {
    return NextResponse.json({ ok: false, error: "Índice de lugar inválido." }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const slotUser = await prisma.user.findFirst({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: seatIndex },
    });
    if (!slotUser) {
      return NextResponse.json({ ok: false, error: "Este lugar está vazio." }, { status: 404 });
    }

    const { salt, hash } = hashPasswordNode(password);
    await prisma.user.update({
      where: { id: slotUser.id },
      data: { passwordHash: hash, salt },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[president/trainer-seats PATCH]", e);
    return NextResponse.json({ ok: false, error: "Erro ao actualizar." }, { status: 500 });
  }
}

/** Revoga o lugar: o treinador deixa de estar ligado ao clube e deixa de herdar o Pro do presidente. */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  const gate = await requirePresident();
  if ("response" in gate) return gate.response;

  const seatIndex = parseSeat((await ctx.params).seatIndex ?? "");
  if (seatIndex == null) {
    return NextResponse.json({ ok: false, error: "Índice de lugar inválido." }, { status: 400 });
  }

  try {
    const slotUser = await prisma.user.findFirst({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: seatIndex },
    });
    if (!slotUser) {
      return NextResponse.json({ ok: false, error: "Este lugar está vazio." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: slotUser.id },
      data: {
        clubPresidentUserId: null,
        trainerSeatIndex: null,
        trainerSeatActive: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[president/trainer-seats DELETE]", e);
    return NextResponse.json({ ok: false, error: "Erro ao revogar." }, { status: 500 });
  }
}
