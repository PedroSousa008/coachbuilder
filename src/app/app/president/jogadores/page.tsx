"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentJogadoresPage() {
  return (
    <PresidentFlowPlaceholder
      title="Jogadores"
      description="Todos os atletas do clube numa vista única: presenças, potencial, lesões, notas e contactos de encarregados de educação."
      bullets={[
        "Tabela avançada com filtros por equipa, posição, estado de pagamento e saúde.",
        "Perfil do jogador: evolução técnica, feedback dos treinadores, histórico de lesões e área financeira.",
        "Secção dedicada «Talentos de topo / joias do clube» para seguimento estratégico.",
      ]}
    />
  );
}
