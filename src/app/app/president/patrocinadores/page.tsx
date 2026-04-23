"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentPatrocinadoresPage() {
  return (
    <PresidentFlowPlaceholder
      title="Patrocinadores e parceiros"
      description="CRM de patrocínio: valor do contrato, datas de início e renovação, estado de pagamento, benefícios acordados e notas de relacionamento."
      bullets={[
        "Pipeline com potenciais patrocinadores, negociações em curso e lembretes de follow-up.",
        "Alertas de renovação e cumprimento de contrapartidas visíveis para a direcção.",
      ]}
    />
  );
}
