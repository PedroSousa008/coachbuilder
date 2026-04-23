"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentDisciplinaPage() {
  return (
    <PresidentFlowPlaceholder
      title="Disciplina"
      description="Registo disciplinar interno: cartões amarelos/vermelhos, suspensões, atrasos, coimas e incidentes — para jogadores e treinadores."
      bullets={[
        "Linha do tempo por pessoa e relatórios para o conselho disciplinar.",
        "Políticas do clube e limites configuráveis (próxima fase).",
      ]}
    />
  );
}
