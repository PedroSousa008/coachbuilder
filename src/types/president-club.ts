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

export type PresidentExpenseStatus = "pago" | "pendente" | "atrasado";
export type PresidentExpensePaymentMethod =
  | "numerario"
  | "transferencia_bancaria"
  | "mbway"
  | "cartao"
  | "debito_direto"
  | "outro";

export type PresidentExpenseCategory =
  | "treinadores_staff"
  | "arbitragem_taxas_jogo"
  | "campo_instalacoes"
  | "equipamento"
  | "transporte"
  | "seguros_licencas"
  | "administracao"
  | "saude"
  | "dividas_antigas"
  | "outras_despesas";

export type PresidentExpense = {
  id: string;
  name: string;
  category: PresidentExpenseCategory;
  description: string;
  teamOrDepartment: string;
  dueDate: string;
  valueEUR: number;
  status: PresidentExpenseStatus;
  paymentMethod: PresidentExpensePaymentMethod;
  paymentInfo: string;
  note: string;
  lastPaidAt: string;
  recurringMonthly: boolean;
  role: string;
  supplier: string;
  sourceStaffKey?: string;
  /** Centro médico — despesa associada a membro da equipa clínica. */
  sourceMedicalStaffId?: string;
  coachUserId?: string;
};

/** Linha de staff sincronizada do workspace dos treinadores. */
export type PresidentLinkedStaff = {
  id: string;
  sourceStaffKey: string;
  coachUserId: string;
  coachEmail: string;
  name: string;
  role: string;
  team: string;
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

/** Gravidade da lesão (Centro médico). */
export type PresidentInjurySeverity = "leve" | "moderada" | "grave" | "longa_duracao";

/** Estado clínico / disponibilidade (Centro médico). */
export type PresidentInjuryStatus =
  | "em_avaliacao"
  | "em_recuperacao"
  | "retorno_ao_treino"
  | "plenas_condicoes"
  | "cirurgia"
  | "repouso";

export type PresidentInjury = {
  id: string;
  /** Id do jogador no plantel agregado (`linked:…`) quando a linha vem da equipa do treinador. */
  sourcePlayerId?: string;
  /** true = linha gerida automaticamente a partir do estado do treinador (lesão/dúvida). */
  syncedFromCoach?: boolean;
  playerName: string;
  team: string;
  position: string;
  injuryType: string;
  bodyArea: string;
  severity: PresidentInjurySeverity;
  /** Data de início ISO YYYY-MM-DD */
  startDate: string;
  /** Retorno previsto ISO YYYY-MM-DD */
  expectedReturn: string;
  /** Dias de baixa (aproximado; recalculável na UI). */
  daysOut: number;
  status: PresidentInjuryStatus;
  assignedStaff: string;
  note: string;
  /** Progresso textual / fase (ex.: «60% — fase de reabilitação»). */
  recoveryProgress: string;
  /** Notas clínicas — acesso restrito no sentido organizacional. */
  medicalNotes: string;
  /** Prontidão para retorno 0–100%. */
  availabilityPct: number;
  rehabSessionsDone?: number;
  nextMilestone?: string;
  workloadNotes?: string;
  recurrenceWarning?: boolean;
  /** Custos médicos associados ao caso (EUR, opcional). */
  medicalCostEUR?: number;
};

export type PresidentMedicalStaffRole =
  | "fisioterapeuta"
  | "medico"
  | "preparador_reabilitacao"
  | "nutricionista"
  | "psicologo";

export type PresidentMedicalStaff = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: PresidentMedicalStaffRole;
  notes: string;
};

export type PresidentMedicalAppointment = {
  id: string;
  playerName: string;
  date: string;
  type: string;
  professional: string;
  status: "agendado" | "concluido" | "cancelado";
  notes: string;
};

export type PresidentMedicalInventoryItem = {
  id: string;
  item: string;
  stock: number;
  minLevel: number;
  supplier: string;
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
  expenses: PresidentExpense[];
  payments: PresidentPayment[];
  sponsors: PresidentSponsor[];
  injuries: PresidentInjury[];
  /** Equipa clínica do clube (aparece também em Pagamentos / despesas). */
  medicalStaff: PresidentMedicalStaff[];
  medicalAppointments: PresidentMedicalAppointment[];
  medicalInventory: PresidentMedicalInventoryItem[];
  disciplineIncidents: PresidentDisciplineIncident[];
  operationsEvents: PresidentOperationEvent[];
  reports: PresidentReport[];
  documents: PresidentDocument[];
  communicationDrafts: PresidentCommunication[];
  settings: PresidentClubSettings;
};
