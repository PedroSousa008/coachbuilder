import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";
import {
  ptMemberCountSubtitle,
  ptMemberRemovedBody,
  ptMemberRemovedPreview,
} from "@/lib/group-chat-messages-pt";

export const dynamic = "force-dynamic";

function mergeConversation(existing: Conversation[], incoming: Conversation): Conversation[] {
  const idx = existing.findIndex((c) => c.id === incoming.id);
  if (idx < 0) return [...existing, incoming];
  const next = [...existing];
  next[idx] = { ...next[idx], ...incoming };
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
  if (!cloudAuth) return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  const { claims } = cloudAuth;

  try {
    const body = (await req.json()) as { conversationId?: unknown; participantId?: unknown };
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const participantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
    if (!conversationId || !participantId) {
      return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
    }

    const row = await prisma.workspace.findUnique({ where: { userId: claims.sub } });
    const current = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
    const group = current.conversations.find((c) => c.id === conversationId && c.type === "group");
    if (!group) return NextResponse.json({ ok: false, error: "Grupo não encontrado." }, { status: 404 });
    if (!group.participantIds.includes(claims.sub)) {
      return NextResponse.json({ ok: false, error: "Sem acesso ao grupo." }, { status: 403 });
    }
    if (!group.participantIds.includes(participantId)) {
      return NextResponse.json({ ok: false, error: "Membro não está no grupo." }, { status: 400 });
    }
    if (participantId === claims.sub) {
      return NextResponse.json({ ok: false, error: "Não podes expulsar-te." }, { status: 400 });
    }

    const actorIsAdmin =
      group.groupPrimaryAdminId === claims.sub || Boolean(group.groupAdminIds?.includes(claims.sub));
    const addedByActor = group.groupMemberMeta?.[participantId]?.addedById === claims.sub;
    if (!actorIsAdmin && !addedByActor) {
      return NextResponse.json({ ok: false, error: "Sem permissão para expulsar." }, { status: 403 });
    }

    const actorRow = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { name: true, email: true },
    });
    const actorLabel = actorRow?.name?.trim() || actorRow?.email || claims.email;

    const now = new Date().toISOString();
    const nextParticipantIds = group.participantIds.filter((id) => id !== participantId);
    const nextMemberMeta = { ...(group.groupMemberMeta ?? {}) };
    delete nextMemberMeta[participantId];
    const nextAdminIds = (group.groupAdminIds ?? []).filter((id) => id !== participantId);
    const nextPrimaryAdminId =
      group.groupPrimaryAdminId === participantId ? nextParticipantIds[0] ?? claims.sub : group.groupPrimaryAdminId;

    const updatedConversation: Conversation = {
      ...group,
      participantIds: nextParticipantIds,
      groupMemberMeta: nextMemberMeta,
      groupAdminIds: nextAdminIds,
      groupPrimaryAdminId: nextPrimaryAdminId,
      subtitle: ptMemberCountSubtitle(nextParticipantIds.length),
      lastMessageAt: now,
      lastMessagePreview: ptMemberRemovedPreview(actorLabel),
    };
    const systemMessage: Message = {
      id: `m-${crypto.randomUUID()}`,
      conversationId,
      authorId: claims.sub,
      authorName: actorLabel,
      body: ptMemberRemovedBody(),
      sentAt: now,
      system: true,
    };

    const allTouchedUserIds = Array.from(new Set([...group.participantIds, participantId]));
    const targets = await prisma.user.findMany({
      where: { id: { in: allTouchedUserIds } },
      select: { id: true },
    });

    await Promise.all(
      targets.map(async ({ id }) => {
        const userRow = await prisma.workspace.findUnique({ where: { userId: id } });
        const userPayload = parseWorkspacePayload(userRow?.payload) ?? emptyWorkspaceSnapshot();
        const isRemovedUser = id === participantId;
        const nextConversations = isRemovedUser
          ? userPayload.conversations.filter((c) => c.id !== conversationId)
          : mergeConversation(userPayload.conversations, updatedConversation);
        const nextMessages = { ...userPayload.messages };
        if (isRemovedUser) {
          delete nextMessages[conversationId];
        } else {
          nextMessages[conversationId] = mergeMessages(nextMessages[conversationId] ?? [], [systemMessage]);
        }
        const next = {
          ...userPayload,
          conversations: nextConversations,
          messages: nextMessages,
        };
        await prisma.workspace.upsert({
          where: { userId: id },
          create: { userId: id, payload: next as object },
          update: { payload: next as object },
        });
      })
    );

    return NextResponse.json({
      ok: true,
      conversation: updatedConversation,
      message: systemMessage,
    });
  } catch (e) {
    console.error("[chat/group/remove-member POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao remover membro." }, { status: 500 });
  }
}
