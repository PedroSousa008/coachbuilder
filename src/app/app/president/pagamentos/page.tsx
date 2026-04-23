"use client";

import { PresidentFlowPlaceholder } from "@/components/president/PresidentFlowPlaceholder";

export default function PresidentPagamentosPage() {
  return (
    <PresidentFlowPlaceholder
      title="Pagamentos"
      description="Gestão das mensalidades das famílias: pago, em falta e em atraso, com lembretes automáticos e contactos dos encarregados de educação."
      bullets={[
        "Painel com valor cobrado no mês, pendente e vencido.",
        "Histórico por jogador e exportação de relatórios para o presidente e tesouraria.",
        "Integração com comunicação (SMS / email / app) em fase seguinte.",
      ]}
    />
  );
}
