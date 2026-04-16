import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";

export const dynamic = "force-dynamic";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return p
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

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

  const claims = await readSessionFromCookies();
  if (!claims) return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });

  try {
    const body = (await req.json()) as { conversationId?: unknown; title?: unknown };
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!conversationId || !title) {
      return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
    }

    const row = await prisma.workspace.findUnique({ where: { userId: claims.sub } });
    const current = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
    const group = current.conversations.find((c) => c.id === conversationId && c.type === "group");
    if (!group) return NextResponse.json({ ok: false, error: "Grupo não encontrado." }, { status: 404 });
    if (!group.participantIds.includes(claims.sub)) {
      return NextResponse.json({ ok: false, error: "Sem acesso ao grupo." }, { status: 403 });
    }
    if (group.title === title) {
      return NextResponse.json({ ok: true, conversation: group });
    }

    const now = new Date().toISOString();
    const updatedConversation: Conversation = {
      ...group,
      title,
      titleUpdatedAt: now,
      avatarInitials: initials(title),
      lastMessageAt: now,
      lastMessagePreview: `Group renamed to ${title}`,
      createdById: group.createdById ?? claims.sub,
    };
    const renameMessage: Message = {
      id: `m-${crypto.randomUUID()}`,
      conversationId,
      authorId: claims.sub,
      authorName: claims.email,
      body: `Group renamed to ${title}.`,
      sentAt: now,
      system: true,
    };

    const participantIds = Array.from(new Set(group.participantIds));
    const targets = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true },
    });

    await Promise.all(
      targets.map(async ({ id }) => {
        const userRow = await prisma.workspace.findUnique({ where: { userId: id } });
        const userPayload = parseWorkspacePayload(userRow?.payload) ?? emptyWorkspaceSnapshot();
        const next = {
          ...userPayload,
          conversations: mergeConversation(userPayload.conversations, updatedConversation),
          messages: {
            ...userPayload.messages,
            [conversationId]: mergeMessages(userPayload.messages[conversationId] ?? [], [renameMessage]),
          },
        };
        await prisma.workspace.upsert({
          where: { userId: id },
          create: { userId: id, payload: next as object },
          update: { payload: next as object },
        });
      })
    );

    return NextResponse.json({ ok: true, conversation: updatedConversation, message: renameMessage });
  } catch (e) {
    console.error("[chat/group/rename POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao renomear grupo." }, { status: 500 });
  }
}
