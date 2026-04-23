"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { isClubPresident } from "@/lib/president-mode";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";

export function ClubPresidentLinkSettings() {
  const { user, refreshUserFromCloud } = useAuth();
  const [email, setEmail] = useState("");
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !shouldUseCloudClientApis(user) || isClubPresident(user)) return;
    try {
      const res = await fetch("/api/cloud/me/club-president-link", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; linked?: boolean; presidentEmail?: string | null };
      if (res.ok && data.ok && data.linked && data.presidentEmail) setLinkedEmail(data.presidentEmail);
      else setLinkedEmail(null);
    } catch {
      setLinkedEmail(null);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || isClubPresident(user) || !shouldUseCloudClientApis(user)) return null;

  const onLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cloud/me/club-president-link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presidentEmail: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; presidentEmail?: string };
      if (res.ok && data.ok) {
        setMsg(`Ligado ao presidente (${data.presidentEmail ?? email.trim()}). O plantel e o perfil ficam visíveis no modo clube desse utilizador.`);
        setEmail("");
        setLinkedEmail(data.presidentEmail ?? email.trim());
        await refreshUserFromCloud();
      } else {
        setMsg(data.error ?? "Não foi possível ligar.");
      }
    } catch {
      setMsg("Erro de rede.");
    }
    setLoading(false);
  };

  const onUnlink = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cloud/me/club-president-link", { method: "DELETE", credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setLinkedEmail(null);
        setMsg("Ligação removida.");
        await refreshUserFromCloud();
      } else {
        setMsg(data.error ?? "Erro ao remover.");
      }
    } catch {
      setMsg("Erro de rede.");
    }
    setLoading(false);
  };

  return (
    <Card className="border-surface-border bg-surface-raised/30">
      <CardHeader>
        <CardTitle className="text-base text-white">Ligar ao presidente do clube</CardTitle>
        <p className="text-sm text-zinc-500">
          Indica o <strong className="text-zinc-300">email de login</strong> da conta com função Presidente. O teu
          plantel, perfil e estatísticas passam a ser visíveis automaticamente no painel do presidente (modo clube).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedEmail ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
            Conta ligada ao presidente: <strong className="text-white">{linkedEmail}</strong>
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => void onUnlink()}>
                Remover ligação
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onLink} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-xs text-zinc-500">Email do presidente</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="presidente@clube.pt"
                required
              />
            </label>
            <Button type="submit" disabled={loading}>
              Ligar conta
            </Button>
          </form>
        )}
        {msg ? <p className="text-sm text-zinc-400">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
