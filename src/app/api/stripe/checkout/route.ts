import { NextResponse } from "next/server";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { readSessionFromCookies } from "@/lib/cloud-session";

/**
 * Checkout Stripe — placeholder até configurares STRIPE_SECRET_KEY e Customer Portal.
 * Em produção: criar Session com price mensal e devolver { url }.
 */
export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud não configurada." }, { status: 503 });
  }
  const claims = await readSessionFromCookies();
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Inicia sessão para subscrever." }, { status: 401 });
  }
  return NextResponse.json(
    {
      ok: false,
      error:
        "O checkout Stripe ainda não está ligado no servidor. Define STRIPE_SECRET_KEY e cria o preço Coach Pro (6,99 €/mês).",
    },
    { status: 501 }
  );
}
