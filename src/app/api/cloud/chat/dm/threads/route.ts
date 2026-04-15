import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";

export const dynamic = "force-dynamic";

/** Lista conversas DM em que o utilizador da sessão participa (última mensagem por fio). */
export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }
  const me = claims.sub;

  try {
    const rows = await prisma.dmChatMessage.findMany({
      where: {
        OR: [{ threadKey: { startsWith: `dm:${me}:` } }, { threadKey: { endsWith: `:${me}` } }],
      },
      orderBy: { sentAt: "desc" },
      take: 400,
    });

    const latestByThread = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      if (!latestByThread.has(r.threadKey)) latestByThread.set(r.threadKey, r);
    }

    const peerIds = [...latestByThread.keys()]
      .map((tk) => {
        const m = tk.match(/^dm:([^:]+):([^:]+)$/);
        if (!m) return null;
        return m[1] === me ? m[2] : m[1];
      })
      .filter((id): id is string => Boolean(id));

    const uniquePeerIds = [...new Set(peerIds)];
    const users = await prisma.user.findMany({
      where: { id: { in: uniquePeerIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name.trim() || "Utilizador"]));

    const threads = [...latestByThread.entries()].map(([threadKey, msg]) => {
      const m = threadKey.match(/^dm:([^:]+):([^:]+)$/);
      const peerUserId = m ? (m[1] === me ? m[2] : m[1]) : "";
      return {
        peerUserId,
        peerName: nameById.get(peerUserId) ?? "Utilizador",
        lastBody: msg.body,
        lastAt: msg.sentAt.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, threads });
  } catch (e) {
    console.error("[chat/dm/threads GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar conversas." }, { status: 500 });
  }
}
