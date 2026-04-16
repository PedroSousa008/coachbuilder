import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { peerUserIdFromThreadKey } from "@/lib/dm-conversation-id";
import { messagePreviewLine, parseChatAttachmentsFromApi } from "@/lib/chat-attachments";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }

  try {
    const rows = await prisma.dmChatMessage.findMany({
      where: {
        OR: [
          { threadKey: { startsWith: `${claims.sub}__` } },
          { threadKey: { endsWith: `__${claims.sub}` } },
        ],
      },
      orderBy: { sentAt: "desc" },
    });

    const seen = new Set<string>();
    const threads: Array<{ peerUserId: string; peerName: string; lastBody: string; lastAt: string }> = [];

    for (const row of rows) {
      if (seen.has(row.threadKey)) continue;
      seen.add(row.threadKey);
      const peer = peerUserIdFromThreadKey(row.threadKey, claims.sub);
      if (!peer) continue;

      const peerUser = await prisma.user.findUnique({
        where: { id: peer },
        select: { name: true, email: true },
      });
      const peerName = peerUser?.name?.trim() || peerUser?.email || "User";
      const attachments = parseChatAttachmentsFromApi(row.attachments);
      const lastBody = messagePreviewLine(row.body, attachments);

      threads.push({
        peerUserId: peer,
        peerName,
        lastBody,
        lastAt: row.sentAt.toISOString(),
      });
    }

    threads.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    return NextResponse.json({ ok: true, threads });
  } catch (e) {
    console.error("[chat/dm/threads GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar conversas." }, { status: 500 });
  }
}
