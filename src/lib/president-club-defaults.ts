import type {
  PresidentClubState,
  PresidentCoach,
  PresidentCommunication,
  PresidentDisciplineIncident,
  PresidentDocument,
  PresidentEquipasSlot,
  PresidentExpense,
  PresidentFinanceMovement,
  PresidentInjury,
  PresidentMedicalAppointment,
  PresidentMedicalInventoryItem,
  PresidentMedicalStaff,
  PresidentMarketContact,
  PresidentOperationEvent,
  PresidentPayment,
  PresidentPlayer,
  PresidentRecruitmentShortlistEntry,
  PresidentReport,
  PresidentSponsorLead,
  PresidentSponsor,
} from "@/types/president-club";
import { normalizePaymentRow } from "@/lib/president-finance";

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
    recruitmentShortlist: [],
    financeMovements: [],
    expenses: [],
    payments: [],
    sponsors: [],
    sponsorLeads: [],
    injuries: [],
    medicalStaff: [],
    medicalAppointments: [],
    medicalInventory: [],
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

  function sponsorType(v: unknown): PresidentSponsor["type"] {
    return v === "parceiro" ? "parceiro" : "patrocinador";
  }
  function sponsorSegment(v: unknown): PresidentSponsor["segment"] {
    if (v === "principal") return "principal";
    if (v === "secundario") return "secundario";
    if (v === "parceiro_tecnico") return "parceiro_tecnico";
    if (v === "parceiro_institucional") return "parceiro_institucional";
    return "apoio_local";
  }
  function sponsorFrequency(v: unknown): PresidentSponsor["paymentFrequency"] {
    if (v === "mensal") return "mensal";
    if (v === "anual") return "anual";
    return "unico";
  }
  function sponsorStatus(v: unknown): PresidentSponsor["status"] {
    if (v === "ativo") return "ativo";
    if (v === "em_negociacao") return "em_negociacao";
    if (v === "expirado") return "expirado";
    if (v === "perdido") return "perdido";
    if (v === "negociação") return "em_negociacao";
    return "ativo";
  }
  function sponsorLeadStatus(v: unknown): PresidentSponsorLead["status"] {
    if (v === "contactado") return "contactado";
    if (v === "em_negociacao") return "em_negociacao";
    if (v === "proposta_enviada") return "proposta_enviada";
    if (v === "fechado") return "fechado";
    if (v === "perdido") return "perdido";
    return "por_contactar";
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
    recruitmentShortlist: (() => {
      if (!Object.prototype.hasOwnProperty.call(o, "recruitmentShortlist")) {
        return fallback.recruitmentShortlist;
      }
      const raw = arr<Record<string, unknown>>(o.recruitmentShortlist);
      if (raw.length === 0) return [];
      const contactOk = (v: unknown): PresidentRecruitmentShortlistEntry["contactStatus"] => {
        const s = typeof v === "string" ? v : "";
        if (s === "contactado" || s === "em_conversa" || s === "recusado" || s === "fechado") return s;
        return "sem_contacto";
      };
      const priorityOk = (v: unknown): PresidentRecruitmentShortlistEntry["priority"] => {
        const s = typeof v === "string" ? v : "";
        if (s === "alta" || s === "baixa") return s;
        return "media";
      };
      const mapped = raw
        .map((row): PresidentRecruitmentShortlistEntry | null => {
          const id = str(row.id, "");
          const coachUserId = str(row.coachUserId, "");
          if (!id || !coachUserId) return null;
          const rating = num(row.internalRating, 0);
          const ids = arr<unknown>(row.compareWithCoachIds)
            .map((x) => (typeof x === "string" ? x : ""))
            .filter(Boolean);
          return {
            id,
            coachUserId,
            coachEmail: str(row.coachEmail, ""),
            coachName: str(row.coachName, ""),
            priority: priorityOk(row.priority),
            roleNeed: str(row.roleNeed, ""),
            contactStatus: contactOk(row.contactStatus),
            notes: str(row.notes, ""),
            lastViewedAt: str(row.lastViewedAt, ""),
            internalRating: Math.min(10, Math.max(0, rating)),
            compareWithCoachIds: ids,
            isPriorityTarget: bool(row.isPriorityTarget, false),
            savedAt: str(row.savedAt, new Date().toISOString()),
          };
        })
        .filter((x): x is PresidentRecruitmentShortlistEntry => x !== null);
      return mapped.length > 0 ? mapped : fallback.recruitmentShortlist;
    })(),
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
    expenses: arr<Record<string, unknown>>(o.expenses)
      .map((e): PresidentExpense => ({
        id: str(e.id, ""),
        name: str(e.name, ""),
        category: (() => {
          const v = str(e.category, "");
          if (
            v === "treinadores_staff" ||
            v === "arbitragem_taxas_jogo" ||
            v === "campo_instalacoes" ||
            v === "equipamento" ||
            v === "transporte" ||
            v === "seguros_licencas" ||
            v === "administracao" ||
            v === "saude" ||
            v === "dividas_antigas" ||
            v === "outras_despesas"
          ) {
            return v;
          }
          return "outras_despesas";
        })(),
        description: str(e.description, ""),
        teamOrDepartment: str(e.teamOrDepartment, ""),
        dueDate: str(e.dueDate, ""),
        valueEUR: num(e.valueEUR, 0),
        status: (() => {
          const v = str(e.status, "");
          if (v === "pago" || v === "atrasado") return v;
          return "pendente";
        })(),
        paymentMethod: (() => {
          const v = str(e.paymentMethod, "");
          if (
            v === "numerario" ||
            v === "transferencia_bancaria" ||
            v === "mbway" ||
            v === "cartao" ||
            v === "debito_direto" ||
            v === "outro"
          ) {
            return v;
          }
          return "transferencia_bancaria";
        })(),
        paymentInfo: str(e.paymentInfo, ""),
        note: str(e.note, ""),
        lastPaidAt: str(e.lastPaidAt, ""),
        recurringMonthly: bool(e.recurringMonthly, false),
        role: str(e.role, ""),
        supplier: str(e.supplier, ""),
        sourceStaffKey: typeof e.sourceStaffKey === "string" ? e.sourceStaffKey : undefined,
        sourceMedicalStaffId: typeof e.sourceMedicalStaffId === "string" ? e.sourceMedicalStaffId : undefined,
        coachUserId: typeof e.coachUserId === "string" ? e.coachUserId : undefined,
      }))
      .filter((e) => e.id),
    payments: arr<Record<string, unknown>>(o.payments)
      .map((raw) => {
        const id = str(raw.id, "");
        if (!id) return null;
        return normalizePaymentRow({ ...(raw as object), id } as Partial<PresidentPayment> & { id: string });
      })
      .filter((p): p is PresidentPayment => p !== null),
    sponsors: arr<PresidentSponsor>(o.sponsors)
      .map(
        (s): PresidentSponsor => ({
          id: str(s.id, ""),
          logoUrl: str((s as { logoUrl?: unknown }).logoUrl, ""),
          company: str(s.company, ""),
          type: sponsorType((s as { type?: unknown }).type),
          segment: sponsorSegment((s as { segment?: unknown }).segment),
          contactPerson: str(s.contactPerson, ""),
          contactEmail: str((s as { contactEmail?: unknown }).contactEmail, ""),
          contactPhone: str((s as { contactPhone?: unknown }).contactPhone, ""),
          contractValueEUR: num(s.contractValueEUR, 0),
          amountPaidEUR: num((s as { amountPaidEUR?: unknown }).amountPaidEUR, 0),
          paymentFrequency: sponsorFrequency((s as { paymentFrequency?: unknown }).paymentFrequency),
          status: sponsorStatus((s as { status?: unknown }).status ?? (s as { pipelineStage?: unknown }).pipelineStage),
          startDate: str(s.startDate, ""),
          endDate: str((s as { endDate?: unknown }).endDate, ""),
          renewalDate: str(s.renewalDate, ""),
          nextPaymentDate: str((s as { nextPaymentDate?: unknown }).nextPaymentDate, ""),
          contractPdfUrl: str((s as { contractPdfUrl?: unknown }).contractPdfUrl, ""),
          exposureTypes: arr<unknown>((s as { exposureTypes?: unknown }).exposureTypes)
            .map((x) => (typeof x === "string" ? x : ""))
            .filter(
              (
                x
              ): x is
                | "equipamento_frente"
                | "equipamento_costas"
                | "equipamento_mangas"
                | "campo_placards"
                | "redes_sociais"
                | "eventos" =>
                x === "equipamento_frente" ||
                x === "equipamento_costas" ||
                x === "equipamento_mangas" ||
                x === "campo_placards" ||
                x === "redes_sociais" ||
                x === "eventos"
            ),
          contractDurationMonths: num((s as { contractDurationMonths?: unknown }).contractDurationMonths, 0),
          clausesNotes: str((s as { clausesNotes?: unknown }).clausesNotes, ""),
          deliverablesPosts: num((s as { deliverablesPosts?: unknown }).deliverablesPosts, 0),
          deliverablesMatches: num((s as { deliverablesMatches?: unknown }).deliverablesMatches, 0),
          deliverablesEvents: num((s as { deliverablesEvents?: unknown }).deliverablesEvents, 0),
          visibilityProofUrls: str((s as { visibilityProofUrls?: unknown }).visibilityProofUrls, ""),
          autoReportNotes: str((s as { autoReportNotes?: unknown }).autoReportNotes, ""),
          timelineNotes: str((s as { timelineNotes?: unknown }).timelineNotes, ""),
          interactionsLog: str((s as { interactionsLog?: unknown }).interactionsLog, ""),
          notes: str(s.notes, ""),
          active: bool((s as { active?: unknown }).active, sponsorStatus((s as { status?: unknown }).status) === "ativo"),
        })
      )
      .filter((s) => s.id),
    sponsorLeads: arr<PresidentSponsorLead>(o.sponsorLeads)
      .map(
        (x): PresidentSponsorLead => ({
          id: str(x.id, ""),
          company: str(x.company, ""),
          contact: str(x.contact, ""),
          status: sponsorLeadStatus(x.status),
          notes: str(x.notes, ""),
          interactionsLog: str(x.interactionsLog, ""),
        })
      )
      .filter((x) => x.id),
    injuries: arr<PresidentInjury>(o.injuries)
      .map((i): PresidentInjury | null => {
        const id = str(i.id, "");
        if (!id) return null;
        const sev = str(i.severity, "");
        const severity: PresidentInjury["severity"] =
          sev === "leve" || sev === "moderada" || sev === "grave" || sev === "longa_duracao"
            ? sev
            : "moderada";
        const st = str(i.status, "");
        const status: PresidentInjury["status"] =
          st === "em_avaliacao" ||
          st === "em_recuperacao" ||
          st === "retorno_ao_treino" ||
          st === "plenas_condicoes" ||
          st === "cirurgia" ||
          st === "repouso"
            ? st
            : "em_recuperacao";
        const startDate = str(i.startDate, "").slice(0, 10) || str(i.expectedReturn, "").slice(0, 10) || "";
        return {
          id,
          sourcePlayerId: typeof i.sourcePlayerId === "string" ? i.sourcePlayerId : undefined,
          syncedFromCoach: typeof i.syncedFromCoach === "boolean" ? i.syncedFromCoach : false,
          playerName: str(i.playerName, ""),
          team: str(i.team, ""),
          position: str(i.position, ""),
          injuryType: str(i.injuryType, ""),
          bodyArea: str(i.bodyArea, ""),
          severity,
          startDate,
          expectedReturn: str(i.expectedReturn, "").slice(0, 10),
          daysOut: num(i.daysOut, 0),
          status,
          assignedStaff: str(i.assignedStaff, ""),
          note: str(i.note, ""),
          recoveryProgress: str(i.recoveryProgress, ""),
          medicalNotes: str(i.medicalNotes, ""),
          availabilityPct: Math.min(100, Math.max(0, num(i.availabilityPct, 0))),
          rehabSessionsDone: num(i.rehabSessionsDone ?? 0, 0),
          nextMilestone: str(i.nextMilestone, ""),
          workloadNotes: str(i.workloadNotes, ""),
          recurrenceWarning: bool(i.recurrenceWarning, false),
          medicalCostEUR: num(i.medicalCostEUR ?? 0, 0),
        };
      })
      .filter((x): x is PresidentInjury => x !== null),
    medicalStaff: arr<PresidentMedicalStaff>(o.medicalStaff)
      .map(
        (m): PresidentMedicalStaff => ({
          id: str(m.id, ""),
          name: str(m.name, ""),
          email: str(m.email, ""),
          phone: str(m.phone, ""),
          role: (() => {
            const r = str(m.role, "");
            if (
              r === "fisioterapeuta" ||
              r === "medico" ||
              r === "preparador_reabilitacao" ||
              r === "nutricionista" ||
              r === "psicologo"
            )
              return r;
            return "fisioterapeuta";
          })(),
          notes: str(m.notes, ""),
        })
      )
      .filter((m) => m.id),
    medicalAppointments: arr<PresidentMedicalAppointment>(o.medicalAppointments)
      .map(
        (a): PresidentMedicalAppointment => ({
          id: str(a.id, ""),
          playerName: str(a.playerName, ""),
          date: str(a.date, "").slice(0, 16),
          type: str(a.type, ""),
          professional: str(a.professional, ""),
          status: (() => {
            const s = str(a.status, "");
            if (s === "concluido" || s === "cancelado") return s;
            return "agendado";
          })(),
          notes: str(a.notes, ""),
        })
      )
      .filter((a) => a.id),
    medicalInventory: arr<PresidentMedicalInventoryItem>(o.medicalInventory)
      .map(
        (x): PresidentMedicalInventoryItem => ({
          id: str(x.id, ""),
          item: str(x.item, ""),
          stock: num(x.stock, 0),
          minLevel: num(x.minLevel, 0),
          supplier: str(x.supplier, ""),
        })
      )
      .filter((x) => x.id),
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
