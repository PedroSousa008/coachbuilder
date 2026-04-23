"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentMercadoTreinadoresPage() {
  return (
    <PresidentFlowPlaceholder
      title="Mercado de treinadores"
      description="Marketplace interno CoachBuilder para contratação: filtros por experiência, escalões, estilo táctico, troféus e disponibilidade imediata."
      bullets={[
        "Cartões de treinador com foto, bio curta, estatísticas e palmarés.",
        "Acções: convidar, contactar, guardar na shortlist.",
        "Integração com o teu processo de recrutamento e aprovação interna.",
      ]}
    />
  );
}
