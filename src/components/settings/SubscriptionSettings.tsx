"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";

export function SubscriptionSettings() {
  const { user, refreshUserFromCloud } = useAuth();
  const searchParams = useSearchParams();
  const locked = searchParams.get("subscription") === "locked";

  const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
  const full = hasFullWorkspaceAccess(user, ownerListed);
  const access = user?.subscriptionAccess;
  const mode = access?.effectiveMode ?? "free";

  const startCheckout = async () => {
    const res = await fetch("/api/stripe/checkout", { method: "POST", credentials: "include" });
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (res.ok && data.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    window.alert(data.error || "O pagamento automático (Stripe) ainda não está configurado no servidor.");
  };

  return (
    <div className="space-y-6">
      {locked && !full ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          O teu plano Free inclui apenas o chat de equipa e mensagens diretas. Os teus dados (táticas, treinos, etc.)
          continuam guardados — subscreve o Coach Pro para voltares a aceder.
        </div>
      ) : null}

      <div>
        <h2 className="font-display text-lg font-semibold text-white">Subscrição</h2>
        <p className="text-sm text-zinc-500">
          Novas contas têm <strong className="text-zinc-300">7 dias de Coach Pro grátis</strong>. O preço público de
          referência do Coach Pro é{" "}
          <strong className="text-zinc-300">{(access?.defaultPriceEur ?? 6.99).toFixed(2)} €/mês</strong>
          {access?.adminMonthlyPriceEur != null ? (
            <>
              . <strong className="text-zinc-300">Para a tua conta</strong>, o valor definido é{" "}
              <strong className="text-accent">{(access?.displayPriceEur ?? 0).toFixed(2)} €/mês</strong>.
            </>
          ) : (
            <>
              . Depois do trial,{" "}
              <strong className="text-zinc-300">{(access?.defaultPriceEur ?? 6.99).toFixed(2)} €/mês</strong> com
              renovação automática (quando o Stripe estiver ligado).
            </>
          )}{" "}
          Cancelaste? Voltas ao modo Free (só chat).
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised/30 px-4 py-3 text-sm text-zinc-300">
        <p className="flex flex-wrap items-center gap-2 font-medium text-white">
          <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} />
          Estado actual:{" "}
          <span className="text-accent">
            {mode === "admin"
              ? "Owner / Admin"
              : mode === "pro_trial"
                ? "Pro — trial"
                : mode === "grace"
                  ? "Pro — pagamento em falta (período de graça)"
                  : mode === "pro_monthly"
                    ? "Coach Pro"
                    : "Free"}
          </span>
        </p>
        {access?.trialEndsAt && mode === "pro_trial" ? (
          <p className="mt-1 text-xs text-zinc-500">
            Trial até: {new Date(access.trialEndsAt).toLocaleString("pt-PT")}
          </p>
        ) : null}
        {access?.graceEndsAt && mode === "grace" ? (
          <p className="mt-1 text-xs text-amber-200/90">
            Regulariza o pagamento até: {new Date(access.graceEndsAt).toLocaleString("pt-PT")}
          </p>
        ) : null}
        {access?.isComped && mode !== "free" ? (
          <p className="mt-1 text-xs text-emerald-200/90">Coach Pro sem preço mensal para esta conta (0 €/mês).</p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-sm text-zinc-500">0 € — comunicação na equipa</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-300">
              {["Chat de grupo da equipa", "Mensagens directas"].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Coach Pro
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-zinc-950">
                {access?.displayPriceEur != null ? `${access.displayPriceEur.toFixed(2)} €/mês` : "6,99 €/mês"}
              </span>
            </CardTitle>
            <p className="text-sm text-zinc-500">Táticas, treinos, Sketch Area, equipa, calendário, perfil…</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-300">
              {[
                "Tudo no Free",
                "Quadro tático e ideias guardadas",
                "Planos de treino e PDFs",
                "Sketch Area (notas, tarefas, quadro)",
                "Plantel e calendário",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            {full && mode !== "free" ? (
              <p className="text-xs text-zinc-500">Tens acesso Coach Pro activo.</p>
            ) : (
              <div className="space-y-2">
                <Button type="button" className="w-full" onClick={() => void startCheckout()}>
                  Subscrever Coach Pro
                </Button>
                <p className="text-[11px] text-zinc-600">
                  Ao subscrever, aceitas cobrança mensal recorrente no cartão (Stripe). Integração em curso no servidor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-zinc-600">
        <button
          type="button"
          className="text-accent hover:underline"
          onClick={() => void refreshUserFromCloud()}
        >
          Actualizar estado da subscrição
        </button>{" "}
        (sincroniza com o servidor)
      </p>

      <p className="text-xs text-zinc-600">
        Dúvidas sobre facturação: contacta o suporte. Em caso de falha de pagamento, tens normalmente 3 dias para
        regularizar antes de o acesso Pro ser suspenso.
      </p>

      <Link href="/app/messages" className="inline-flex text-sm text-accent hover:underline">
        Ir para mensagens →
      </Link>
    </div>
  );
}
