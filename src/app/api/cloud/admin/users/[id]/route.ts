import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const PLANS = new Set(["free", "pro_trial", "pro_monthly", "president_pro_monthly", "grace"]);

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
  if (!id) {
    return NextResponse.json({ ok: false, error: "ID em falta." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json({ ok: false, error: "Não é possível alterar o plano da conta admin." }, { status: 400 });
    }

    const data: Prisma.UserUpdateInput = {};

    if (typeof body.subscriptionPlan === "string") {
      const plan = body.subscriptionPlan.trim();
      if (!PLANS.has(plan)) {
        return NextResponse.json(
          { ok: false, error: "Plano inválido (free, pro_trial, pro_monthly, president_pro_monthly, grace)." },
          { status: 400 }
        );
      }
      const prevPlan = target.subscriptionPlan.trim();
      const isPresident = target.coachingRole?.trim().toLowerCase() === "club-president";

      data.subscriptionPlan = plan;
      /** Evita estado incoerente (ex.: plano `free` com trial ainda no futuro → acesso Pro fantasma). */
      if (plan === "free") {
        data.proTrialEndsAt = null;
        data.paymentGraceEndsAt = null;
        data.lastPaymentFailedAt = null;
      }

      /**
       * Presidente «Grátis» pelo Admin = oferta total (comped 0 €), sem Stripe.
       * Só ao mudar de outro plano para `free` e sem `customMonthlyPriceEur` no body — não afecta contas
       * que já estavam em `free` após trial (permanecem com paywall até pagarem).
       */
      if (
        isPresident &&
        plan === "free" &&
        prevPlan !== "free" &&
        !("customMonthlyPriceEur" in body)
      ) {
        data.customMonthlyPriceEur = new Prisma.Decimal("0");
      }

      /**
       * De «oferta» (0 €) para PresidentPro/CoachPro mensal: limpar comped para voltar a exigir Stripe,
       * excepto se o Admin enviar `customMonthlyPriceEur` no mesmo PATCH.
       */
      if (
        isPresident &&
        (plan === "president_pro_monthly" || plan === "pro_monthly") &&
        !("customMonthlyPriceEur" in body)
      ) {
        const prevCustom = target.customMonthlyPriceEur;
        const wasComped =
          prevCustom != null && new Prisma.Decimal(prevCustom).equals(new Prisma.Decimal(0));
        const wasNonMonthly = prevPlan !== "president_pro_monthly" && prevPlan !== "pro_monthly";
        if (wasComped && wasNonMonthly) {
          data.customMonthlyPriceEur = null;
        }
      }
    }

    if (body.subscriptionRenewsAt !== undefined) {
      const d = parseOptionalDate(body.subscriptionRenewsAt);
      if (d === undefined && body.subscriptionRenewsAt !== null && body.subscriptionRenewsAt !== "") {
        return NextResponse.json({ ok: false, error: "subscriptionRenewsAt inválido." }, { status: 400 });
      }
      data.subscriptionRenewsAt = d === undefined ? undefined : d;
    }

    if (body.proTrialEndsAt !== undefined) {
      const d = parseOptionalDate(body.proTrialEndsAt);
      if (d === undefined && body.proTrialEndsAt !== null && body.proTrialEndsAt !== "") {
        return NextResponse.json({ ok: false, error: "proTrialEndsAt inválido." }, { status: 400 });
      }
      data.proTrialEndsAt = d === undefined ? undefined : d;
    }

    if (body.paymentGraceEndsAt !== undefined) {
      const d = parseOptionalDate(body.paymentGraceEndsAt);
      if (d === undefined && body.paymentGraceEndsAt !== null && body.paymentGraceEndsAt !== "") {
        return NextResponse.json({ ok: false, error: "paymentGraceEndsAt inválido." }, { status: 400 });
      }
      data.paymentGraceEndsAt = d === undefined ? undefined : d;
    }

    if (body.lastPaymentFailedAt !== undefined) {
      const d = parseOptionalDate(body.lastPaymentFailedAt);
      if (d === undefined && body.lastPaymentFailedAt !== null && body.lastPaymentFailedAt !== "") {
        return NextResponse.json({ ok: false, error: "lastPaymentFailedAt inválido." }, { status: 400 });
      }
      data.lastPaymentFailedAt = d === undefined ? undefined : d;
    }

    if (body.customMonthlyPriceEur !== undefined) {
      if (body.customMonthlyPriceEur === null || body.customMonthlyPriceEur === "") {
        data.customMonthlyPriceEur = null;
      } else {
        const n = Number(body.customMonthlyPriceEur);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ ok: false, error: "customMonthlyPriceEur inválido." }, { status: 400 });
        }
        data.customMonthlyPriceEur = new Prisma.Decimal(n.toFixed(2));
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "Nada para atualizar." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionRenewsAt: true,
        proTrialEndsAt: true,
        paymentGraceEndsAt: true,
        lastPaymentFailedAt: true,
        customMonthlyPriceEur: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("[admin/users PATCH]", e);
    return NextResponse.json({ ok: false, error: "Erro ao atualizar." }, { status: 500 });
  }
}
