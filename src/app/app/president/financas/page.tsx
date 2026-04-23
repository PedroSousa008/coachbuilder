"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentFinancasPage() {
  return (
    <PresidentFlowPlaceholder
      title="Finanças"
      description="Centro financeiro profissional: receitas (quotas, inscrições, patrocínios, eventos, merchandising) e despesas (salários, relvado, transporte, material, médico)."
      bullets={[
        "Gráficos de lucro/prejuízo mensal, tendência de receita e categorias de despesa.",
        "Indicadores inteligentes: burn rate, meses fracos previstos e oportunidades de crescimento.",
        "Exportação para contabilidade e permissões por cargo na direcção.",
      ]}
    />
  );
}
