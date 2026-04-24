import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { isOwnerAdminEmail } from "@/lib/admin-owner";

export async function requireAdminSession(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await getCloudUserFromSessionCookies();
  if (!session) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 }) };
  }
  let user = session.user;
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
