"use client";

import { Users, UsersRound, Wallet, AlertTriangle, Percent, Layers, Sparkles, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { PresidentBarChart } from "@/components/president/PresidentBarChart";
import { useAppData } from "@/contexts/AppDataContext";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function PresidentExecutiveDashboardPage() {
  const { coachProfile } = useAppData();
  const club = coachProfile.club.trim() || "O teu clube";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Painel executivo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {club} · visão consolidada de desporto, equipas técnicas, finanças e operações. Os números preenchem-se
          quando adicionares dados nas respetivas áreas do modo clube.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total de treinadores"
          value={0}
          hint="Treinadores com lugar activo no teu plano"
          icon={Users}
        />
        <StatCard label="Total de jogadores" value={0} hint="Inscritos no clube (todas as equipas)" icon={UsersRound} />
        <StatCard
          label="Receita mensal (estimada)"
          value={eur(0)}
          hint="Quotas, jogos, patrocínios e eventos — após configuração financeira"
          icon={Wallet}
        />
        <StatCard
          label="Quotas em falta"
          value={eur(0)}
          hint="Valor agregado por cobrar"
          icon={AlertTriangle}
        />
        <StatCard label="Taxa de vitória global" value="—" hint="Com jogos oficiais registados" icon={Percent} />
        <StatCard label="Equipas ativas" value={0} hint="Escalões com plantéis confirmados" icon={Layers} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PresidentBarChart
          title="Receita nos últimos 12 meses"
          subtitle="Histórico mensal após introduzires movimentos financeiros."
          data={[]}
        />
        <PresidentBarChart
          title="Crescimento do clube (jogadores)"
          subtitle="Evolução do número de atletas inscritos."
          data={[]}
        />
        <PresidentBarChart
          title="Taxa de vitória por escalão"
          subtitle="Percentagem por categoria, com base em resultados registados."
          data={[]}
          valueSuffix="%"
        />
        <PresidentBarChart
          title="Taxa de cobrança de quotas"
          subtitle="Adimplência assim que activares o módulo de pagamentos."
          data={[]}
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
            <p className="text-xs text-zinc-500">
              Sugestões automáticas com base nos dados do clube (disponíveis quando houver informação suficiente).
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-raised/20 px-4 py-8">
              <p className="max-w-sm text-center text-sm text-zinc-500">
                Ainda sem insights. Quando tiveres equipas, treinadores e resultados ligados, aparecerão aqui leituras
                como melhor equipa, melhor treinador e sinais de alerta desportivos.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Lightbulb className="h-4 w-4 text-accent" strokeWidth={1.75} />
              Alertas prioritários
            </CardTitle>
            <p className="text-xs text-zinc-500">Avisos que requerem a tua atenção.</p>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-raised/20 px-4 py-8">
              <p className="max-w-sm text-center text-sm text-zinc-500">
                Sem alertas por agora. Pagamentos em atraso, lesões, contratos a expirar ou documentos em falta
                mostrar-se-ão aqui automaticamente quando os módulos estiverem configurados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
