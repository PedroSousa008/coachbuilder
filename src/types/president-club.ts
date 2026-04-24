/** Estado do modo clube (Presidente) — persistido por utilizador. */

export type PresidentCoach = {
  id: string;
  /** Conta de treinador quando a linha vem da cloud (ligação ao presidente). */
  coachUserId?: string;
  coachEmail?: string;
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
  statsHistory: string;
  careerPath: string;
  trophies: string;
  methodology: string;
  strengths: string;
  notes: string;
};

export type PresidentPlayer = {
  id: string;
  /** Preenchido quando a linha vem de um treinador com conta ligada (cloud). */
  coachUserId?: string;
  coachEmail?: string;
  name: string;
  age: string;
  team: string;
  position: string;
  attendance: string;
  potentialRating: string;
  injuryStatus: string;
  notes: string;
  isTopTalent: boolean;
  technicalEvolution: string;
  physicalNotes: string;
  coachFeedback: string;
  paymentsNote: string;
  injuriesNote: string;
  familyContacts: string;
};

export type PresidentMarketContact = {
  id: string;
  name: string;
  bio: string;
  experience: string;
  trophies: string;
  preferredRole: string;
  availability: string;
  savedAt: string;
};

/** Alvo guardado no Mercado de Transferências (recrutamento interno do clube). */
export type PresidentRecruitmentShortlistEntry = {
  id: string;
  coachUserId: string;
  coachEmail: string;
  coachName: string;
  priority: "baixa" | "media" | "alta";
  roleNeed: string;
  contactStatus: "sem_contacto" | "contactado" | "em_conversa" | "recusado" | "fechado";
  notes: string;
  lastViewedAt: string;
  /** 0 = não atribuída; 1–10 avaliação interna */
  internalRating: number;
  compareWithCoachIds: string[];
  isPriorityTarget: boolean;
  savedAt: string;
};

export type PresidentFinanceMovement = {
  id: string;
  kind: "income" | "expense";
  category: string;
  amountEUR: number;
  date: string;
  note: string;
};

export type PresidentPaymentMethod = "numerario" | "transferencia" | "mbway" | "cartao" | "outro";

export type PresidentPaymentHistoryEntry = {
  id: string;
  paidAt: string;
  amountEUR: number;
  note?: string;
};

/** Quota / mensalidade por jogador (modo clube). */
export type PresidentPayment = {
  id: string;
  /** Id do jogador no plantel agregado (`linked:…` ou manual). */
  playerSourceId?: string;
  playerName: string;
  team: string;
  familyContact: string;
  personalContact: string;
  status: "pago" | "pendente" | "atrasado";
  amountEUR: number;
  discountEUR: number;
  dueDate: string;
  note: string;
  lastPaidAt: string;
  paymentMethod: PresidentPaymentMethod;
  archived: boolean;
  coachEmail?: string;
  coachTeamLabel?: string;
  history: PresidentPaymentHistoryEntry[];
};

export type PresidentSponsor = {
  id: string;
  company: string;
  contactPerson: string;
  contractValueEUR: number;
  startDate: string;
  renewalDate: string;
  paymentStatus: string;
  benefits: string;
  notes: string;
  pipelineStage: "ativo" | "potencial" | "negociação";
};

export type PresidentInjury = {
  id: string;
  playerName: string;
  injuryType: string;
  expectedReturn: string;
  recoveryProgress: string;
  medicalNotes: string;
  availabilityPct: number;
};

export type PresidentDisciplineIncident = {
  id: string;
  subjectType: "jogador" | "treinador";
  subjectName: string;
  category: string;
  date: string;
  details: string;
  fineEUR: number;
};

export type PresidentOperationEvent = {
  id: string;
  title: string;
  category: string;
  start: string;
  end: string;
  location: string;
  resource: string;
};

export type PresidentReport = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type PresidentDocument = {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
  notes: string;
  createdAt: string;
};

export type PresidentCommunication = {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
};

export type PresidentClubSettings = {
  clubDisplayName: string;
  clubNotes: string;
  logoDataUrl?: string;
};

/** Secção Equipas — cada cartão (escalão) pode ligar a um treinador para métricas agregadas. */
export type PresidentEquipasSlot = {
  id: string;
  title: string;
  /** Conta de treinador (`userId`) cujo workspace alimenta tabela / forma / staff / jogadores. */
  linkedCoachUserId: string | null;
};

export type PresidentClubState = {
  coaches: PresidentCoach[];
  players: PresidentPlayer[];
  equipasSlots: PresidentEquipasSlot[];
  marketContacts: PresidentMarketContact[];
  recruitmentShortlist: PresidentRecruitmentShortlistEntry[];
  financeMovements: PresidentFinanceMovement[];
  payments: PresidentPayment[];
  sponsors: PresidentSponsor[];
  injuries: PresidentInjury[];
  disciplineIncidents: PresidentDisciplineIncident[];
  operationsEvents: PresidentOperationEvent[];
  reports: PresidentReport[];
  documents: PresidentDocument[];
  communicationDrafts: PresidentCommunication[];
  settings: PresidentClubSettings;
};
