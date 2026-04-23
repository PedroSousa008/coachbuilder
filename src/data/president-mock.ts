/** Dados fictícios realistas — modo Presidente (MVP frontend). */

export const presidentExecutiveKpis = {
  totalCoaches: 10,
  totalPlayers: 186,
  monthlyRevenueEUR: 42850,
  unpaidFeesEUR: 6240,
  globalWinRatePct: 62,
  activeTeams: 12,
};

export const presidentRevenue12m = [
  { month: "Mai", value: 32 },
  { month: "Jun", value: 35 },
  { month: "Jul", value: 38 },
  { month: "Ago", value: 36 },
  { month: "Set", value: 40 },
  { month: "Out", value: 41 },
  { month: "Nov", value: 39 },
  { month: "Dez", value: 44 },
  { month: "Jan", value: 42 },
  { month: "Fev", value: 45 },
  { month: "Mar", value: 43 },
  { month: "Abr", value: 48 },
];

export const presidentPlayerGrowth = [
  { month: "Mai", players: 162 },
  { month: "Jun", players: 165 },
  { month: "Jul", players: 168 },
  { month: "Ago", players: 170 },
  { month: "Set", players: 172 },
  { month: "Out", players: 175 },
  { month: "Nov", players: 178 },
  { month: "Dez", players: 180 },
  { month: "Jan", players: 181 },
  { month: "Fev", players: 183 },
  { month: "Mar", players: 184 },
  { month: "Abr", players: 186 },
];

export const presidentWinRateByCategory = [
  { label: "Sub-9", pct: 68 },
  { label: "Sub-11", pct: 61 },
  { label: "Sub-13", pct: 58 },
  { label: "Sub-15", pct: 64 },
  { label: "Sub-17", pct: 55 },
  { label: "Seniores", pct: 59 },
];

export const presidentPaymentCollection = [
  { label: "Sem 1", pct: 88 },
  { label: "Sem 2", pct: 91 },
  { label: "Sem 3", pct: 85 },
  { label: "Sem 4", pct: 93 },
];

export const presidentInsights = {
  bestTeam: "Sub-15 — Invicta há 7 jogos",
  bestCoach: "Ricardo Almeida — taxa de vitória 71%",
  decliningTeam: "Sub-13 B — 4 derrotas seguidas",
  playersAtRisk: 6,
};

export const presidentAlerts = [
  { id: "1", type: "Pagamentos", text: "12 quotas em atraso acima de 30 dias.", severity: "alto" as const },
  { id: "2", type: "Treinadores", text: "Treinador adjunto Sub-17 sem sessão registada há 21 dias.", severity: "médio" as const },
  { id: "3", type: "Médico", text: "5 jogadores com lesão muscular — monitorizar cargas.", severity: "médio" as const },
  { id: "4", type: "Resultados", text: "Equipa sénior: 1 vitória nos últimos 6 jogos.", severity: "alto" as const },
  { id: "5", type: "Contratos", text: "2 contratos de treinador terminam em 60 dias.", severity: "baixo" as const },
  { id: "6", type: "Documentos", text: "Autorizações parentais em falta: 4 ficheiros.", severity: "médio" as const },
];

export type PresidentCoachRow = {
  id: string;
  name: string;
  birthDate: string;
  role: string;
  team: string;
  winPct: number;
  sessionsCreated: number;
  activityLevel: "Alta" | "Média" | "Baixa";
  parentRating: number;
  internalRank: number;
  contractStatus: string;
};

export const presidentCoaches: PresidentCoachRow[] = [
  {
    id: "c1",
    name: "Ricardo Almeida",
    birthDate: "1984-03-12",
    role: "Treinador principal",
    team: "Sub-15 A",
    winPct: 71,
    sessionsCreated: 48,
    activityLevel: "Alta",
    parentRating: 4.8,
    internalRank: 1,
    contractStatus: "Ativo até 2027",
  },
  {
    id: "c2",
    name: "Sofia Martins",
    birthDate: "1990-07-22",
    role: "Treinadora principal",
    team: "Sub-11",
    winPct: 64,
    sessionsCreated: 41,
    activityLevel: "Alta",
    parentRating: 4.6,
    internalRank: 2,
    contractStatus: "Ativo até 2026",
  },
  {
    id: "c3",
    name: "João Ferreira",
    birthDate: "1988-11-05",
    role: "Treinador adjunto",
    team: "Sub-17",
    winPct: 52,
    sessionsCreated: 22,
    activityLevel: "Baixa",
    parentRating: 4.1,
    internalRank: 8,
    contractStatus: "Renovação em discussão",
  },
  {
    id: "c4",
    name: "Miguel Torres",
    birthDate: "1982-01-30",
    role: "Treinador de guarda-redes",
    team: "Formação + Sénior",
    winPct: 58,
    sessionsCreated: 36,
    activityLevel: "Média",
    parentRating: 4.5,
    internalRank: 4,
    contractStatus: "Ativo até 2028",
  },
];

export const presidentSeats = {
  included: 10,
  used: 10,
  extraSeatPriceEUR: 50,
};
