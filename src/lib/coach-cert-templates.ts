import type { UefaLicenseId } from "@/types";

export type CoachCertPrepBlock = {
  criteria: string[];
  benefits: string[];
  preparation: string[];
};

export type UefaLicenseTemplate = {
  id: UefaLicenseId;
  label: string;
  shortLabel: string;
  prep: CoachCertPrepBlock;
};

export const UEFA_LICENSE_TEMPLATES: readonly UefaLicenseTemplate[] = [
  {
    id: "uefa_c",
    label: "UEFA C",
    shortLabel: "C",
    prep: {
      criteria: [
        "Idade mínima e requisitos da federação (FPF / curso nacional equivalente).",
        "Experiência de jogo ou iniciação ao treino conforme regulamento em vigor.",
      ],
      benefits: [
        "Treinar escalões de formação e iniciar percurso estruturado na profissão.",
        "Base metodológica comum reconhecida em contexto UEFA.",
      ],
      preparation: [
        "Módulos teóricos: princípios do jogo, segurança, ética e organização da sessão.",
        "Estágio prático supervisionado e observação de treinos.",
        "Simulação de microciclos e planificação simples.",
      ],
    },
  },
  {
    id: "uefa_b",
    label: "UEFA B",
    shortLabel: "B",
    prep: {
      criteria: [
        "Licença UEFA C (ou equivalente aceite) e tempo mínimo de experiência exigido.",
        "Cumprimento de horas de contacto e avaliações da entidade formadora.",
      ],
      benefits: [
        "Treinar em mais contextos competitivos e idades, com maior autonomia tática.",
        "Acesso a percursos UEFA A / Pro após evolução e requisitos cumpridos.",
      ],
      preparation: [
        "Análise de jogos com modelo de períodos e princípios ofensivos/defensivos.",
        "Exercícios de periodização semanal e gestão de grupo.",
        "Casos práticos: transição, bola parada, leitura de adversário.",
      ],
    },
  },
  {
    id: "uefa_a",
    label: "UEFA A",
    shortLabel: "A",
    prep: {
      criteria: [
        "Licença UEFA B e experiência mínima como treinador principal ou adjunto (conforme regulamento).",
        "Aprovação em avaliações teóricas e práticas finais.",
      ],
      benefits: [
        "Treinar equipas sénior em ligas de alto nível (sujeito a regras nacionais).",
        "Perfil alinhado com cargos de coordenação técnica em clubes maiores.",
      ],
      preparation: [
        "Planeamento mesociclo e gestão de carga em semanas duplas.",
        "Relatórios de scouting e análise de vídeo com métricas simples.",
        "Simulações de conferência de imprensa e liderança de balneário.",
      ],
    },
  },
  {
    id: "uefa_pro",
    label: "UEFA Pro",
    shortLabel: "Pro",
    prep: {
      criteria: [
        "Licença UEFA A e experiência relevante no futebol profissional ou alto rendimento.",
        "Seleção e conclusão do curso Pro da federação / UEFA.",
      ],
      benefits: [
        "Eligibility para bancos em competições UEFA e ligas profissionais de topo.",
        "Rede internacional de formandos e actualização contínua obrigatória.",
      ],
      preparation: [
        "Projecto de clube completo: modelo de jogo, scouting e gestão de staff.",
        "Estágios em clubes parceiros e mentoria individual.",
        "Workshops de performance, medicina desportiva e comunicação institucional.",
      ],
    },
  },
];

export function uefaTemplate(id: UefaLicenseId): UefaLicenseTemplate | undefined {
  return UEFA_LICENSE_TEMPLATES.find((t) => t.id === id);
}
