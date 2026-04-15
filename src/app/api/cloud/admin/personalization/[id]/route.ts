import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const STATUS = new Set(["requested", "approved", "declined"]);

function parseOptionalDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "ID em falta." }, { status: 400 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const existing = await prisma.fullPersonalizationRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      const st = body.status.trim();
      if (!STATUS.has(st)) {
        return NextResponse.json({ ok: false, error: "Estado inválido." }, { status: 400 });
      }
      data.status = st;
      if (st === "approved") {
        data.approvedAt = new Date();
        data.declinedAt = null;
      } else if (st === "declined") {
        data.declinedAt = new Date();
        data.approvedAt = null;
      } else {
        data.approvedAt = null;
        data.declinedAt = null;
      }
    }

    if (body.scheduledFor !== undefined) {
      const d = parseOptionalDate(body.scheduledFor);
      if (d === undefined && body.scheduledFor !== "" && body.scheduledFor !== null) {
        return NextResponse.json({ ok: false, error: "Data de agenda inválida." }, { status: 400 });
      }
      data.scheduledFor = d;
    }

    if (body.adminNotes !== undefined) {
      if (body.adminNotes == null || body.adminNotes === "") data.adminNotes = null;
      else if (typeof body.adminNotes === "string") data.adminNotes = body.adminNotes.trim().slice(0, 3000);
      else return NextResponse.json({ ok: false, error: "Notas inválidas." }, { status: 400 });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "Nada para atualizar." }, { status: 400 });
    }

    const updated = await prisma.fullPersonalizationRequest.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscriptionPlan: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      row: {
        id: updated.id,
        status: updated.status,
        requestedAt: updated.requestedAt.toISOString(),
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        declinedAt: updated.declinedAt?.toISOString() ?? null,
        scheduledFor: updated.scheduledFor?.toISOString() ?? null,
        contactEmail: updated.contactEmail,
        notesFromCoach: updated.notesFromCoach,
        preferredDateNotes: updated.preferredDateNotes,
        adminNotes: updated.adminNotes,
        userId: updated.user.id,
        userName: updated.user.name,
        userEmail: updated.user.email,
        userRole: updated.user.role,
        userSubscriptionPlan: updated.user.subscriptionPlan,
      },
    });
  } catch (e) {
    console.error("[admin/personalization PATCH]", e);
    return NextResponse.json({ ok: false, error: "Erro ao atualizar pedido." }, { status: 500 });
  }
}

