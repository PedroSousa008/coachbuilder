"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentRelatoriosPage() {
  return (
    <PresidentFlowPlaceholder
      title="Relatórios"
      description="Relatórios executivos mensais gerados automaticamente: desempenho desportivo, resumo financeiro, crescimento de jogadores, quotas em falta, alertas e recomendações estratégicas."
      bullets={[
        "Exportação em PDF com identidade visual do clube.",
        "Distribuição agendada para o conselho e departamentos.",
      ]}
    />
  );
}
