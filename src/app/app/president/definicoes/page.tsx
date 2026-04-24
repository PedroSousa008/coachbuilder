"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PRESIDENT_EXTRA_SEAT_PRICE_EUR, PRESIDENT_INCLUDED_COACH_SEATS } from "@/lib/president-constants";
import { useAppData } from "@/contexts/AppDataContext";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { PresidentTrainerSeatsPanel } from "@/components/president/PresidentTrainerSeatsPanel";

export default function PresidentDefinicoesPage() {
  const { coachProfile, setCoachProfile } = useAppData();
  const { state, patchSettings, setLogoDataUrl } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const [activeSeatCount, setActiveSeatCount] = useState(0);
  const [maxSeats, setMaxSeats] = useState(PRESIDENT_INCLUDED_COACH_SEATS);
  const [buyingSeat, setBuyingSeat] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubNotes, setClubNotes] = useState("");

  useEffect(() => {
    setClubName(state.settings.clubDisplayName || coachProfile.club || "");
    setClubNotes(state.settings.clubNotes || "");
  }, [state.settings.clubDisplayName, state.settings.clubNotes, coachProfile.club]);

  const seatsUsed = activeSeatCount + state.coaches.length;

  const startExtraSeatCheckout = async () => {
    setBuyingSeat(true);
    try {
      const res = await fetch("/api/stripe/president-extra-seat/checkout", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      window.alert(data.error || "Não foi possível iniciar a compra do lugar extra.");
    } finally {
      setBuyingSeat(false);
    }
  };

  const saveIdentity = () => {
    const name = clubName.trim();
    patchSettings({ clubDisplayName: name, clubNotes: clubNotes.trim() });
    if (name) setCoachProfile({ club: name });
  };

  const onLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") setLogoDataUrl(r);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Definições</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Identidade do clube no modo Presidente e lugares de treinador. Os dados do clube sincronizam com o nome do
          clube no perfil do treinador quando guardas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="text-base text-white">Subscrição e lugares</CardTitle>
            <Badge variant="muted">Plano presidente (premium)</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-300">
            <p>
              O teu plano inclui <strong className="text-white">{PRESIDENT_INCLUDED_COACH_SEATS} lugares</strong> de
              treinador na cloud. Lugares em uso (lugares cloud ocupados + registos manuais na lista local):{" "}
              <strong className="text-white">
                {seatsUsed}/{maxSeats}
              </strong>
              .
            </p>
            <p className="text-zinc-500">
              Cada lugar adicional: <strong className="text-zinc-200">{PRESIDENT_EXTRA_SEAT_PRICE_EUR}€</strong>{" "}
              pagamento único (fica no clube para sempre, sem mensalidade adicional por esse lugar).
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void startExtraSeatCheckout()} disabled={buyingSeat}>
              {buyingSeat ? "A abrir checkout..." : "Adquirir 1 lugar extra"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="text-base text-white">Marca do clube</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Nome oficial do clube</span>
              <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Ex.: Atlético Clube de Lisboa" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Notas internas</span>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={clubNotes}
                onChange={(e) => setClubNotes(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Logótipo (ficheiro — guardado neste browser)</span>
              <input
                type="file"
                accept="image/*"
                onChange={onLogoFile}
                className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-zinc-200"
              />
            </label>
            {state.settings.logoDataUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.settings.logoDataUrl} alt="Logo" className="h-14 w-14 rounded-lg object-contain ring-1 ring-surface-border" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoDataUrl(undefined)}>
                  Remover logo
                </Button>
              </div>
            ) : null}
            <Button type="button" onClick={saveIdentity}>
              Guardar identidade
            </Button>
          </CardContent>
        </Card>

        <PresidentTrainerSeatsPanel
          onActiveSeatCount={setActiveSeatCount}
          onMaxSeats={setMaxSeats}
          onRosterChanged={() => void roster.refresh()}
        />

        <Card className="border-surface-border bg-surface-raised/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">Permissões na direcção</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              Configuração fina (tesoureiro, director desportivo, secretariado) com trilhos de auditoria será
              adicionada aqui. Por agora, toda a gestão do modo clube fica acessível à tua conta de presidente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
