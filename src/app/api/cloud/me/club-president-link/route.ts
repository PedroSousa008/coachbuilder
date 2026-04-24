import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";

export const dynamic = "force-dynamic";

function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

async function sessionUser() {
  const s = await getCloudUserFromSessionCookies();
  return s?.user ?? null;
}

/** Estado da ligação treinador → presidente (conta actual). */
export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  try {
    const me = await sessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });

    if (!me.clubPresidentUserId) {
      return NextResponse.json({ ok: true, linked: false, presidentEmail: null, presidentId: null });
    }
    const president = await prisma.user.findUnique({
      where: { id: me.clubPresidentUserId },
      select: { id: true, email: true, coachingRole: true },
    });
    if (!president || president.coachingRole !== "club-president") {
      return NextResponse.json({ ok: true, linked: false, presidentEmail: null, presidentId: null });
    }
    return NextResponse.json({
      ok: true,
      linked: true,
      presidentEmail: president.email,
      presidentId: president.id,
    });
  } catch (e) {
    console.error("[club-president-link GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler ligação." }, { status: 500 });
  }
}

/** Liga a conta actual a um presidente (email da conta com função Presidente). */
export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  try {
    const me = await sessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });

    if (me.coachingRole === "club-president") {
      return NextResponse.json({ ok: false, error: "Contas presidente não ligam aqui." }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const presidentEmail = normalizeEmail(body.presidentEmail);
    if (!presidentEmail || !presidentEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "Indica o email de login do presidente." }, { status: 400 });
    }

    const president = await prisma.user.findFirst({
      where: { email: presidentEmail, coachingRole: "club-president" },
      select: { id: true, email: true },
    });
    if (!president) {
      return NextResponse.json(
        { ok: false, error: "Não encontrámos uma conta com função Presidente e esse email." },
        { status: 404 }
      );
    }
    if (president.id === me.id) {
      return NextResponse.json({ ok: false, error: "Não podes ligar a ti próprio." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { clubPresidentUserId: president.id },
    });

    return NextResponse.json({ ok: true, presidentEmail: president.email, presidentId: president.id });
  } catch (e) {
    console.error("[club-president-link POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao guardar ligação." }, { status: 500 });
  }
}

/** Remove a ligação à conta do presidente. */
export async function DELETE() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }
  try {
    const me = await sessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });

    await prisma.user.update({
      where: { id: me.id },
      data: { clubPresidentUserId: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[club-president-link DELETE]", e);
    return NextResponse.json({ ok: false, error: "Erro ao remover ligação." }, { status: 500 });
  }
}
