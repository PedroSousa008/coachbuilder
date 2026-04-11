import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const PLANS = new Set(["free", "pro_monthly"]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "ID em falta." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const plan = typeof body.subscriptionPlan === "string" ? body.subscriptionPlan.trim() : "";
    if (!PLANS.has(plan)) {
      return NextResponse.json({ ok: false, error: "Plano inválido (free ou pro_monthly)." }, { status: 400 });
    }

    let renews: Date | null = null;
    if (body.subscriptionRenewsAt != null) {
      if (body.subscriptionRenewsAt === "" || body.subscriptionRenewsAt === null) {
        renews = null;
      } else if (typeof body.subscriptionRenewsAt === "string") {
        const d = new Date(body.subscriptionRenewsAt);
        renews = Number.isNaN(d.getTime()) ? null : d;
      }
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json({ ok: false, error: "Não é possível alterar o plano da conta admin." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        subscriptionPlan: plan,
        ...(body.subscriptionRenewsAt !== undefined ? { subscriptionRenewsAt: renews } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionRenewsAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("[admin/users PATCH]", e);
    return NextResponse.json({ ok: false, error: "Erro ao atualizar." }, { status: 500 });
  }
}
