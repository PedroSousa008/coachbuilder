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
import { addCalendarMonths, paymentEffectiveEUR, paymentFromPlayer } from "@/lib/president-finance";
import type {
  PresidentClubSettings,
  PresidentClubState,
  PresidentCoach,
  PresidentCommunication,
  PresidentDisciplineIncident,
  PresidentDocument,
  PresidentFinanceMovement,
  PresidentPaymentHistoryEntry,
  PresidentInjury,
  PresidentMarketContact,
  PresidentOperationEvent,
  PresidentPayment,
  PresidentPlayer,
  PresidentReport,
  PresidentSponsor,
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
  addFinanceMovement: (row: Omit<PresidentFinanceMovement, "id">) => string;
  removeFinanceMovement: (id: string) => void;
  addPayment: (row: Omit<PresidentPayment, "id">) => string;
  updatePayment: (id: string, patch: Partial<PresidentPayment>) => void;
  removePayment: (id: string) => void;
  markPaymentPaid: (id: string) => void;
  syncFinancePaymentsWithRoster: (players: PresidentPlayer[]) => void;
  archiveFinancePayment: (id: string) => void;
  addSponsor: (row: Omit<PresidentSponsor, "id">) => string;
  updateSponsor: (id: string, patch: Partial<PresidentSponsor>) => void;
  removeSponsor: (id: string) => void;
  addInjury: (row: Omit<PresidentInjury, "id">) => string;
  updateInjury: (id: string, patch: Partial<PresidentInjury>) => void;
  removeInjury: (id: string) => void;
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

  const addFinanceMovement = useCallback((row: Omit<PresidentFinanceMovement, "id">) => {
    const id = presidentUid();
    setState((prev) => ({ ...prev, financeMovements: [{ ...row, id }, ...prev.financeMovements] }));
    return id;
  }, []);

  const removeFinanceMovement = useCallback((id: string) => {
    setState((prev) => ({ ...prev, financeMovements: prev.financeMovements.filter((f) => f.id !== id) }));
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
                category: "Quotas / jogadores",
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
      addFinanceMovement,
      removeFinanceMovement,
      addPayment,
      updatePayment,
      removePayment,
      markPaymentPaid,
      syncFinancePaymentsWithRoster,
      archiveFinancePayment,
      addSponsor,
      updateSponsor,
      removeSponsor,
      addInjury,
      updateInjury,
      removeInjury,
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
      addFinanceMovement,
      removeFinanceMovement,
      addPayment,
      updatePayment,
      removePayment,
      markPaymentPaid,
      syncFinancePaymentsWithRoster,
      archiveFinancePayment,
      addSponsor,
      updateSponsor,
      removeSponsor,
      addInjury,
      updateInjury,
      removeInjury,
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
