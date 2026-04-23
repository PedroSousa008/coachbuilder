"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentComunicacaoPage() {
  return (
    <PresidentFlowPlaceholder
      title="Comunicação"
      description="Mensagens centralizadas para pais, equipas específicas, treinadores, direcção ou grupos personalizados — alterações de horário, avisos de jogo, lembretes de pagamento e emergências."
      bullets={[
        "Modelos de mensagem e registo de entregas.",
        "Integração futura com o canal de mensagens já existente na app para treinadores.",
      ]}
    />
  );
}
