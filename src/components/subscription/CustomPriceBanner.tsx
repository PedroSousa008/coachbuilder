"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function sessionDismissKey(userId: string) {
  return `coachbuilder_subscription_price_banner_${userId}`;
}

/** Mostra o preço mensal definido no Admin (ex.: 0 €) ao entrar na app. */
export function CustomPriceBanner() {
  const { user, authReady } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(sessionDismissKey(user.id)) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const adminPrice = user?.subscriptionAccess?.adminMonthlyPriceEur;
  if (!authReady || !user || adminPrice == null || dismissed) return null;

  const label = adminPrice.toFixed(2).replace(".", ",");

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-zinc-100">
      <p>
        <span className="font-medium text-white">Preço da tua conta Coach Pro: </span>
        <span className="text-accent">{label} €/mês</span>
        <span className="text-zinc-400"> (definido pela equipa)</span>
      </p>
      <button
        type="button"
        className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
        aria-label="Fechar aviso"
        onClick={() => {
          try {
            sessionStorage.setItem(sessionDismissKey(user.id), "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
