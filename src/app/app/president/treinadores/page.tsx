"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PresidentTreinadoresPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Treinadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Lista da equipa técnica do clube. Adiciona treinadores e preenche os dados — a comparação lado a lado virá
            numa fase seguinte.
          </p>
        </div>
        <Button type="button" variant="secondary" disabled className="shrink-0">
          Comparar treinadores (em breve)
        </Button>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Plantel técnico</CardTitle>
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
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-sm text-zinc-500">
                  Ainda não há treinadores registados. Cria lugares e convida a equipa técnica a partir das definições
                  do modo clube.
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-zinc-600">
        Ficha individual (estatísticas, percurso, troféus, metodologia, notas) ficará disponível quando abrires o
        perfil de cada treinador.
      </p>
    </div>
  );
}
