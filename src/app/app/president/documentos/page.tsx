"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentDocumentosPage() {
  return (
    <PresidentFlowPlaceholder
      title="Documentos"
      description="Cofre seguro: contratos de treinadores, inscrições, seguros, autorizações parentais, exames médicos, facturas e documentação legal."
      bullets={[
        "Alertas de validade e renovação obrigatória.",
        "Permissões granulares (quem vê o quê) alinhadas com a tua estrutura de governo.",
      ]}
    />
  );
}
