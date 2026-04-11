import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPasswordNode } from "@/lib/password-node";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { createSessionToken, setSessionCookie } from "@/lib/cloud-session";
import { isOwnerAdminEmail } from "@/lib/admin-owner";
import { recordUserLoginSafe } from "@/lib/server-analytics";
import { toCloudUserPublic } from "@/lib/cloud-user-public";

export const dynamic = "force-dynamic";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json(
      { ok: false, error: "Sincronização cloud não está configurada no servidor." },
      { status: 503 }
    );
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const norm = normalizeEmail(email);
    if (!norm || !password) {
      return NextResponse.json({ ok: false, error: "Email e palavra-passe são obrigatórios." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: norm } });
    if (!user || !verifyPasswordNode(password, user.salt, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "Email ou palavra-passe incorretos." }, { status: 401 });
    }

    if (isOwnerAdminEmail(user.email) && user.role?.trim().toLowerCase() !== "admin") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    }

    await recordUserLoginSafe(user.id, user.email);

    const token = await createSessionToken(user.id, user.email);
    await setSessionCookie(token);

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh) {
      return NextResponse.json({ ok: false, error: "Erro interno." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user: toCloudUserPublic(fresh),
    });
  } catch (e) {
    console.error("[cloud/login]", e);
    return NextResponse.json({ ok: false, error: "Erro ao entrar." }, { status: 500 });
  }
}
