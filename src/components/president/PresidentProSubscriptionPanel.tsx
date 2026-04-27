"use client";

import { useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Bloco de pagamento PresidentPro (Stripe) para Definições do modo Presidente.
 */
export function PresidentProSubscriptionPanel() {
  const { user, refreshUserFromCloud } = useAuth();
  const [busy, setBusy] = useState(false);
  const access = user?.subscriptionAccess;
  const price = access?.displayPriceEur ?? access?.defaultPriceEur ?? 59.99;
  const renews = access?.renewsAt ? new Date(access.renewsAt).toLocaleDateString("pt-PT") : null;

  const startCheckout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      window.alert(data.error || "Não foi possível abrir o pagamento. Tenta mais tarde ou contacta o suporte.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-[#0c1014] to-[#0a0d10]">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-white">
          <Sparkles className="h-5 w-5 text-amber-400" strokeWidth={2} />
          PresidentPro — subscrição mensal
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Após o período experimental, o modo clube (painel, finanças, treinadores, centro médico, etc.) fica disponível
          com subscrição activa. O pagamento é processado de forma segura pela Stripe; quando a primeira cobrança for
          confirmada, o acesso é restaurado automaticamente até à renovação seguinte.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-2 rounded-xl border border-surface-border bg-black/25 px-4 py-3">
          <span className="text-2xl font-semibold tabular-nums text-white">{price.toFixed(2)} €</span>
          <span className="text-sm text-zinc-500">/ mês (renovação automática)</span>
          {access?.adminMonthlyPriceEur != null ? (
            <span className="w-full text-xs text-zinc-500">Valor definido para a tua conta na plataforma.</span>
          ) : null}
        </div>
        {renews && access?.hasProAccess ? (
          <p className="text-xs text-emerald-200/90">Subscrição activa. Próxima renovação prevista: {renews}.</p>
        ) : null}
        <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => void startCheckout()} disabled={busy}>
          <CreditCard className="h-4 w-4" strokeWidth={2} />
          {busy ? "A abrir…" : "Pagar com Stripe (cartão)"}
        </Button>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Já pagaste e o ecrã ainda mostra bloqueio?{" "}
          <button
            type="button"
            className="text-amber-400/90 underline-offset-2 hover:underline"
            onClick={() => void refreshUserFromCloud()}
          >
            Actualizar estado da conta
          </button>
          .
        </p>
      </CardContent>
    </Card>
  );
}
