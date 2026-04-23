import type {
  PresidentClubState,
  PresidentCoach,
  PresidentCommunication,
  PresidentDisciplineIncident,
  PresidentDocument,
  PresidentFinanceMovement,
  PresidentInjury,
  PresidentMarketContact,
  PresidentOperationEvent,
  PresidentPayment,
  PresidentPlayer,
  PresidentReport,
  PresidentSponsor,
} from "@/types/president-club";

export function emptyPresidentClubState(): PresidentClubState {
  return {
    coaches: [],
    players: [],
    marketContacts: [],
    financeMovements: [],
    payments: [],
    sponsors: [],
    injuries: [],
    disciplineIncidents: [],
    operationsEvents: [],
    reports: [],
    documents: [],
    communicationDrafts: [],
    settings: {
      clubDisplayName: "",
      clubNotes: "",
      logoDataUrl: undefined,
    },
  };
}

export function mergePresidentClubState(raw: unknown, fallback: PresidentClubState): PresidentClubState {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const settings = o.settings && typeof o.settings === "object" ? (o.settings as Record<string, unknown>) : {};

  return {
    coaches: arr<PresidentCoach>(o.coaches).map((c) => ({
      id: str(c.id, ""),
      name: str(c.name, ""),
      birthDate: str(c.birthDate, ""),
      role: str(c.role, ""),
      team: str(c.team, ""),
      winPct: num(c.winPct, 0),
      sessionsCreated: num(c.sessionsCreated, 0),
      activityLevel: c.activityLevel === "Alta" || c.activityLevel === "Média" || c.activityLevel === "Baixa" ? c.activityLevel : "Média",
      parentRating: num(c.parentRating, 0),
      internalRank: num(c.internalRank, 0),
      contractStatus: str(c.contractStatus, ""),
      statsHistory: str(c.statsHistory, ""),
      careerPath: str(c.careerPath, ""),
      trophies: str(c.trophies, ""),
      methodology: str(c.methodology, ""),
      strengths: str(c.strengths, ""),
      notes: str(c.notes, ""),
    })).filter((c) => c.id),
    players: arr<PresidentPlayer>(o.players).map((p) => ({
      id: str(p.id, ""),
      name: str(p.name, ""),
      age: str(p.age, ""),
      team: str(p.team, ""),
      position: str(p.position, ""),
      attendance: str(p.attendance, ""),
      potentialRating: str(p.potentialRating, ""),
      injuryStatus: str(p.injuryStatus, ""),
      notes: str(p.notes, ""),
      isTopTalent: bool(p.isTopTalent, false),
      technicalEvolution: str(p.technicalEvolution, ""),
      physicalNotes: str(p.physicalNotes, ""),
      coachFeedback: str(p.coachFeedback, ""),
      paymentsNote: str(p.paymentsNote, ""),
      injuriesNote: str(p.injuriesNote, ""),
      familyContacts: str(p.familyContacts, ""),
    })).filter((p) => p.id),
    marketContacts: arr<PresidentMarketContact>(o.marketContacts).map((m) => ({
      id: str(m.id, ""),
      name: str(m.name, ""),
      bio: str(m.bio, ""),
      experience: str(m.experience, ""),
      trophies: str(m.trophies, ""),
      preferredRole: str(m.preferredRole, ""),
      availability: str(m.availability, ""),
      savedAt: str(m.savedAt, ""),
    })).filter((m) => m.id),
    financeMovements: arr<PresidentFinanceMovement>(o.financeMovements)
      .map(
        (f): PresidentFinanceMovement => ({
          id: str(f.id, ""),
          kind: f.kind === "expense" ? "expense" : "income",
          category: str(f.category, ""),
          amountEUR: num(f.amountEUR, 0),
          date: str(f.date, ""),
          note: str(f.note, ""),
        })
      )
      .filter((f) => f.id),
    payments: arr<PresidentPayment>(o.payments).map((p) => ({
      id: str(p.id, ""),
      playerName: str(p.playerName, ""),
      familyContact: str(p.familyContact, ""),
      status: p.status === "pago" || p.status === "pendente" || p.status === "atrasado" ? p.status : "pendente",
      amountEUR: num(p.amountEUR, 0),
      dueDate: str(p.dueDate, ""),
      note: str(p.note, ""),
    })).filter((p) => p.id),
    sponsors: arr<PresidentSponsor>(o.sponsors).map((s) => ({
      id: str(s.id, ""),
      company: str(s.company, ""),
      contactPerson: str(s.contactPerson, ""),
      contractValueEUR: num(s.contractValueEUR, 0),
      startDate: str(s.startDate, ""),
      renewalDate: str(s.renewalDate, ""),
      paymentStatus: str(s.paymentStatus, ""),
      benefits: str(s.benefits, ""),
      notes: str(s.notes, ""),
      pipelineStage:
        s.pipelineStage === "potencial" || s.pipelineStage === "negociação" ? s.pipelineStage : "ativo",
    })).filter((s) => s.id),
    injuries: arr<PresidentInjury>(o.injuries).map((i) => ({
      id: str(i.id, ""),
      playerName: str(i.playerName, ""),
      injuryType: str(i.injuryType, ""),
      expectedReturn: str(i.expectedReturn, ""),
      recoveryProgress: str(i.recoveryProgress, ""),
      medicalNotes: str(i.medicalNotes, ""),
      availabilityPct: num(i.availabilityPct, 0),
    })).filter((i) => i.id),
    disciplineIncidents: arr<PresidentDisciplineIncident>(o.disciplineIncidents).map((d) => ({
      id: str(d.id, ""),
      subjectType: d.subjectType === "treinador" ? "treinador" : "jogador",
      subjectName: str(d.subjectName, ""),
      category: str(d.category, ""),
      date: str(d.date, ""),
      details: str(d.details, ""),
      fineEUR: num(d.fineEUR, 0),
    })).filter((d) => d.id),
    operationsEvents: arr<PresidentOperationEvent>(o.operationsEvents).map((e) => ({
      id: str(e.id, ""),
      title: str(e.title, ""),
      category: str(e.category, ""),
      start: str(e.start, ""),
      end: str(e.end, ""),
      location: str(e.location, ""),
      resource: str(e.resource, ""),
    })).filter((e) => e.id),
    reports: arr<PresidentReport>(o.reports).map((r) => ({
      id: str(r.id, ""),
      title: str(r.title, ""),
      body: str(r.body, ""),
      createdAt: str(r.createdAt, ""),
    })).filter((r) => r.id),
    documents: arr<PresidentDocument>(o.documents).map((d) => ({
      id: str(d.id, ""),
      name: str(d.name, ""),
      category: str(d.category, ""),
      expiryDate: str(d.expiryDate, ""),
      notes: str(d.notes, ""),
      createdAt: str(d.createdAt, ""),
    })).filter((d) => d.id),
    communicationDrafts: arr<PresidentCommunication>(o.communicationDrafts).map((c) => ({
      id: str(c.id, ""),
      title: str(c.title, ""),
      body: str(c.body, ""),
      audience: str(c.audience, ""),
      createdAt: str(c.createdAt, ""),
    })).filter((c) => c.id),
    settings: {
      clubDisplayName: str(settings.clubDisplayName, fallback.settings.clubDisplayName),
      clubNotes: str(settings.clubNotes, fallback.settings.clubNotes),
      logoDataUrl: typeof settings.logoDataUrl === "string" ? settings.logoDataUrl : undefined,
    },
  };
}
