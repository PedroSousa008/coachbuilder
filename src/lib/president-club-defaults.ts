import type {
  PresidentClubState,
  PresidentCoach,
  PresidentCommunication,
  PresidentDisciplineIncident,
  PresidentDocument,
  PresidentEquipasSlot,
  PresidentFinanceMovement,
  PresidentInjury,
  PresidentMarketContact,
  PresidentOperationEvent,
  PresidentPayment,
  PresidentPlayer,
  PresidentReport,
  PresidentSponsor,
} from "@/types/president-club";

export const DEFAULT_PRESIDENT_EQUIPAS_SLOTS: PresidentEquipasSlot[] = [
  { id: "eq-benjamins", title: "Benjamins", linkedCoachUserId: null },
  { id: "eq-infantis", title: "Infantis", linkedCoachUserId: null },
  { id: "eq-iniciados", title: "Iniciados", linkedCoachUserId: null },
  { id: "eq-juvenis", title: "Juvenis", linkedCoachUserId: null },
  { id: "eq-juniores", title: "Júniores", linkedCoachUserId: null },
  { id: "eq-seniores", title: "Séniores", linkedCoachUserId: null },
];

export function emptyPresidentClubState(): PresidentClubState {
  return {
    coaches: [],
    players: [],
    equipasSlots: DEFAULT_PRESIDENT_EQUIPAS_SLOTS.map((s) => ({ ...s })),
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

  const equipasRaw = arr<Record<string, unknown>>(o.equipasSlots);
  const equipasSlots: PresidentEquipasSlot[] = (() => {
    if (equipasRaw.length === 0) return fallback.equipasSlots;
    const mapped = equipasRaw
      .map((row): PresidentEquipasSlot | null => {
        const id = str(row.id, "");
        const title = str(row.title, "");
        const link = row.linkedCoachUserId;
        const linkedCoachUserId = typeof link === "string" && link.trim() ? link.trim() : null;
        if (!id || !title) return null;
        return { id, title, linkedCoachUserId };
      })
      .filter((x): x is PresidentEquipasSlot => x !== null);
    return mapped.length > 0 ? mapped : fallback.equipasSlots;
  })();

  function paymentStatus(v: unknown): PresidentPayment["status"] {
    if (v === "pago") return "pago";
    if (v === "pendente") return "pendente";
    if (v === "atrasado") return "atrasado";
    return "pendente";
  }

  function sponsorPipeline(v: unknown): PresidentSponsor["pipelineStage"] {
    if (v === "potencial") return "potencial";
    if (v === "negociação") return "negociação";
    return "ativo";
  }

  return {
    coaches: arr<PresidentCoach>(o.coaches)
      .map(
        (c): PresidentCoach => ({
          id: str(c.id, ""),
          coachUserId: typeof (c as { coachUserId?: unknown }).coachUserId === "string" ? (c as { coachUserId: string }).coachUserId : undefined,
          coachEmail: typeof (c as { coachEmail?: unknown }).coachEmail === "string" ? (c as { coachEmail: string }).coachEmail : undefined,
          name: str(c.name, ""),
          birthDate: str(c.birthDate, ""),
          role: str(c.role, ""),
          team: str(c.team, ""),
          winPct: num(c.winPct, 0),
          sessionsCreated: num(c.sessionsCreated, 0),
          activityLevel:
            c.activityLevel === "Alta" || c.activityLevel === "Média" || c.activityLevel === "Baixa"
              ? c.activityLevel
              : "Média",
          parentRating: num(c.parentRating, 0),
          internalRank: num(c.internalRank, 0),
          contractStatus: str(c.contractStatus, ""),
          statsHistory: str(c.statsHistory, ""),
          careerPath: str(c.careerPath, ""),
          trophies: str(c.trophies, ""),
          methodology: str(c.methodology, ""),
          strengths: str(c.strengths, ""),
          notes: str(c.notes, ""),
        })
      )
      .filter((c) => c.id),
    players: arr<PresidentPlayer>(o.players).map((p) => ({
      id: str(p.id, ""),
      coachUserId: typeof (p as { coachUserId?: unknown }).coachUserId === "string" ? (p as { coachUserId: string }).coachUserId : undefined,
      coachEmail: typeof (p as { coachEmail?: unknown }).coachEmail === "string" ? (p as { coachEmail: string }).coachEmail : undefined,
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
    payments: arr<PresidentPayment>(o.payments)
      .map(
        (p): PresidentPayment => ({
          id: str(p.id, ""),
          playerName: str(p.playerName, ""),
          familyContact: str(p.familyContact, ""),
          status: paymentStatus(p.status),
          amountEUR: num(p.amountEUR, 0),
          dueDate: str(p.dueDate, ""),
          note: str(p.note, ""),
        })
      )
      .filter((p) => p.id),
    sponsors: arr<PresidentSponsor>(o.sponsors)
      .map(
        (s): PresidentSponsor => ({
          id: str(s.id, ""),
          company: str(s.company, ""),
          contactPerson: str(s.contactPerson, ""),
          contractValueEUR: num(s.contractValueEUR, 0),
          startDate: str(s.startDate, ""),
          renewalDate: str(s.renewalDate, ""),
          paymentStatus: str(s.paymentStatus, ""),
          benefits: str(s.benefits, ""),
          notes: str(s.notes, ""),
          pipelineStage: sponsorPipeline(s.pipelineStage),
        })
      )
      .filter((s) => s.id),
    injuries: arr<PresidentInjury>(o.injuries).map((i) => ({
      id: str(i.id, ""),
      playerName: str(i.playerName, ""),
      injuryType: str(i.injuryType, ""),
      expectedReturn: str(i.expectedReturn, ""),
      recoveryProgress: str(i.recoveryProgress, ""),
      medicalNotes: str(i.medicalNotes, ""),
      availabilityPct: num(i.availabilityPct, 0),
    })).filter((i) => i.id),
    disciplineIncidents: arr<PresidentDisciplineIncident>(o.disciplineIncidents)
      .map(
        (d): PresidentDisciplineIncident => ({
          id: str(d.id, ""),
          subjectType: d.subjectType === "treinador" ? "treinador" : "jogador",
          subjectName: str(d.subjectName, ""),
          category: str(d.category, ""),
          date: str(d.date, ""),
          details: str(d.details, ""),
          fineEUR: num(d.fineEUR, 0),
        })
      )
      .filter((d) => d.id),
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
    equipasSlots,
  };
}
