"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { presidentSeats } from "@/data/president-mock";

export default function PresidentDefinicoesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Definições</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Identidade do clube, subscrição, lugares de treinador e permissões. Área em expansão — alguns campos são
          apenas demonstrativos.
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
              O teu plano inclui <strong className="text-white">{presidentSeats.included} lugares</strong> de treinador
              principal (contas criadas por ti, sem mensalidade extra por treinador). Lugares em uso:{" "}
              <strong className="text-white">{presidentSeats.used}</strong>.
            </p>
            <p className="text-zinc-500">
              Cada lugar adicional: <strong className="text-zinc-200">{presidentSeats.extraSeatPriceEUR}€</strong>{" "}
              pagamento único — permanece activo sem custo mensal associado a esse login.
            </p>
            <Button type="button" variant="secondary" size="sm" disabled>
              Adquirir lugares extra (em breve)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="text-base text-white">Marca do clube</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Nome oficial do clube</span>
              <Input readOnly placeholder="Ex.: Atlético Clube de Lisboa" className="bg-surface-raised/80" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Logótipo (URL ou ficheiro)</span>
              <Input readOnly placeholder="Em breve: upload na cloud" className="bg-surface-raised/80" />
            </label>
            <p className="text-xs text-zinc-600">
              Cores e identidade visual seguirão o mesmo sistema de design CoachBuilder para manter consistência com a
              app dos treinadores.
            </p>
          </CardContent>
        </Card>

        <Card className="border-surface-border bg-surface-raised/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white">Permissões na direcção</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              Configuração fina (tesoureiro, director desportivo, secretariado) será adicionada aqui — com trilhos de
              auditoria e aprovação em duas etapas para operações sensíveis.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
