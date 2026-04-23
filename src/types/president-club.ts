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

export type PresidentFinanceMovement = {
  id: string;
  kind: "income" | "expense";
  category: string;
  amountEUR: number;
  date: string;
  note: string;
};

export type PresidentPayment = {
  id: string;
  playerName: string;
  familyContact: string;
  status: "pago" | "pendente" | "atrasado";
  amountEUR: number;
  dueDate: string;
  note: string;
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

export type PresidentClubState = {
  coaches: PresidentCoach[];
  players: PresidentPlayer[];
  marketContacts: PresidentMarketContact[];
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
