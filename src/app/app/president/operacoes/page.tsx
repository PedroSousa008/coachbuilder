"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentOperacoesPage() {
  return (
    <PresidentFlowPlaceholder
      title="Operações"
      description="Calendário operacional e logística: treinos, jogos, torneios, reuniões, reservas de campo, balneários e transportes."
      bullets={[
        "Deteção automática de conflitos de agenda entre equipas e recursos partilhados.",
        "Vista por recurso (autocarro, campo principal, sala de reuniões).",
      ]}
    />
  );
}
