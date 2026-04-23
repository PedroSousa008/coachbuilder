"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentCentroMedicoPage() {
  return (
    <PresidentFlowPlaceholder
      title="Centro médico"
      description="Lesões e disponibilidade: tipo de lesão, previsão de regresso, progresso de recuperação, notas clínicas e percentagem de disponibilidade por jogador."
      bullets={[
        "Dashboard com total de lesionados, tempo médio de recuperação e alertas de risco de recidiva.",
        "Ligação aos relatórios dos treinadores quando um atleta é marcado como lesionado.",
      ]}
    />
  );
}
