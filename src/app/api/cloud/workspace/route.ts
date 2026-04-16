import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { emptyWorkspaceSnapshot, parseWorkspacePayload, type WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";

function timeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function titleTime(conv: Conversation | undefined): number {
  if (!conv) return 0;
  return timeMs(conv.titleUpdatedAt);
}

function mergeConversationLists(
  incoming: Conversation[],
  existing: Conversation[],
  actorUserId: string
): Conversation[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const conv of incoming) {
    byId.set(conv.id, conv);
  }
  const groupIds = new Set(
    [...existing, ...incoming].filter((c) => c.type === "group").map((c) => c.id)
  );
  for (const groupId of groupIds) {
    const existingGroup = existing.find((c) => c.id === groupId && c.type === "group");
    const incomingGroup = incoming.find((c) => c.id === groupId && c.type === "group");
    if (!existingGroup) continue;
    const incomingIsNewer = timeMs(incomingGroup?.lastMessageAt) >= timeMs(existingGroup.lastMessageAt);
    const incomingHasNewerTitle = titleTime(incomingGroup) >= titleTime(existingGroup);
    byId.set(groupId, {
      ...existingGroup,
      ...(incomingGroup ?? {}),
      createdById: existingGroup.createdById ?? incomingGroup?.createdById,
      title:
        (existingGroup.createdById ?? incomingGroup?.createdById) &&
        actorUserId !== (existingGroup.createdById ?? incomingGroup?.createdById)
          ? existingGroup.title
          : incomingHasNewerTitle
            ? (incomingGroup?.title ?? existingGroup.title)
            : existingGroup.title,
      titleUpdatedAt: incomingHasNewerTitle
        ? (incomingGroup?.titleUpdatedAt ?? incomingGroup?.lastMessageAt ?? existingGroup.titleUpdatedAt ?? existingGroup.lastMessageAt)
        : (existingGroup.titleUpdatedAt ?? existingGroup.lastMessageAt),
      avatarInitials:
        (existingGroup.createdById ?? incomingGroup?.createdById) &&
        actorUserId !== (existingGroup.createdById ?? incomingGroup?.createdById)
          ? existingGroup.avatarInitials
          : incomingHasNewerTitle
            ? (incomingGroup?.avatarInitials ?? existingGroup.avatarInitials)
            : existingGroup.avatarInitials,
      lastMessageAt: incomingIsNewer
        ? (incomingGroup?.lastMessageAt ?? existingGroup.lastMessageAt)
        : existingGroup.lastMessageAt,
      lastMessagePreview: incomingIsNewer
        ? (incomingGroup?.lastMessagePreview ?? existingGroup.lastMessagePreview)
        : existingGroup.lastMessagePreview,
      subtitle: incomingIsNewer
        ? (incomingGroup?.subtitle ?? existingGroup.subtitle)
        : existingGroup.subtitle,
      participantIds: Array.from(
        new Set([
          ...existingGroup.participantIds,
          ...(incomingGroup?.participantIds ?? []),
        ])
      ),
    });
  }
  return [...byId.values()];
}

function mergeMessageLists(incoming: Message[], existing: Message[]): Message[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    if (!byId.has(msg.id)) byId.set(msg.id, msg);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
}

function mergeWorkspacePayload(
  incoming: WorkspaceSnapshotV1,
  existing: WorkspaceSnapshotV1,
  actorUserId: string
): WorkspaceSnapshotV1 {
  const mergedConversations = mergeConversationLists(incoming.conversations, existing.conversations, actorUserId);
  const mergedMessages = { ...existing.messages, ...incoming.messages };
  for (const group of mergedConversations.filter((c) => c.type === "group")) {
    mergedMessages[group.id] = mergeMessageLists(
      incoming.messages[group.id] ?? [],
      existing.messages[group.id] ?? []
    );
  }
  return {
    ...incoming,
    conversations: mergedConversations,
    messages: mergedMessages,
  };
}

async function requireUserId(): Promise<string | null> {
  const claims = await readSessionFromCookies();
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email) return null;
  return user.id;
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const row = await prisma.workspace.findUnique({ where: { userId } });
    if (!row) {
      return NextResponse.json({
        ok: true,
        updatedAt: null,
        payload: null,
      });
    }

    const payload = parseWorkspacePayload(row.payload) ?? emptyWorkspaceSnapshot();
    return NextResponse.json({
      ok: true,
      updatedAt: row.updatedAt.toISOString(),
      payload,
    });
  } catch (e) {
    console.error("[cloud/workspace GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler dados." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseWorkspacePayload(body.payload);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
    }

    const incomingPayload: WorkspaceSnapshotV1 = { ...parsed, version: 1 };
    const existingRow = await prisma.workspace.findUnique({ where: { userId } });
    const existingPayload = parseWorkspacePayload(existingRow?.payload) ?? emptyWorkspaceSnapshot();
    const payload = mergeWorkspacePayload(incomingPayload, existingPayload, userId);

    await prisma.workspace.upsert({
      where: { userId },
      create: { userId, payload: payload as object },
      update: { payload: payload as object },
    });

    const row = await prisma.workspace.findUnique({ where: { userId } });
    return NextResponse.json({
      ok: true,
      updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cloud/workspace PUT]", e);
    return NextResponse.json({ ok: false, error: "Erro ao guardar dados." }, { status: 500 });
  }
}
