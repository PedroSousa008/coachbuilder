import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";
import type { FullPersonalizationRequestPublic } from "@/types/personalization";
import { resolveSubscriptionAccessForCloudUser } from "@/lib/president-trainer-seat-subscription";

export const dynamic = "force-dynamic";

function toPublic(row: {
  id: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  declinedAt: Date | null;
  scheduledFor: Date | null;
  contactEmail: string;
  notesFromCoach: string | null;
  preferredDateNotes: string | null;
  adminNotes: string | null;
}): FullPersonalizationRequestPublic {
  return {
    id: row.id,
    status: row.status as FullPersonalizationRequestPublic["status"],
    requestedAt: row.requestedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    contactEmail: row.contactEmail,
    notesFromCoach: row.notesFromCoach,
    preferredDateNotes: row.preferredDateNotes,
    adminNotes: row.adminNotes,
  };
}

async function authenticatedUser() {
  const claims = await readSessionFromCookies();
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.email !== claims.email) return null;
  return user;
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud não configurada." }, { status: 503 });
  }
  try {
    const user = await authenticatedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
    }
    const row = await prisma.fullPersonalizationRequest.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        declinedAt: true,
        scheduledFor: true,
        contactEmail: true,
        notesFromCoach: true,
        preferredDateNotes: true,
        adminNotes: true,
      },
    });
    return NextResponse.json({ ok: true, request: row ? toPublic(row) : null });
  } catch (e) {
    console.error("[personalization/request GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao ler pedido." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud não configurada." }, { status: 503 });
  }
  try {
    const user = await authenticatedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sem sessão." }, { status: 401 });
    }

    const access = await resolveSubscriptionAccessForCloudUser(prisma, user);
    if (!access.hasProAccess) {
      return NextResponse.json({ ok: false, error: "Apenas contas Coach Pro podem pedir personalização." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const contactEmailRaw = typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";
    const preferredDateNotesRaw =
      typeof body.preferredDateNotes === "string" ? body.preferredDateNotes.trim() : "";
    const notesFromCoachRaw = typeof body.notesFromCoach === "string" ? body.notesFromCoach.trim() : "";
    const contactEmail = contactEmailRaw || user.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ ok: false, error: "Email de contacto inválido." }, { status: 400 });
    }

    const now = new Date();
    const saved = await prisma.fullPersonalizationRequest.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "requested",
        requestedAt: now,
        contactEmail,
        preferredDateNotes: preferredDateNotesRaw || null,
        notesFromCoach: notesFromCoachRaw || null,
      },
      update: {
        status: "requested",
        requestedAt: now,
        approvedAt: null,
        declinedAt: null,
        scheduledFor: null,
        adminNotes: null,
        contactEmail,
        preferredDateNotes: preferredDateNotesRaw || null,
        notesFromCoach: notesFromCoachRaw || null,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        declinedAt: true,
        scheduledFor: true,
        contactEmail: true,
        notesFromCoach: true,
        preferredDateNotes: true,
        adminNotes: true,
      },
    });

    return NextResponse.json({ ok: true, request: toPublic(saved) });
  } catch (e) {
    console.error("[personalization/request POST]", e);
    return NextResponse.json({ ok: false, error: "Erro ao submeter pedido." }, { status: 500 });
  }
}

