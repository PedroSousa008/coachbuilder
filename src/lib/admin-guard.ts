import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionFromCookies } from "@/lib/cloud-session";

export async function requireAdminSession(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const claims = await readSessionFromCookies();
  if (!claims) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email || user.role !== "admin") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Acesso reservado a administradores." }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}
