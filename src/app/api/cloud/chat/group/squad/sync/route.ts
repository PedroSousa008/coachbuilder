import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";

export const dynamic = "force-dynamic";

function mergeConversation(existing: Conversation[], incoming: Conversation): Conversation[] {
  const idx = existing.findIndex((c) => c.id === incoming.id);
  if (idx < 0) return [...existing, incoming];
  const next = [...existing];
  next[idx] = {
    ...next[idx],
    ...incoming,
    participantIds: Array.from(new Set(incoming.participantIds)),
  };
  return next;
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    if (!byId.has(msg.id)) byId.set(msg.id, msg);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
}

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      conversation?: Conversation;
      messages?: Message[];
    };
    const conversation = body.conversation;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!conversation || conversation.type !== "group" || conversation.id !== "conv-squad") {
      return NextResponse.json({ ok: false, error: "Conversa inválida." }, { status: 400 });
    }
    if (!conversation.participantIds.includes(claims.sub)) {
      return NextResponse.json({ ok: false, error: "Sem acesso ao grupo." }, { status: 403 });
    }

    const targetUserIds = Array.from(
      new Set(conversation.participantIds.filter((id) => id && id !== claims.sub))
    );
    if (targetUserIds.length === 0) {
      return NextResponse.json({ ok: true, updatedUsers: 0 });
    }

    const targetUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true },
    });

    await Promise.all(
      targetUsers.map(async ({ id }) => {
        const row = await prisma.workspace.findUnique({ where: { userId: id } });
        const current = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
        const mergedConversation: Conversation = {
          ...conversation,
          participantIds: Array.from(new Set(conversation.participantIds)),
          subtitle: `${Array.from(new Set(conversation.participantIds)).length} members`,
        };
        const next = {
          ...current,
          conversations: mergeConversation(current.conversations, mergedConversation),
          messages: {
            ...current.messages,
            [conversation.id]: mergeMessages(current.messages[conversation.id] ?? [], messages),
          },
        };
        await prisma.workspace.upsert({
          where: { userId: id },
          create: { userId: id, payload: next as object },
          update: { payload: next as object },
        });
      })
    );

    return NextResponse.json({ ok: true, updatedUsers: targetUsers.length });
  } catch (e) {
    console.error("[chat/group/squad/sync POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao sincronizar grupo." }, { status: 500 });
  }
}
