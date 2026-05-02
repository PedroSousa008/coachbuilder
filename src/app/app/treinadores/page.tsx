"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  CoachMonthlyResultsPanel,
  type CoachResultsPayload,
} from "@/components/admin/CoachMonthlyResultsPanel";
import { canUseOwnerCoachTools } from "@/lib/owner-coach-tools-client";

export default function TreinadoresPage() {
  const router = useRouter();
  const { user, authReady, refreshUserFromCloud } = useAuth();
  const allowed = canUseOwnerCoachTools(user?.email);

  const [payload, setPayload] = useState<CoachResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setHint(null);
    try {
      const res = await fetch("/api/cloud/admin/coach-results", { credentials: "include" });
      const j = (await res.json()) as CoachResultsPayload;
      if (res.ok && j.ok) {
        setPayload(j);
      } else {
        setPayload(null);
        setHint(j.error ?? "Não foi possível carregar os resultados.");
      }
    } catch {
      setPayload(null);
      setHint("Erro de rede ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!allowed) {
      router.replace("/app");
      return;
    }
    void (async () => {
      if (user?.role?.trim().toLowerCase() !== "admin") {
        await fetch("/api/cloud/auth/sync-admin-role", { method: "POST", credentials: "include" });
        await refreshUserFromCloud();
      }
      await load();
    })();
  }, [authReady, allowed, router, load, user?.role, refreshUserFromCloud]);

  useEffect(() => {
    if (!authReady || !allowed) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [authReady, allowed, load]);

  if (!authReady) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }
  if (!allowed) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Tracking mensal dos treinadores (mesmo dados que no Admin → Treinador do Mês). Só a conta dono vê esta
          página.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-4 text-xs"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          {loading ? "A atualizar…" : "Atualizar"}
        </Button>
      </div>
      {hint ? <p className="text-sm text-amber-400">{hint}</p> : null}
      {loading && !payload ? (
        <p className="text-sm text-zinc-500">A carregar resultados…</p>
      ) : (
        <CoachMonthlyResultsPanel payload={payload} />
      )}
    </div>
  );
}
