"use client";

import { useMemo } from "react";
import {
  Users,
  UsersRound,
  Wallet,
  AlertTriangle,
  Percent,
  Layers,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { PresidentBarChart } from "@/components/president/PresidentBarChart";
import { useAppData } from "@/contexts/AppDataContext";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function PresidentExecutiveDashboardPage() {
  const { coachProfile } = useAppData();
  const { state, kpis, financeChart } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const syncLabel = useMemo(() => {
    if (!roster.lastSyncedAt) return null;
    return new Date(roster.lastSyncedAt).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [roster.lastSyncedAt]);
  const allCoaches = useMemo(() => [...roster.coaches, ...state.coaches], [roster.coaches, state.coaches]);
  const allPlayers = useMemo(() => [...roster.players, ...state.players], [roster.players, state.players]);
  const club =
    state.settings.clubDisplayName.trim() || coachProfile.club.trim() || "O teu clube";

  const avgWin =
    allCoaches.length > 0
      ? Math.round(
          allCoaches.reduce((s, c) => s + (Number.isFinite(c.winPct) ? c.winPct : 0), 0) / allCoaches.length
        )
      : null;

  const teams = new Set(allPlayers.map((p) => p.team.trim()).filter(Boolean));
  const teamCount = teams.size || (allPlayers.length ? 1 : 0);

  const playerByTeam = allPlayers.reduce<Record<string, number>>((acc, p) => {
    const t = p.team.trim() || "Sem equipa";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const playerTeamChart = Object.entries(playerByTeam).map(([label, value]) => ({ label, value }));

  const coachWinChart = allCoaches.slice(0, 8).map((c) => ({
    label: c.name.slice(0, 12) + (c.name.length > 12 ? "…" : ""),
    value: Math.round(Math.min(100, Math.max(0, c.winPct))),
  }));

  const paymentStatusChart = [
    { label: "Pago", value: state.payments.filter((p) => !p.archived && p.status === "pago").length },
    { label: "Pendente", value: state.payments.filter((p) => !p.archived && p.status === "pendente").length },
    { label: "Atrasado", value: state.payments.filter((p) => !p.archived && p.status === "atrasado").length },
  ];

  const netSeries = financeChart.income.map((d, i) => ({
    label: d.label.slice(5),
    value: d.value - financeChart.expense[i].value,
  }));

  const topTalentsMerged = allPlayers.filter((p) => p.isTopTalent).length;

  const insights: string[] = [];
  if (allCoaches.length > 0) {
    const top = [...allCoaches].sort((a, b) => b.internalRank - a.internalRank)[0];
    if (top) insights.push(`Treinador em destaque (ranking interno): ${top.name} (${top.team || "—"}).`);
  }
  if (topTalentsMerged > 0) {
    insights.push(`${topTalentsMerged} jogador(es) marcados como talento de topo — vale a pena rever evolução e contratos.`);
  }
  if (kpis.netEUR > 0 && state.financeMovements.length > 0) {
    insights.push(`Saldo mensal estimado positivo (${eur(kpis.netEUR)}), com base nos movimentos do mês corrente.`);
  }

  const alerts: string[] = [];
  if (kpis.overduePaymentsEUR > 0) {
    alerts.push(`Quotas em atraso: ${eur(kpis.overduePaymentsEUR)} — rever módulo Pagamentos.`);
  }
  if (kpis.injuredPlayers > 0) {
    alerts.push(`${kpis.injuredPlayers} registo(s) no centro médico — confirmar datas de retorno.`);
  }
  if (kpis.netEUR < 0 && state.financeMovements.length > 0) {
    alerts.push(`Despesas superam receitas neste mês (${eur(kpis.netEUR)}).`);
  }
  const expiringDocs = state.documents.filter((d) => d.expiryDate && d.expiryDate <= new Date().toISOString().slice(0, 10));
  if (expiringDocs.length > 0) {
    alerts.push(`${expiringDocs.length} documento(s) com validade vencida ou a vencer hoje.`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Painel executivo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {club} · visão consolidada: treinadores e jogadores das contas ligadas sincronizam automaticamente com a cloud
          (cada ~45&nbsp;s, ao voltar a este separador e ao focar a janela). Finanças, quotas e restantes dados do modo
          clube reflectem-se logo que os edits no dispositivo.
        </p>
        {syncLabel ? (
          <p className="mt-2 text-xs text-zinc-600">
            Última actualização do plantel agregado: <span className="tabular-nums text-zinc-500">{syncLabel}</span>
            {roster.loading ? <span className="ml-2 text-amber-400/90">· A actualizar…</span> : null}
          </p>
        ) : roster.loading ? (
          <p className="mt-2 text-xs text-zinc-600">A carregar plantel agregado…</p>
        ) : roster.error ? (
          <p className="mt-2 text-xs text-red-400/90">{roster.error}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total de treinadores"
          value={allCoaches.length}
          hint="Contas ligadas + registos manuais"
          icon={Users}
        />
        <StatCard label="Total de jogadores" value={allPlayers.length} hint="Plantéis sincronizados + locais" icon={UsersRound} />
        <StatCard
          label="Receita mensal (movimentos)"
          value={eur(kpis.monthlyIncomeEUR)}
          hint="Receitas com data no mês corrente"
          icon={Wallet}
        />
        <StatCard
          label="Quotas em falta / atraso"
          value={eur(kpis.pendingPaymentsEUR + kpis.overduePaymentsEUR)}
          hint={`Pendente ${eur(kpis.pendingPaymentsEUR)} · Atrasado ${eur(kpis.overduePaymentsEUR)}`}
          icon={AlertTriangle}
        />
        <StatCard
          label="Taxa de vitória global (média treinadores)"
          value={avgWin != null ? `${avgWin}%` : "—"}
          hint={allCoaches.length ? "Média do campo «Vitórias %»" : "Liga treinadores ou adiciona %"}
          icon={Percent}
        />
        <StatCard
          label="Escalões com plantel"
          value={teamCount}
          hint="Equipas distintas nos jogadores (incl. sincronizado)"
          icon={Layers}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PresidentBarChart
          title="Receita e despesa (6 meses)"
          subtitle="A partir dos movimentos em Finanças (por mês YYYY-MM)."
          data={state.financeMovements.length > 0 ? netSeries : []}
          emptyMessage="Sem movimentos financeiros ainda. Adiciona receitas e despesas com data."
        />
        <PresidentBarChart
          title="Jogadores por equipa"
          subtitle="Distribuição do plantel por campo «Equipa»."
          data={playerTeamChart}
          emptyMessage="Sem jogadores. Adiciona atletas em Jogadores."
        />
        <PresidentBarChart
          title="Taxa de vitória por treinador"
          subtitle="Até 8 treinadores — valor do campo «Vitórias %»."
          data={coachWinChart}
          valueSuffix="%"
          emptyMessage="Sem treinadores ou sem % registada."
        />
        <PresidentBarChart
          title="Estado das quotas (contagem)"
          subtitle="Pagamentos por estado."
          data={paymentStatusChart}
          emptyMessage="Sem pagamentos registados."
          barClassName="from-emerald-500/30 to-emerald-400/70"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Sparkles className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
              Insights estratégicos
            </CardTitle>
            <p className="text-xs text-zinc-500">Leituras rápidas com base nos teus dados.</p>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-raised/20 px-4 py-8">
                <p className="max-w-sm text-center text-sm text-zinc-500">
                  Preenche treinadores, jogadores e finanças para aparecerem sugestões automáticas.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {insights.map((t) => (
                  <li key={t} className="rounded-lg border border-surface-border bg-surface-raised/40 px-3 py-2">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Lightbulb className="h-4 w-4 text-accent" strokeWidth={1.75} />
              Alertas prioritários
            </CardTitle>
            <p className="text-xs text-zinc-500">Avisos derivados de pagamentos, lesões e finanças.</p>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-raised/20 px-4 py-8">
                <p className="max-w-sm text-center text-sm text-zinc-500">
                  Nada crítico detetado. Os avisos aparecem quando houver atrasos, défice mensal ou documentos
                  vencidos.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-amber-100/90">
                {alerts.map((t) => (
                  <li key={t} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
