import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { Message } from "@/types";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const cloudAuth = await getCloudUserFromSessionCookies();
  if (!cloudAuth) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }
  const { claims } = cloudAuth;

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId")?.trim() ?? "";
  const sinceRaw = searchParams.get("since")?.trim() ?? new Date(0).toISOString();
  if (!conversationId) {
    return NextResponse.json({ ok: false, error: "conversationId em falta." }, { status: 400 });
  }

  const sinceDate = new Date(sinceRaw);
  if (!Number.isFinite(sinceDate.getTime())) {
    return NextResponse.json({ ok: false, error: "since inválido." }, { status: 400 });
  }

  try {
    const row = await prisma.workspace.findUnique({ where: { userId: claims.sub } });
    const snapshot = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
    const conv = snapshot.conversations.find((c) => c.id === conversationId && c.type === "group");
    if (!conv || !conv.participantIds.includes(claims.sub)) {
      return NextResponse.json({ ok: false, error: "Sem acesso a esta conversa." }, { status: 403 });
    }

    const list: Message[] = snapshot.messages[conversationId] ?? [];
    const filtered = list
      .filter((m) => new Date(m.sentAt).getTime() > sinceDate.getTime())
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    return NextResponse.json({
      ok: true,
      messages: filtered.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        authorId: m.authorId,
        authorName: m.authorName,
        body: m.body,
        sentAt: m.sentAt,
        attachments: m.attachments ?? undefined,
        system: m.system,
      })),
    });
  } catch (e) {
    console.error("[chat/group/messages GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler mensagens." }, { status: 500 });
  }
}
