"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { safeLoadJSON, safeSaveJSON } from "@/lib/coachbuilder-persist";
import { userDataKey } from "@/lib/user-storage-keys";
import { emptyPresidentClubState, mergePresidentClubState } from "@/lib/president-club-defaults";
import {
  buildFinanceChart,
  computePresidentDashboardKpis,
  presidentUid,
  type PresidentDashboardKpis,
} from "@/lib/president-club-dashboard";
import {
  addCalendarMonths,
  paymentEffectiveEUR,
  paymentFromPlayer,
  QUOTA_INCOME_FINANCE_CATEGORY,
} from "@/lib/president-finance";
import { mergeLinkedPlayersIntoInjuries } from "@/lib/president-medical-sync";
import type {
  PresidentClubSettings,
  PresidentClubState,
  PresidentCoach,
  PresidentCommunication,
  PresidentDisciplineIncident,
  PresidentDocument,
  PresidentExpense,
  PresidentLinkedStaff,
  PresidentFinanceMovement,
  PresidentPaymentHistoryEntry,
  PresidentInjury,
  PresidentMarketContact,
  PresidentMedicalAppointment,
  PresidentMedicalInventoryItem,
  PresidentMedicalStaff,
  PresidentOperationEvent,
  PresidentPayment,
  PresidentPlayer,
  PresidentRecruitmentShortlistEntry,
  PresidentReport,
  PresidentSponsor,
  PresidentSponsorLead,
} from "@/types/president-club";

type PresidentClubContextValue = {
  ready: boolean;
  state: PresidentClubState;
  kpis: PresidentDashboardKpis;
  financeChart: ReturnType<typeof buildFinanceChart>;
  patchSettings: (patch: Partial<PresidentClubSettings>) => void;
  setLogoDataUrl: (dataUrl: string | undefined) => void;
  addCoach: (row: Omit<PresidentCoach, "id">) => string;
  updateCoach: (id: string, patch: Partial<PresidentCoach>) => void;
  removeCoach: (id: string) => void;
  addPlayer: (row: Omit<PresidentPlayer, "id">) => string;
  updatePlayer: (id: string, patch: Partial<PresidentPlayer>) => void;
  removePlayer: (id: string) => void;
  addMarketContact: (row: Omit<PresidentMarketContact, "id" | "savedAt">) => string;
  removeMarketContact: (id: string) => void;
  addRecruitmentShortlistEntry: (
    row: Omit<PresidentRecruitmentShortlistEntry, "id" | "savedAt">
  ) => string;
  updateRecruitmentShortlistEntry: (id: string, patch: Partial<PresidentRecruitmentShortlistEntry>) => void;
  removeRecruitmentShortlistEntry: (id: string) => void;
  touchRecruitmentShortlistCoach: (coachUserId: string) => void;
  addFinanceMovement: (row: Omit<PresidentFinanceMovement, "id">) => string;
  removeFinanceMovement: (id: string) => void;
  addExpense: (row: Omit<PresidentExpense, "id">) => string;
  updateExpense: (id: string, patch: Partial<PresidentExpense>) => void;
  removeExpense: (id: string) => void;
  markExpensePaid: (id: string) => void;
  syncExpensesWithLinkedStaff: (staffRows: PresidentLinkedStaff[]) => void;
  addPayment: (row: Omit<PresidentPayment, "id">) => string;
  updatePayment: (id: string, patch: Partial<PresidentPayment>) => void;
  removePayment: (id: string) => void;
  markPaymentPaid: (id: string) => void;
  syncFinancePaymentsWithRoster: (players: PresidentPlayer[]) => void;
  archiveFinancePayment: (id: string) => void;
  addSponsor: (row: Omit<PresidentSponsor, "id">) => string;
  updateSponsor: (id: string, patch: Partial<PresidentSponsor>) => void;
  removeSponsor: (id: string) => void;
  addSponsorLead: (row: Omit<PresidentSponsorLead, "id">) => string;
  updateSponsorLead: (id: string, patch: Partial<PresidentSponsorLead>) => void;
  removeSponsorLead: (id: string) => void;
  addInjury: (row: Omit<PresidentInjury, "id">) => string;
  updateInjury: (id: string, patch: Partial<PresidentInjury>) => void;
  removeInjury: (id: string) => void;
  syncMedicalFromLinkedRoster: (players: PresidentPlayer[]) => void;
  addMedicalStaff: (row: Omit<PresidentMedicalStaff, "id">) => string;
  updateMedicalStaff: (id: string, patch: Partial<PresidentMedicalStaff>) => void;
  removeMedicalStaff: (id: string) => void;
  addMedicalAppointment: (row: Omit<PresidentMedicalAppointment, "id">) => string;
  updateMedicalAppointment: (id: string, patch: Partial<PresidentMedicalAppointment>) => void;
  removeMedicalAppointment: (id: string) => void;
  addMedicalInventoryItem: (row: Omit<PresidentMedicalInventoryItem, "id">) => string;
  updateMedicalInventoryItem: (id: string, patch: Partial<PresidentMedicalInventoryItem>) => void;
  removeMedicalInventoryItem: (id: string) => void;
  syncMedicalStaffToExpenses: (staff: PresidentMedicalStaff[]) => void;
  addDisciplineIncident: (row: Omit<PresidentDisciplineIncident, "id">) => string;
  removeDisciplineIncident: (id: string) => void;
  addOperationEvent: (row: Omit<PresidentOperationEvent, "id">) => string;
  removeOperationEvent: (id: string) => void;
  addReport: (row: Omit<PresidentReport, "id" | "createdAt">) => string;
  removeReport: (id: string) => void;
  addDocument: (row: Omit<PresidentDocument, "id" | "createdAt">) => string;
  removeDocument: (id: string) => void;
  addCommunicationDraft: (row: Omit<PresidentCommunication, "id" | "createdAt">) => string;
  removeCommunicationDraft: (id: string) => void;
  renameEquipasSlot: (id: string, title: string) => void;
  setEquipasSlotCoach: (id: string, linkedCoachUserId: string | null) => void;
  addEquipasSlot: () => string;
  reorderEquipasSlots: (fromIndex: number, toIndex: number) => void;
};

const PresidentClubContext = createContext<PresidentClubContextValue | null>(null);

export function PresidentClubProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const userId = user?.id ?? "";
  const storageKey = userId ? userDataKey(userId, "presidentClub") : "";

  const [state, setState] = useState<PresidentClubState>(() => emptyPresidentClubState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setState(emptyPresidentClubState());
      setHydrated(true);
      return;
    }
    setHydrated(false);
    const merged = mergePresidentClubState(safeLoadJSON<unknown>(storageKey, null), emptyPresidentClubState());
    setState(merged);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey || !authReady) return;
    safeSaveJSON(storageKey, state);
  }, [state, storageKey, hydrated, authReady]);

  const patchSettings = useCallback((patch: Partial<PresidentClubSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const setLogoDataUrl = useCallback((dataUrl: string | undefined) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, logoDataUrl: dataUrl } }));
  }, []);

  const addCoach = useCallback((row: Omit<PresidentCoach, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, coaches: [{ ...row, id }, ...prev.coaches] }));
    return id;
  }, []);

  const updateCoach = useCallback((id: string, patch: Partial<PresidentCoach>) => {
    setState((prev) => ({
      ...prev,
      coaches: prev.coaches.map((c) => (c.id === id ? { ...c, ...patch, id } : c)),
    }));
  }, []);

  const removeCoach = useCallback((id: string) => {
    setState((prev) => ({ ...prev, coaches: prev.coaches.filter((c) => c.id !== id) }));
  }, []);

  const addPlayer = useCallback((row: Omit<PresidentPlayer, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, players: [{ ...row, id }, ...prev.players] }));
    return id;
  }, []);

  const updatePlayer = useCallback((id: string, patch: Partial<PresidentPlayer>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...patch, id } : p)),
    }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }));
  }, []);

  const addMarketContact = useCallback((row: Omit<PresidentMarketContact, "id" | "savedAt">) => {
    const id = presidentUid();
    const savedAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      marketContacts: [{ ...row, id, savedAt }, ...prev.marketContacts],
    }));
    return id;
  }, []);

  const removeMarketContact = useCallback((id: string) => {
    setState((prev) => ({ ...prev, marketContacts: prev.marketContacts.filter((m) => m.id !== id) }));
  }, []);

  const addRecruitmentShortlistEntry = useCallback((row: Omit<PresidentRecruitmentShortlistEntry, "id" | "savedAt">): string => {
    const newId = presidentUid();
    const savedAt = new Date().toISOString();
    let returnedId = newId;
    setState((prev) => {
      const exists = prev.recruitmentShortlist.find((s) => s.coachUserId === row.coachUserId);
      if (exists) {
        returnedId = exists.id;
        return {
          ...prev,
          recruitmentShortlist: prev.recruitmentShortlist.map((s) =>
            s.coachUserId === row.coachUserId ? { ...s, ...row, id: s.id, savedAt: s.savedAt } : s
          ),
        };
      }
      returnedId = newId;
      return {
        ...prev,
        recruitmentShortlist: [{ ...row, id: newId, savedAt }, ...prev.recruitmentShortlist],
      };
    });
    return returnedId;
  }, []);

  const updateRecruitmentShortlistEntry = useCallback((id: string, patch: Partial<PresidentRecruitmentShortlistEntry>) => {
    setState((prev) => ({
      ...prev,
      recruitmentShortlist: prev.recruitmentShortlist.map((s) => (s.id === id ? { ...s, ...patch, id } : s)),
    }));
  }, []);

  const removeRecruitmentShortlistEntry = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      recruitmentShortlist: prev.recruitmentShortlist.filter((s) => s.id !== id),
    }));
  }, []);

  const touchRecruitmentShortlistCoach = useCallback((coachUserId: string) => {
    const t = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      recruitmentShortlist: prev.recruitmentShortlist.map((s) =>
        s.coachUserId === coachUserId ? { ...s, lastViewedAt: t } : s
      ),
    }));
  }, []);

  const addFinanceMovement = useCallback((row: Omit<PresidentFinanceMovement, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, financeMovements: [{ ...row, id }, ...prev.financeMovements] }));
    return id;
  }, []);

  const removeFinanceMovement = useCallback((id: string) => {
    setState((prev) => ({ ...prev, financeMovements: prev.financeMovements.filter((f) => f.id !== id) }));
  }, []);

  const addExpense = useCallback((row: Omit<PresidentExpense, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, expenses: [{ ...row, id }, ...prev.expenses] }));
    return id;
  }, []);

  const updateExpense = useCallback((id: string, patch: Partial<PresidentExpense>) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((x) => (x.id === id ? { ...x, ...patch, id } : x)),
    }));
  }, []);

  const removeExpense = useCallback((id: string) => {
    setState((prev) => ({ ...prev, expenses: prev.expenses.filter((x) => x.id !== id) }));
  }, []);

  const markExpensePaid = useCallback((id: string) => {
    setState((prev) => {
      const exp = prev.expenses.find((x) => x.id === id);
      if (!exp) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const nextDue = addCalendarMonths(exp.dueDate || today, 1);
      const current = prev.expenses.map((x) =>
        x.id === id ? { ...x, status: "pago" as const, lastPaidAt: today } : x
      );
      if (!exp.recurringMonthly) return { ...prev, expenses: current };
      const next: PresidentExpense = {
        ...exp,
        id: presidentUid(),
        dueDate: nextDue,
        status: "pendente",
        lastPaidAt: "",
      };
      return { ...prev, expenses: [next, ...current] };
    });
  }, []);

  const syncExpensesWithLinkedStaff = useCallback((staffRows: PresidentLinkedStaff[]) => {
    setState((prev) => {
      if (!staffRows.length) return prev;
      const byKey = new Map(staffRows.map((s) => [s.sourceStaffKey, s]));
      const updated = prev.expenses.map((e) => {
        if (!e.sourceStaffKey) return e;
        const hit = byKey.get(e.sourceStaffKey);
        if (!hit) return e;
        const nextName = hit.name.trim() || e.name;
        const nextRole = hit.role.trim() || e.role;
        const nextTeam = hit.team.trim() || e.teamOrDepartment;
        if (e.name === nextName && e.role === nextRole && e.teamOrDepartment === nextTeam) return e;
        return { ...e, name: nextName, role: nextRole, teamOrDepartment: nextTeam };
      });
      const additions: PresidentExpense[] = [];
      for (const s of staffRows) {
        const exists = updated.some((e) => e.sourceStaffKey === s.sourceStaffKey);
        if (exists) continue;
        additions.push({
          id: presidentUid(),
          name: s.name,
          category: "treinadores_staff",
          description: s.role || "Staff técnico",
          teamOrDepartment: s.team || "",
          dueDate: "",
          valueEUR: 0,
          status: "pendente",
          paymentMethod: "transferencia_bancaria",
          paymentInfo: "",
          note: "Sincronizado automaticamente a partir do staff das equipas dos treinadores.",
          lastPaidAt: "",
          recurringMonthly: true,
          role: s.role || "",
          supplier: "",
          sourceStaffKey: s.sourceStaffKey,
          coachUserId: s.coachUserId,
        });
      }
      if (!additions.length && updated.every((e, i) => e === prev.expenses[i])) return prev;
      return { ...prev, expenses: [...additions, ...updated] };
    });
  }, []);

  const addPayment = useCallback((row: Omit<PresidentPayment, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, payments: [{ ...row, id }, ...prev.payments] }));
    return id;
  }, []);

  const updatePayment = useCallback((id: string, patch: Partial<PresidentPayment>) => {
    setState((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.id === id ? { ...p, ...patch, id } : p)),
    }));
  }, []);

  const removePayment = useCallback((id: string) => {
    setState((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }));
  }, []);

  const markPaymentPaid = useCallback((id: string) => {
    setState((prev) => {
      const p = prev.payments.find((x) => x.id === id);
      if (!p || p.archived) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const eff = paymentEffectiveEUR(p);
      const hist: PresidentPaymentHistoryEntry = {
        id: presidentUid(),
        paidAt: today,
        amountEUR: eff,
        note: "Pago",
      };
      const baseDue = p.dueDate && p.dueDate.length >= 10 ? p.dueDate : today;
      const nextDue = addCalendarMonths(baseDue, 1);
      const newMovs =
        eff > 0
          ? [
              {
                id: presidentUid(),
                kind: "income" as const,
                category: QUOTA_INCOME_FINANCE_CATEGORY,
                amountEUR: eff,
                date: today,
                note: `Quota: ${p.playerName}`,
              },
              ...prev.financeMovements,
            ]
          : prev.financeMovements;
      return {
        ...prev,
        financeMovements: newMovs,
        payments: prev.payments.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "pago" as const,
                lastPaidAt: today,
                dueDate: nextDue,
                history: [hist, ...(x.history ?? [])],
              }
            : x
        ),
      };
    });
  }, []);

  const syncFinancePaymentsWithRoster = useCallback((players: PresidentPlayer[]) => {
    setState((prev) => {
      const byId = new Map(players.map((p) => [p.id, p]));
      const paymentsSynced = prev.payments.map((pay) => {
        if (!pay.playerSourceId || pay.archived) return pay;
        const pl = byId.get(pay.playerSourceId);
        if (!pl) return pay;
        const nextTeam = (pl.team ?? "").trim() || pay.team;
        const nextCoachLabel = (pl.team ?? "").trim() || (pay.coachTeamLabel ?? "");
        if (pay.team === nextTeam && (pay.coachTeamLabel ?? "") === nextCoachLabel) return pay;
        return { ...pay, team: nextTeam, coachTeamLabel: nextCoachLabel };
      });
      const additions: PresidentPayment[] = [];
      for (const pl of players) {
        const exists = paymentsSynced.some((x) => x.playerSourceId === pl.id && !x.archived);
        if (exists) continue;
        additions.push({ id: presidentUid(), ...paymentFromPlayer(pl) });
      }
      const teamChanged =
        paymentsSynced.length === prev.payments.length &&
        paymentsSynced.some((p, i) => p !== prev.payments[i]);
      if (!additions.length && !teamChanged) return prev;
      return { ...prev, payments: [...additions, ...paymentsSynced] };
    });
  }, []);

  const archiveFinancePayment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.id === id ? { ...p, archived: true } : p)),
    }));
  }, []);

  const addSponsor = useCallback((row: Omit<PresidentSponsor, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, sponsors: [{ ...row, id }, ...prev.sponsors] }));
    return id;
  }, []);

  const updateSponsor = useCallback((id: string, patch: Partial<PresidentSponsor>) => {
    setState((prev) => ({
      ...prev,
      sponsors: prev.sponsors.map((s) => (s.id === id ? { ...s, ...patch, id } : s)),
    }));
  }, []);

  const removeSponsor = useCallback((id: string) => {
    setState((prev) => ({ ...prev, sponsors: prev.sponsors.filter((s) => s.id !== id) }));
  }, []);

  const addSponsorLead = useCallback((row: Omit<PresidentSponsorLead, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, sponsorLeads: [{ ...row, id }, ...prev.sponsorLeads] }));
    return id;
  }, []);

  const updateSponsorLead = useCallback((id: string, patch: Partial<PresidentSponsorLead>) => {
    setState((prev) => ({
      ...prev,
      sponsorLeads: prev.sponsorLeads.map((s) => (s.id === id ? { ...s, ...patch, id } : s)),
    }));
  }, []);

  const removeSponsorLead = useCallback((id: string) => {
    setState((prev) => ({ ...prev, sponsorLeads: prev.sponsorLeads.filter((s) => s.id !== id) }));
  }, []);

  const addInjury = useCallback((row: Omit<PresidentInjury, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, injuries: [{ ...row, id }, ...prev.injuries] }));
    return id;
  }, []);

  const updateInjury = useCallback((id: string, patch: Partial<PresidentInjury>) => {
    setState((prev) => ({
      ...prev,
      injuries: prev.injuries.map((i) => (i.id === id ? { ...i, ...patch, id } : i)),
    }));
  }, []);

  const removeInjury = useCallback((id: string) => {
    setState((prev) => ({ ...prev, injuries: prev.injuries.filter((i) => i.id !== id) }));
  }, []);

  const syncMedicalFromLinkedRoster = useCallback((players: PresidentPlayer[]) => {
    setState((prev) => ({
      ...prev,
      injuries: mergeLinkedPlayersIntoInjuries(prev.injuries, players),
    }));
  }, []);

  const addMedicalStaff = useCallback((row: Omit<PresidentMedicalStaff, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, medicalStaff: [{ ...row, id }, ...prev.medicalStaff] }));
    return id;
  }, []);

  const updateMedicalStaff = useCallback((id: string, patch: Partial<PresidentMedicalStaff>) => {
    setState((prev) => ({
      ...prev,
      medicalStaff: prev.medicalStaff.map((m) => (m.id === id ? { ...m, ...patch, id } : m)),
    }));
  }, []);

  const removeMedicalStaff = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      medicalStaff: prev.medicalStaff.filter((m) => m.id !== id),
      expenses: prev.expenses.filter((e) => e.sourceMedicalStaffId !== id),
    }));
  }, []);

  const addMedicalAppointment = useCallback((row: Omit<PresidentMedicalAppointment, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, medicalAppointments: [{ ...row, id }, ...prev.medicalAppointments] }));
    return id;
  }, []);

  const updateMedicalAppointment = useCallback((id: string, patch: Partial<PresidentMedicalAppointment>) => {
    setState((prev) => ({
      ...prev,
      medicalAppointments: prev.medicalAppointments.map((a) => (a.id === id ? { ...a, ...patch, id } : a)),
    }));
  }, []);

  const removeMedicalAppointment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      medicalAppointments: prev.medicalAppointments.filter((a) => a.id !== id),
    }));
  }, []);

  const addMedicalInventoryItem = useCallback((row: Omit<PresidentMedicalInventoryItem, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, medicalInventory: [{ ...row, id }, ...prev.medicalInventory] }));
    return id;
  }, []);

  const updateMedicalInventoryItem = useCallback((id: string, patch: Partial<PresidentMedicalInventoryItem>) => {
    setState((prev) => ({
      ...prev,
      medicalInventory: prev.medicalInventory.map((x) => (x.id === id ? { ...x, ...patch, id } : x)),
    }));
  }, []);

  const removeMedicalInventoryItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      medicalInventory: prev.medicalInventory.filter((x) => x.id !== id),
    }));
  }, []);

  const syncMedicalStaffToExpenses = useCallback((staff: PresidentMedicalStaff[]) => {
    setState((prev) => {
      if (!staff.length) return prev;
      const rolePt = (r: PresidentMedicalStaff["role"]) => {
        if (r === "fisioterapeuta") return "Fisioterapeuta";
        if (r === "medico") return "Médico";
        if (r === "preparador_reabilitacao") return "Preparador de reabilitação";
        if (r === "nutricionista") return "Nutricionista";
        return "Psicólogo";
      };
      const byId = new Map(staff.map((s) => [s.id, s]));
      const updated = prev.expenses.map((e) => {
        if (!e.sourceMedicalStaffId) return e;
        const m = byId.get(e.sourceMedicalStaffId);
        if (!m) return e;
        const nextName = m.name.trim() || e.name;
        const nextDesc = `${rolePt(m.role)} · ${m.email || "sem email"}`;
        if (e.name === nextName && e.description === nextDesc && e.role === rolePt(m.role)) return e;
        return { ...e, name: nextName, description: nextDesc, role: rolePt(m.role) };
      });
      const additions: PresidentExpense[] = [];
      for (const m of staff) {
        const exists = updated.some((e) => e.sourceMedicalStaffId === m.id);
        if (exists) continue;
        additions.push({
          id: presidentUid(),
          name: m.name.trim() || m.email || "Staff clínico",
          category: "saude",
          description: `${rolePt(m.role)} · ${m.email || "sem email"}`,
          teamOrDepartment: "Centro médico",
          dueDate: "",
          valueEUR: 0,
          status: "pendente",
          paymentMethod: "transferencia_bancaria",
          paymentInfo: m.phone || "",
          note: "Sincronizado a partir do Centro médico (equipa clínica). Aparece em Pagamentos para gestão de honorários.",
          lastPaidAt: "",
          recurringMonthly: false,
          role: rolePt(m.role),
          supplier: "",
          sourceMedicalStaffId: m.id,
        });
      }
      if (!additions.length && updated.every((e, i) => e === prev.expenses[i])) return prev;
      return { ...prev, expenses: [...additions, ...updated] };
    });
  }, []);

  const addDisciplineIncident = useCallback((row: Omit<PresidentDisciplineIncident, "id">) => {
    const id = presidentUid();
    setState((prev) => ({
      ...prev,
      disciplineIncidents: [{ ...row, id }, ...prev.disciplineIncidents],
    }));
    return id;
  }, []);

  const removeDisciplineIncident = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      disciplineIncidents: prev.disciplineIncidents.filter((d) => d.id !== id),
    }));
  }, []);

  const addOperationEvent = useCallback((row: Omit<PresidentOperationEvent, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, operationsEvents: [{ ...row, id }, ...prev.operationsEvents] }));
    return id;
  }, []);

  const removeOperationEvent = useCallback((id: string) => {
    setState((prev) => ({ ...prev, operationsEvents: prev.operationsEvents.filter((e) => e.id !== id) }));
  }, []);

  const addReport = useCallback((row: Omit<PresidentReport, "id" | "createdAt">) => {
    const id = presidentUid();
    const createdAt = new Date().toISOString();
    setState((prev) => ({ ...prev, reports: [{ ...row, id, createdAt }, ...prev.reports] }));
    return id;
  }, []);

  const removeReport = useCallback((id: string) => {
    setState((prev) => ({ ...prev, reports: prev.reports.filter((r) => r.id !== id) }));
  }, []);

  const addDocument = useCallback((row: Omit<PresidentDocument, "id" | "createdAt">) => {
    const id = presidentUid();
    const createdAt = new Date().toISOString();
    setState((prev) => ({ ...prev, documents: [{ ...row, id, createdAt }, ...prev.documents] }));
    return id;
  }, []);

  const removeDocument = useCallback((id: string) => {
    setState((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }));
  }, []);

  const addCommunicationDraft = useCallback((row: Omit<PresidentCommunication, "id" | "createdAt">) => {
    const id = presidentUid();
    const createdAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      communicationDrafts: [{ ...row, id, createdAt }, ...prev.communicationDrafts],
    }));
    return id;
  }, []);

  const removeCommunicationDraft = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      communicationDrafts: prev.communicationDrafts.filter((c) => c.id !== id),
    }));
  }, []);

  const renameEquipasSlot = useCallback((id: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    setState((prev) => ({
      ...prev,
      equipasSlots: prev.equipasSlots.map((s) => (s.id === id ? { ...s, title: t } : s)),
    }));
  }, []);

  const setEquipasSlotCoach = useCallback((id: string, linkedCoachUserId: string | null) => {
    setState((prev) => ({
      ...prev,
      equipasSlots: prev.equipasSlots.map((s) => (s.id === id ? { ...s, linkedCoachUserId } : s)),
    }));
  }, []);

  const addEquipasSlot = useCallback(() => {
    const id = presidentUid();
    setState((prev) => ({
      ...prev,
      equipasSlots: [...prev.equipasSlots, { id, title: "Nova equipa", linkedCoachUserId: null }],
    }));
    return id;
  }, []);

  const reorderEquipasSlots = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const list = [...prev.equipasSlots];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved!);
      return { ...prev, equipasSlots: list };
    });
  }, []);

  const kpis = useMemo(() => computePresidentDashboardKpis(state), [state]);
  const financeChart = useMemo(() => buildFinanceChart(state), [state]);

  const value = useMemo<PresidentClubContextValue>(
    () => ({
      ready: hydrated,
      state,
      kpis,
      financeChart,
      patchSettings,
      setLogoDataUrl,
      addCoach,
      updateCoach,
      removeCoach,
      addPlayer,
      updatePlayer,
      removePlayer,
      addMarketContact,
      removeMarketContact,
      addRecruitmentShortlistEntry,
      updateRecruitmentShortlistEntry,
      removeRecruitmentShortlistEntry,
      touchRecruitmentShortlistCoach,
      addFinanceMovement,
      removeFinanceMovement,
      addExpense,
      updateExpense,
      removeExpense,
      markExpensePaid,
      syncExpensesWithLinkedStaff,
      addPayment,
      updatePayment,
      removePayment,
      markPaymentPaid,
      syncFinancePaymentsWithRoster,
      archiveFinancePayment,
      addSponsor,
      updateSponsor,
      removeSponsor,
      addSponsorLead,
      updateSponsorLead,
      removeSponsorLead,
      addInjury,
      updateInjury,
      removeInjury,
      syncMedicalFromLinkedRoster,
      addMedicalStaff,
      updateMedicalStaff,
      removeMedicalStaff,
      addMedicalAppointment,
      updateMedicalAppointment,
      removeMedicalAppointment,
      addMedicalInventoryItem,
      updateMedicalInventoryItem,
      removeMedicalInventoryItem,
      syncMedicalStaffToExpenses,
      addDisciplineIncident,
      removeDisciplineIncident,
      addOperationEvent,
      removeOperationEvent,
      addReport,
      removeReport,
      addDocument,
      removeDocument,
      addCommunicationDraft,
      removeCommunicationDraft,
      renameEquipasSlot,
      setEquipasSlotCoach,
      addEquipasSlot,
      reorderEquipasSlots,
    }),
    [
      hydrated,
      state,
      kpis,
      financeChart,
      patchSettings,
      setLogoDataUrl,
      addCoach,
      updateCoach,
      removeCoach,
      addPlayer,
      updatePlayer,
      removePlayer,
      addMarketContact,
      removeMarketContact,
      addRecruitmentShortlistEntry,
      updateRecruitmentShortlistEntry,
      removeRecruitmentShortlistEntry,
      touchRecruitmentShortlistCoach,
      addFinanceMovement,
      removeFinanceMovement,
      addExpense,
      updateExpense,
      removeExpense,
      markExpensePaid,
      syncExpensesWithLinkedStaff,
      addPayment,
      updatePayment,
      removePayment,
      markPaymentPaid,
      syncFinancePaymentsWithRoster,
      archiveFinancePayment,
      addSponsor,
      updateSponsor,
      removeSponsor,
      addSponsorLead,
      updateSponsorLead,
      removeSponsorLead,
      addInjury,
      updateInjury,
      removeInjury,
      syncMedicalFromLinkedRoster,
      addMedicalStaff,
      updateMedicalStaff,
      removeMedicalStaff,
      addMedicalAppointment,
      updateMedicalAppointment,
      removeMedicalAppointment,
      addMedicalInventoryItem,
      updateMedicalInventoryItem,
      removeMedicalInventoryItem,
      syncMedicalStaffToExpenses,
      addDisciplineIncident,
      removeDisciplineIncident,
      addOperationEvent,
      removeOperationEvent,
      addReport,
      removeReport,
      addDocument,
      removeDocument,
      addCommunicationDraft,
      removeCommunicationDraft,
      renameEquipasSlot,
      setEquipasSlotCoach,
      addEquipasSlot,
      reorderEquipasSlots,
    ]
  );

  return <PresidentClubContext.Provider value={value}>{children}</PresidentClubContext.Provider>;
}

export function usePresidentClub(): PresidentClubContextValue {
  const ctx = useContext(PresidentClubContext);
  if (!ctx) throw new Error("usePresidentClub must be used within PresidentClubProvider");
  return ctx;
}
