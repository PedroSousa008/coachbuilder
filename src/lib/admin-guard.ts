import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { isOwnerAdminEmail } from "@/lib/admin-owner";

export async function requireAdminSession(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const claims = await readSessionFromCookies();
  if (!claims) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  }
  let user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  }
  if (isOwnerAdminEmail(user.email) && user.role?.trim().toLowerCase() !== "admin") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    });
  }
  const isAdmin = user.role?.trim().toLowerCase() === "admin";
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Acesso reservado a administradores." }, { status: 403 }),
    };
  }
  return { ok: true, userId: user.id };
}
