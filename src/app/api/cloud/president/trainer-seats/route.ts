import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { hashPasswordNode } from "@/lib/password-node";
import { recordAccountCreatedSafe } from "@/lib/server-analytics";
import { PRESIDENT_INCLUDED_COACH_SEATS } from "@/lib/president-constants";
import { emptyWorkspaceSnapshot, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { allocateUniqueNametag, isPrismaNametagConflict } from "@/lib/user-nametag";

export const dynamic = "force-dynamic";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

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

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  const gate = await requirePresident();
  if ("response" in gate) return gate.response;

  try {
    const users = await prisma.user.findMany({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: { not: null } },
      select: { id: true, email: true, name: true, trainerSeatIndex: true, trainerSeatActive: true },
    });
    const byIndex = new Map(users.map((u) => [u.trainerSeatIndex as number, u]));
    const slots = [];
    for (let i = 0; i < PRESIDENT_INCLUDED_COACH_SEATS; i += 1) {
      const u = byIndex.get(i);
      if (!u) {
        slots.push({ index: i, status: "empty" as const });
      } else {
        slots.push({
          index: i,
          status: u.trainerSeatActive ? ("active" as const) : ("revoked" as const),
          email: u.email,
          name: u.name,
          userId: u.id,
        });
      }
    }
    return NextResponse.json({ ok: true, slots, maxSeats: PRESIDENT_INCLUDED_COACH_SEATS });
  } catch (e) {
    console.error("[president/trainer-seats GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar lugares." }, { status: 500 });
  }
}

/** Cria conta de treinador num lugar (0–9): email + password; acesso CoachPro via subscrição do presidente. */
export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  const gate = await requirePresident();
  if ("response" in gate) return gate.response;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const seatIndex = typeof body.seatIndex === "number" ? body.seatIndex : Number(body.seatIndex);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= PRESIDENT_INCLUDED_COACH_SEATS) {
      return NextResponse.json({ ok: false, error: `Indica o lugar (0 a ${PRESIDENT_INCLUDED_COACH_SEATS - 1}).` }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const norm = normalizeEmail(email);
    if (norm === normalizeEmail(gate.president.email)) {
      return NextResponse.json({ ok: false, error: "Não podes usar o teu próprio email de presidente." }, { status: 400 });
    }

    const occupant = await prisma.user.findFirst({
      where: { clubPresidentUserId: gate.president.id, trainerSeatIndex: seatIndex },
    });
    if (occupant) {
      return NextResponse.json(
        {
          ok: false,
          error: occupant.trainerSeatActive
            ? "Este lugar já está ocupado. Revoga primeiro ou escolhe outro."
            : "Este lugar ainda está reservado a uma conta inactiva. Revoga o lugar para libertar.",
        },
        { status: 409 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: norm } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Já existe uma conta com este email. Usa outro email ou revoga o lugar antigo." },
        { status: 409 }
      );
    }

    const displayName = norm.split("@")[0]?.slice(0, 120) || "Treinador";
    const { salt, hash } = hashPasswordNode(password);
    const workspacePayload: WorkspaceSnapshotV1 = emptyWorkspaceSnapshot();

    let created = null as Awaited<ReturnType<typeof prisma.user.create>> | null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const nametag = await allocateUniqueNametag(prisma, { name: displayName, email: norm });
      try {
        created = await prisma.user.create({
          data: {
            email: norm,
            name: displayName,
            nametag,
            coachingRole: "head-coach",
            passwordHash: hash,
            salt,
            role: "user",
            subscriptionPlan: "free",
            clubPresidentUserId: gate.president.id,
            trainerSeatIndex: seatIndex,
            trainerSeatActive: true,
            workspace: { create: { payload: workspacePayload as object } },
          },
        });
        break;
      } catch (e) {
        if (isPrismaNametagConflict(e)) continue;
        throw e;
      }
    }
    if (!created) {
      return NextResponse.json({ ok: false, error: "Não foi possível criar a conta." }, { status: 500 });
    }

    await recordAccountCreatedSafe(created.id, norm, "president_trainer_seat");

    return NextResponse.json({
      ok: true,
      seatIndex,
      email: created.email,
      userId: created.id,
    });
  } catch (e) {
    console.error("[president/trainer-seats POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao criar treinador." }, { status: 500 });
  }
}
