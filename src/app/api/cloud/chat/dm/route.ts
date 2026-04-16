import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { dmThreadKey } from "@/lib/dm-conversation-id";
import { parseChatAttachmentsFromApi, validateAttachmentPayload } from "@/lib/chat-attachments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const peerUserId = searchParams.get("peerUserId")?.trim() ?? "";
  const sinceRaw = searchParams.get("since")?.trim() ?? new Date(0).toISOString();
  if (!peerUserId) {
    return NextResponse.json({ ok: false, error: "peerUserId em falta." }, { status: 400 });
  }
  if (peerUserId === claims.sub) {
    return NextResponse.json({ ok: false, error: "peer inválido." }, { status: 400 });
  }

  const sinceDate = new Date(sinceRaw);
  if (!Number.isFinite(sinceDate.getTime())) {
    return NextResponse.json({ ok: false, error: "since inválido." }, { status: 400 });
  }

  try {
    const peer = await prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true } });
    if (!peer) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }

    const threadKey = dmThreadKey(claims.sub, peerUserId);
    const rows = await prisma.dmChatMessage.findMany({
      where: {
        threadKey,
        sentAt: { gt: sinceDate },
      },
      orderBy: { sentAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      messages: rows.map((m) => ({
        id: m.id,
        authorUserId: m.authorUserId,
        authorName: m.authorName,
        body: m.body,
        sentAt: m.sentAt.toISOString(),
        attachments: m.attachments ?? undefined,
      })),
    });
  } catch (e) {
    console.error("[chat/dm GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler mensagens." }, { status: 500 });
  }
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
      peerUserId?: unknown;
      body?: unknown;
      attachments?: unknown;
    };
    const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body : "";
    const attachments = parseChatAttachmentsFromApi(body.attachments);

    const attErr = validateAttachmentPayload(attachments);
    if (attErr) {
      return NextResponse.json({ ok: false, error: attErr }, { status: 400 });
    }

    if (!peerUserId || peerUserId === claims.sub) {
      return NextResponse.json({ ok: false, error: "peerUserId inválido." }, { status: 400 });
    }
    if (!bodyText.trim() && !(attachments && attachments.length > 0)) {
      return NextResponse.json({ ok: false, error: "Mensagem vazia." }, { status: 400 });
    }

    const peer = await prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true } });
    if (!peer) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }

    const me = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { name: true, email: true },
    });
    const authorName = me?.name?.trim() || me?.email || "User";

    const threadKey = dmThreadKey(claims.sub, peerUserId);
    const id = crypto.randomUUID();
    const now = new Date();

    const row = await prisma.dmChatMessage.create({
      data: {
        id,
        threadKey,
        authorUserId: claims.sub,
        authorName,
        body: bodyText,
        sentAt: now,
        attachments: attachments?.length ? (attachments as unknown as object[]) : undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: row.id,
        authorUserId: row.authorUserId,
        authorName: row.authorName,
        body: row.body,
        sentAt: row.sentAt.toISOString(),
        attachments: row.attachments ?? undefined,
      },
    });
  } catch (e) {
    console.error("[chat/dm POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao enviar mensagem." }, { status: 500 });
  }
}
