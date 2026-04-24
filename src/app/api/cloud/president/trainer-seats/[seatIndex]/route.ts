import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { hashPasswordNode } from "@/lib/password-node";
import { PRESIDENT_INCLUDED_COACH_SEATS } from "@/lib/president-constants";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ seatIndex: string }> };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

async function requirePresident() {
  const session = await getCloudUserFromSessionCookies();
  if (!session) return { response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  if (session.user.coachingRole !== "club-president") {
    return { response: NextResponse.json({ ok: false, error: "Apenas contas Presidente." }, { status: 403 }) };
  }
  return { president: session.user };
}

function parseSeat(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

async function maxSeatsForPresident(presidentId: string): Promise<number> {
  const p = await prisma.user.findUnique({
    where: { id: presidentId },
    select: { trainerExtraSeatsPurchased: true },
  });
  const extra = Math.max(0, p?.trainerExtraSeatsPurchased ?? 0);
  return PRESIDENT_INCLUDED_COACH_SEATS + extra;
}

/**
 * Presidente altera email e/ou palavra-passe do treinador deste lugar.
 * Qualquer alteração invalida sessões JWT antigas — o treinador tem de voltar a entrar com as credenciais correctas.
 */
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
  const maxSeats = await maxSeatsForPresident(gate.president.id);
  if (seatIndex >= maxSeats) {
    return NextResponse.json({ ok: false, error: `Índice inválido. Máximo atual: ${maxSeats - 1}.` }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const slotUser = await prisma.user.findFirst({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: seatIndex },
    });
    if (!slotUser) {
      return NextResponse.json({ ok: false, error: "Este lugar está vazio." }, { status: 404 });
    }

    const normEmail = emailRaw ? normalizeEmail(emailRaw) : "";
    const emailChangeRequested = normEmail.length > 0 && normEmail !== normalizeEmail(slotUser.email);
    const passwordChangeRequested = password.length > 0;

    if (!emailChangeRequested && !passwordChangeRequested) {
      return NextResponse.json(
        { ok: false, error: "Indica um novo email (diferente do actual) ou uma nova palavra-passe (mín. 8 caracteres)." },
        { status: 400 }
      );
    }

    if (emailChangeRequested) {
      if (!isValidEmail(normEmail)) {
        return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
      }
      if (normEmail === normalizeEmail(gate.president.email)) {
        return NextResponse.json({ ok: false, error: "Não podes usar o teu próprio email de presidente." }, { status: 400 });
      }
      const taken = await prisma.user.findUnique({ where: { email: normEmail } });
      if (taken && taken.id !== slotUser.id) {
        return NextResponse.json({ ok: false, error: "Já existe uma conta com este email." }, { status: 409 });
      }
    }

    if (passwordChangeRequested && password.length < 8) {
      return NextResponse.json({ ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const now = new Date();
    const displayName =
      emailChangeRequested && normEmail
        ? normEmail.split("@")[0]?.slice(0, 120) || slotUser.name
        : slotUser.name;

    const pwd =
      passwordChangeRequested && password.length >= 8 ? hashPasswordNode(password) : null;

    await prisma.user.update({
      where: { id: slotUser.id },
      data: {
        ...(emailChangeRequested && normEmail ? { email: normEmail, name: displayName } : {}),
        ...(pwd ? { passwordHash: pwd.hash, salt: pwd.salt } : {}),
        sessionInvalidatedAt: now,
      },
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
  const maxSeats = await maxSeatsForPresident(gate.president.id);
  if (seatIndex >= maxSeats) {
    return NextResponse.json({ ok: false, error: `Índice inválido. Máximo atual: ${maxSeats - 1}.` }, { status: 400 });
  }

  try {
    const slotUser = await prisma.user.findFirst({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: seatIndex },
    });
    if (!slotUser) {
      return NextResponse.json({ ok: false, error: "Este lugar está vazio." }, { status: 404 });
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: slotUser.id },
      data: {
        clubPresidentUserId: null,
        trainerSeatIndex: null,
        trainerSeatActive: true,
        sessionInvalidatedAt: now,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[president/trainer-seats DELETE]", e);
    return NextResponse.json({ ok: false, error: "Erro ao revogar." }, { status: 500 });
  }
}
