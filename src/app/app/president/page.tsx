"use client";

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
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { PresidentBarChart } from "@/components/president/PresidentBarChart";
import {
  presidentExecutiveKpis,
  presidentRevenue12m,
  presidentPlayerGrowth,
  presidentWinRateByCategory,
  presidentPaymentCollection,
  presidentInsights,
  presidentAlerts,
} from "@/data/president-mock";
import { useAppData } from "@/contexts/AppDataContext";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const severityStyles = {
  alto: "border-red-500/30 bg-red-500/10 text-red-200",
  médio: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  baixo: "border-zinc-600/50 bg-zinc-800/40 text-zinc-200",
} as const;

export default function PresidentExecutiveDashboardPage() {
  const { coachProfile } = useAppData();
  const club = coachProfile.club.trim() || "O teu clube";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Painel executivo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {club} · visão consolidada de desporto, equipas técnicas, finanças e operações. Dados de demonstração.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total de treinadores"
          value={presidentExecutiveKpis.totalCoaches}
          hint="Lugares incluídos no plano do presidente"
          icon={Users}
        />
        <StatCard
          label="Total de jogadores"
          value={presidentExecutiveKpis.totalPlayers}
          hint="Todos os escalões federados"
          icon={UsersRound}
        />
        <StatCard
          label="Receita mensal (estimada)"
          value={eur(presidentExecutiveKpis.monthlyRevenueEUR)}
          hint="Quotas, jogos, patrocínios e eventos"
          icon={Wallet}
          trend={{ positive: true, text: "+8% vs. mês anterior" }}
        />
        <StatCard
          label="Quotas em falta"
          value={eur(presidentExecutiveKpis.unpaidFeesEUR)}
          hint="Valor agregado por cobrar"
          icon={AlertTriangle}
          trend={{ positive: false, text: "Ação recomendada: contactar famílias" }}
        />
        <StatCard
          label="Taxa de vitória global"
          value={`${presidentExecutiveKpis.globalWinRatePct}%`}
          hint="Jogos oficiais — época em curso"
          icon={Percent}
        />
        <StatCard
          label="Equipas ativas"
          value={presidentExecutiveKpis.activeTeams}
          hint="Escalões com plantéis confirmados"
          icon={Layers}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PresidentBarChart
          title="Receita nos últimos 12 meses"
          subtitle="Valores indexados (índice 0–50). Integração financeira completa em breve."
          data={presidentRevenue12m.map((x) => ({ label: x.month, value: x.value }))}
        />
        <PresidentBarChart
          title="Crescimento do clube (jogadores)"
          subtitle="Evolução do número de atletas inscritos."
          data={presidentPlayerGrowth.map((x) => ({ label: x.month, value: x.players }))}
        />
        <PresidentBarChart
          title="Taxa de vitória por escalão"
          subtitle="Percentagem aproximada por categoria."
          data={presidentWinRateByCategory.map((x) => ({ label: x.label, value: x.pct }))}
          valueSuffix="%"
        />
        <PresidentBarChart
          title="Taxa de cobrança de quotas"
          subtitle="Semanas recentes — percentagem de adimplência."
          data={presidentPaymentCollection.map((x) => ({ label: x.label, value: x.pct }))}
          valueSuffix="%"
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
            <p className="text-xs text-zinc-500">Leitura automática a partir dos dados do clube (mock).</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Melhor equipa</p>
              <p className="text-zinc-200">{presidentInsights.bestTeam}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Melhor treinador</p>
              <p className="text-zinc-200">{presidentInsights.bestCoach}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Equipa em decréscimo</p>
              <p className="text-zinc-200">{presidentInsights.decliningTeam}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Jogadores em risco de saída</p>
              <p className="text-zinc-200">{presidentInsights.playersAtRisk} atletas com sinais de insatisfação ou atrasos.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Lightbulb className="h-4 w-4 text-accent" strokeWidth={1.75} />
              Alertas prioritários
            </CardTitle>
            <p className="text-xs text-zinc-500">Resumo do que precisa da tua atenção hoje.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {presidentAlerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border px-3 py-2.5 text-sm ${severityStyles[a.severity]}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted" className="text-[10px]">
                    {a.type}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">{a.severity}</span>
                </div>
                <p className="mt-1 leading-snug">{a.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
