"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { presidentCoaches } from "@/data/president-mock";

export default function PresidentTreinadoresPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Treinadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Lista consolidada da equipa técnica. Comparação lado a lado e fichas completas em desenvolvimento.
          </p>
        </div>
        <Button type="button" variant="secondary" disabled className="shrink-0">
          Comparar treinadores (em breve)
        </Button>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">Plantel técnico</CardTitle>
          <Badge variant="muted">Dados de demonstração</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Data de nascimento</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Equipa</th>
                <th className="px-4 py-3 font-medium">Vitórias %</th>
                <th className="px-4 py-3 font-medium">Sessões</th>
                <th className="px-4 py-3 font-medium">Atividade</th>
                <th className="px-4 py-3 font-medium">Avaliação pais</th>
                <th className="px-4 py-3 font-medium">Ranking interno</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {presidentCoaches.map((c) => (
                <tr key={c.id} className="border-b border-surface-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.birthDate}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.role}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.team}</td>
                  <td className="px-4 py-3 font-mono text-zinc-200">{c.winPct}%</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{c.sessionsCreated}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.activityLevel === "Alta"
                          ? "text-accent"
                          : c.activityLevel === "Média"
                            ? "text-amber-300/90"
                            : "text-red-300/90"
                      }
                    >
                      {c.activityLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{c.parentRating.toFixed(1)} / 5</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-200">#{c.internalRank}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{c.contractStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-zinc-600">
        Ficha individual: histórico de estatísticas, percurso, troféus, metodologia, pontos fortes e notas internas —
        disponível na próxima iteração.
      </p>
    </div>
  );
}
