import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const cloudAuth = await getCloudUserFromSessionCookies();
  if (!cloudAuth) {
    return NextResponse.json({ ok: false, error: "Sessão necessária." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, users: [] });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: cloudAuth.user.id },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { nametag: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        coachingRole: true,
        nametag: true,
      },
      orderBy: [{ name: "asc" }],
      take: 25,
    });

    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        userId: u.id,
        name: u.name,
        subtitle: [u.coachingRole, u.nametag ? `@${u.nametag}` : "", u.email].filter(Boolean).join(" · "),
      })),
    });
  } catch (e) {
    console.error("[cloud/users/search GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao pesquisar contas." }, { status: 500 });
  }
}

