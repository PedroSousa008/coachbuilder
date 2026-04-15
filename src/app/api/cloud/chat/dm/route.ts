import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import { dmThreadKey } from "@/lib/dm-thread";

export const dynamic = "force-dynamic";

const MAX_BODY = 8000;

export async function GET(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const peerUserId = searchParams.get("peerUserId");
  const sinceRaw = searchParams.get("since");
  if (!peerUserId) {
    return NextResponse.json({ ok: false, error: "peerUserId em falta." }, { status: 400 });
  }
  const me = claims.sub;
  if (peerUserId === me) {
    return NextResponse.json({ ok: false, error: "Inválido." }, { status: 400 });
  }

  const peer = await prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true } });
  if (!peer) {
    return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
  }

  const sinceDate = sinceRaw ? new Date(sinceRaw) : new Date(0);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ ok: false, error: "since inválido." }, { status: 400 });
  }

  const threadKey = dmThreadKey(me, peerUserId);

  try {
    const rows = await prisma.dmChatMessage.findMany({
      where: { threadKey, sentAt: { gt: sinceDate } },
      orderBy: { sentAt: "asc" },
      take: 200,
    });
    return NextResponse.json({
      ok: true,
      messages: rows.map((m) => ({
        id: m.id,
        authorUserId: m.authorUserId,
        authorName: m.authorName,
        body: m.body,
        sentAt: m.sentAt.toISOString(),
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
    const body = (await req.json()) as { peerUserId?: unknown; body?: unknown };
    const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!peerUserId || !text) {
      return NextResponse.json({ ok: false, error: "Dados em falta." }, { status: 400 });
    }
    const me = claims.sub;
    if (peerUserId === me) {
      return NextResponse.json({ ok: false, error: "Inválido." }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ ok: false, error: "Mensagem demasiado longa." }, { status: 400 });
    }

    const peer = await prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true } });
    if (!peer) {
      return NextResponse.json({ ok: false, error: "Destinatário não encontrado." }, { status: 404 });
    }

    const author = await prisma.user.findUnique({ where: { id: me }, select: { name: true } });
    const threadKey = dmThreadKey(me, peerUserId);

    const msg = await prisma.dmChatMessage.create({
      data: {
        threadKey,
        authorUserId: me,
        authorName: author?.name?.trim() || "Coach",
        body: text,
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        authorUserId: msg.authorUserId,
        authorName: msg.authorName,
        body: msg.body,
        sentAt: msg.sentAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[chat/dm POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao enviar." }, { status: 500 });
  }
}
