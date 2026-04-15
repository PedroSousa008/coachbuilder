import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import type { FullPersonalizationRequestPublic } from "@/types/personalization";

export const dynamic = "force-dynamic";

type AdminRow = FullPersonalizationRequestPublic & {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userSubscriptionPlan: string;
};

function toRow(row: {
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
  user: { id: string; name: string; email: string; role: string; subscriptionPlan: string };
}): AdminRow {
  return {
    id: row.id,
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    userRole: row.user.role,
    userSubscriptionPlan: row.user.subscriptionPlan,
    status: row.status as AdminRow["status"],
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

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const rows = await prisma.fullPersonalizationRequest.findMany({
      orderBy: [{ requestedAt: "desc" }],
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
      rows: rows.map(toRow),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin/personalization GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar pedidos." }, { status: 500 });
  }
}

