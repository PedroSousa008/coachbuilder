import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";
import { ptMemberCountSubtitle } from "@/lib/group-chat-messages-pt";

export const dynamic = "force-dynamic";

function timeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function titleTime(conv: Conversation): number {
  return timeMs(conv.titleUpdatedAt);
}

function mergeConversation(existing: Conversation[], incoming: Conversation, actorId: string): Conversation[] {
  const idx = existing.findIndex((c) => c.id === incoming.id);
  if (idx < 0) return [...existing, incoming];
  const current = existing[idx]!;
  if (!current.participantIds.includes(actorId)) return existing;
  const ownerId = current.createdById ?? incoming.createdById;
  const incomingHasNewerTitle = titleTime(incoming) >= titleTime(current);
  const incomingIsNewer = timeMs(incoming.lastMessageAt) >= timeMs(current.lastMessageAt);
  const next = [...existing];
  next[idx] = {
    ...current,
    ...incoming,
    createdById: ownerId,
    title:
      ownerId && actorId !== ownerId
        ? current.title
        : incomingHasNewerTitle
          ? incoming.title
          : current.title,
    titleUpdatedAt: incomingHasNewerTitle
      ? (incoming.titleUpdatedAt ?? incoming.lastMessageAt)
      : (current.titleUpdatedAt ?? current.lastMessageAt),
    avatarInitials:
      ownerId && actorId !== ownerId
        ? current.avatarInitials
        : incomingHasNewerTitle
          ? incoming.avatarInitials
          : current.avatarInitials,
    lastMessageAt: incomingIsNewer ? incoming.lastMessageAt : current.lastMessageAt,
    lastMessagePreview: incomingIsNewer ? incoming.lastMessagePreview : current.lastMessagePreview,
    subtitle: incomingIsNewer ? incoming.subtitle : current.subtitle,
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

  const cloudAuth = await getCloudUserFromSessionCookies();
  if (!cloudAuth) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }
  const { claims } = cloudAuth;

  try {
    const body = (await req.json()) as {
      conversation?: Conversation;
      messages?: Message[];
    };
    const conversation = body.conversation;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!conversation || conversation.type !== "group" || !conversation.id.trim()) {
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
          subtitle: ptMemberCountSubtitle(Array.from(new Set(conversation.participantIds)).length),
        };
        const next = {
          ...current,
          conversations: mergeConversation(current.conversations, mergedConversation, claims.sub),
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
    console.error("[chat/group/sync POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao sincronizar grupo." }, { status: 500 });
  }
}
