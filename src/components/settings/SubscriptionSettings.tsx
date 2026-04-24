"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Check, Sparkles, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";
import type { FullPersonalizationRequestPublic } from "@/types/personalization";

type RequestPayload = {
  ok?: boolean;
  request?: FullPersonalizationRequestPublic | null;
  error?: string;
};

export function SubscriptionSettings() {
  const { user, refreshUserFromCloud } = useAuth();
  const searchParams = useSearchParams();
  const locked = searchParams.get("subscription") === "locked";
  const [request, setRequest] = useState<FullPersonalizationRequestPublic | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [preferredDateNotes, setPreferredDateNotes] = useState("");
  const [notesFromCoach, setNotesFromCoach] = useState("");

  const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
  const full = hasFullWorkspaceAccess(user, ownerListed);
  const access = user?.subscriptionAccess;
  const mode = access?.effectiveMode ?? "free";
  const proActive = full && mode !== "free";

  useEffect(() => {
    if (!user?.email) return;
    setContactEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!proActive) return;
    let cancelled = false;
    setRequestLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/cloud/personalization/request", { credentials: "include" });
        const data = (await res.json()) as RequestPayload;
        if (!cancelled && res.ok && data.ok) {
          setRequest(data.request ?? null);
          if (data.request?.contactEmail) setContactEmail(data.request.contactEmail);
        }
      } finally {
        if (!cancelled) setRequestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proActive]);

  const startCheckout = async () => {
    const res = await fetch("/api/stripe/checkout", { method: "POST", credentials: "include" });
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (res.ok && data.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    window.alert(data.error || "O pagamento automático (Stripe) ainda não está configurado no servidor.");
  };

  const submitPersonalizationRequest = async () => {
    if (!contactEmail.trim()) {
      window.alert("Indica o email de contacto para agendamento.");
      return;
    }
    setRequestSubmitting(true);
    try {
      const res = await fetch("/api/cloud/personalization/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: contactEmail.trim(),
          preferredDateNotes: preferredDateNotes.trim(),
          notesFromCoach: notesFromCoach.trim(),
        }),
      });
      const data = (await res.json()) as RequestPayload;
      if (!res.ok || !data.ok || !data.request) {
        window.alert(data.error || "Não foi possível enviar o pedido agora.");
        return;
      }
      setRequest(data.request);
      window.alert("Pedido enviado! A equipa vai entrar em contacto por email para encontrar a melhor data.");
    } finally {
      setRequestSubmitting(false);
    }
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
                  : access?.hasProAccess
                    ? access.isComped && user?.subscriptionPlan === "free"
                      ? "Coach Pro (via conta do clube)"
                      : "Coach Pro"
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

      {proActive ? (
        <Card className="border-amber-300/35 bg-gradient-to-br from-amber-400/15 via-orange-400/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-amber-100">
              <Star className="h-5 w-5 text-amber-300" strokeWidth={2} />
              Full Personalization + Tour Guide (50 €)
            </CardTitle>
            <p className="text-sm text-zinc-200/90">
              Sessão premium de onboarding 1:1 para acelerar resultados: 2 horas guiadas dentro da app, organização
              completa de táticas/treinos/equipa e plano de uso personalizado para o teu contexto.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-200/20 bg-black/20 p-3 text-sm text-zinc-200">
                <p className="font-medium text-amber-200">Sessão ao vivo (2h)</p>
                <p className="mt-1 text-xs text-zinc-400">Tour completo na app + setup guiado.</p>
              </div>
              <div className="rounded-xl border border-amber-200/20 bg-black/20 p-3 text-sm text-zinc-200">
                <p className="font-medium text-amber-200">Template personalizado</p>
                <p className="mt-1 text-xs text-zinc-400">Estrutura base para rotina semanal e matchday.</p>
              </div>
              <div className="rounded-xl border border-amber-200/20 bg-black/20 p-3 text-sm text-zinc-200">
                <p className="font-medium text-amber-200">Acompanhamento inicial</p>
                <p className="mt-1 text-xs text-zinc-400">Checklist prática para começares sem fricção.</p>
              </div>
            </div>

            {requestLoading ? (
              <p className="text-sm text-zinc-400">A verificar estado do teu pedido…</p>
            ) : request?.status === "requested" ? (
              <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                <p className="font-medium">Pedido recebido — aguardas confirmação da equipa.</p>
                <p className="mt-1 text-xs text-sky-100/90">
                  Recebemos o teu pedido de Full Personalization. A equipa vai escolher uma data adequada para ambos e
                  contactar-te por email.
                </p>
              </div>
            ) : request?.status === "approved" ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                <p className="font-medium">Pedido aprovado 🎉</p>
                <p className="mt-1 text-xs text-emerald-100/90">
                  {request.scheduledFor
                    ? `Data proposta: ${new Date(request.scheduledFor).toLocaleString("pt-PT")}.`
                    : "A equipa aprova o pedido e envia a data por email em breve."}
                </p>
                {request.adminNotes ? <p className="mt-2 text-xs text-emerald-100/90">{request.adminNotes}</p> : null}
              </div>
            ) : request?.status === "declined" ? (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                <p className="font-medium">Pedido recusado</p>
                <p className="mt-1 text-xs text-red-100/90">
                  {request.adminNotes || "A equipa não conseguiu confirmar este pedido neste momento."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-300/25 bg-black/20 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <CalendarClock className="h-4 w-4 text-amber-300" strokeWidth={2} />
                  Candidata-te agora para Full Personalization
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-zinc-400" htmlFor="fp-contact-email">
                      Email de contacto
                    </label>
                    <input
                      id="fp-contact-email"
                      type="email"
                      className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-100"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="teu-email@..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400" htmlFor="fp-preferred-date">
                      Preferência de datas/horários
                    </label>
                    <input
                      id="fp-preferred-date"
                      className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-100"
                      value={preferredDateNotes}
                      onChange={(e) => setPreferredDateNotes(e.target.value)}
                      placeholder="Ex.: 3ª/5ª à tarde"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400" htmlFor="fp-goals">
                    O que queres otimizar na sessão
                  </label>
                  <textarea
                    id="fp-goals"
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-zinc-100"
                    placeholder="Ex.: organizar microciclo semanal, templates de treinos, workflow de scouting..."
                    value={notesFromCoach}
                    onChange={(e) => setNotesFromCoach(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={() => void submitPersonalizationRequest()} disabled={requestSubmitting}>
                  {requestSubmitting ? "A enviar…" : "Quero Full Personalization (50 €)"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

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
