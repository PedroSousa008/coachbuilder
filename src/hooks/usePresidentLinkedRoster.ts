"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { buildWorkspaceSnapshotV1 } from "@/lib/build-workspace-snapshot";
import { isClubPresident } from "@/lib/president-mode";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { mapWorkspaceToPresidentCoach, mapWorkspaceToPresidentPlayers } from "@/lib/president-linked-roster";
import type { PresidentCoach, PresidentPlayer } from "@/types/president-club";

/** Intervalo entre sincronizações silenciosas com a cloud (plantel agregado). */
const PRESIDENT_LINKED_ROSTER_POLL_MS = 45_000;

type RemotePayload = {
  coaches: PresidentCoach[];
  players: PresidentPlayer[];
  linkedCoachAccounts: number;
};

export type PresidentLinkedRosterSource = "cloud" | "self" | "none";

export type PresidentLinkedRosterRefreshOptions = {
  /** Se true, não mostra spinner nem apaga dados em caso de falha transitória. */
  silent?: boolean;
};

export function usePresidentLinkedRoster() {
  const { user, authReady } = useAuth();
  const app = useAppData();
  const [remote, setRemote] = useState<RemotePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const selfSnapshot = useMemo(
    () =>
      buildWorkspaceSnapshotV1({
        players: app.players,
        staff: app.staff,
        teamRoles: app.teamRoles,
        conversations: app.conversations,
        messagesByConv: app.messagesByConv,
        trainingSessions: app.trainingSessions,
        trainingPlayerIdsBySession: app.trainingPlayerIdsBySession,
        fixtures: app.fixtures,
        leagueTableUrl: app.leagueTableUrl,
        leagueTableRows: app.leagueTableRows,
        leagueMatches: app.leagueMatches,
        leagueCompetitionName: app.leagueCompetitionName,
        leagueTableLastFetched: app.leagueTableLastFetched,
        leagueTableFetchError: app.leagueTableFetchError,
        coachProfile: app.coachProfile,
        savedTactics: app.savedTactics,
        tacticMatches: app.tacticMatches,
        tacticPlayerNotes: app.tacticPlayerNotes,
        savedTrainingExercises: app.savedTrainingExercises,
        sketchArea: app.sketchArea,
        teamCallup: app.teamCallup,
      }),
    [
      app.players,
      app.staff,
      app.teamRoles,
      app.conversations,
      app.messagesByConv,
      app.trainingSessions,
      app.trainingPlayerIdsBySession,
      app.fixtures,
      app.leagueTableUrl,
      app.leagueTableRows,
      app.leagueMatches,
      app.leagueCompetitionName,
      app.leagueTableLastFetched,
      app.leagueTableFetchError,
      app.coachProfile,
      app.savedTactics,
      app.tacticMatches,
      app.tacticPlayerNotes,
      app.savedTrainingExercises,
      app.sketchArea,
      app.teamCallup,
    ]
  );

  const refresh = useCallback(async (opts?: PresidentLinkedRosterRefreshOptions) => {
    const silent = Boolean(opts?.silent);
    if (!authReady || !user?.id || !isClubPresident(user)) {
      setRemote(null);
      setError(null);
      setLastSyncedAt(null);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      if (shouldUseCloudClientApis(user)) {
        try {
          const res = await fetch("/api/cloud/president/linked-roster", { credentials: "include" });
          const data = (await res.json()) as Record<string, unknown>;
          if (res.ok && data.ok === true) {
            setRemote({
              coaches: (data.coaches as PresidentCoach[]) ?? [],
              players: (data.players as PresidentPlayer[]) ?? [],
              linkedCoachAccounts: typeof data.linkedCoachAccounts === "number" ? data.linkedCoachAccounts : 0,
            });
            setLastSyncedAt(new Date().toISOString());
            setError(null);
          } else {
            if (!silent) {
              setRemote(null);
              if (typeof data.error === "string") setError(data.error);
            }
          }
        } catch {
          if (!silent) {
            setRemote(null);
            setError("Falha de rede ao carregar dados dos treinadores.");
          }
        }
      } else {
        if (!silent) {
          setRemote(null);
        }
      }
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [authReady, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Sincronização contínua: cloud + presidente. */
  useEffect(() => {
    if (!authReady || !user?.id || !isClubPresident(user) || !shouldUseCloudClientApis(user)) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, PRESIDENT_LINKED_ROSTER_POLL_MS);
    return () => window.clearInterval(id);
  }, [authReady, user, refresh]);

  useEffect(() => {
    if (!authReady || !user?.id || !isClubPresident(user) || !shouldUseCloudClientApis(user)) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const onFocus = () => void refresh({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [authReady, user, refresh]);

  const merged = useMemo(() => {
    if (!user?.id || !isClubPresident(user)) {
      return {
        coaches: [] as PresidentCoach[],
        players: [] as PresidentPlayer[],
        source: "none" as PresidentLinkedRosterSource,
        linkedCoachAccounts: 0,
      };
    }

    if (remote && (remote.coaches.length > 0 || remote.players.length > 0)) {
      return {
        coaches: remote.coaches,
        players: remote.players,
        source: "cloud" as const,
        linkedCoachAccounts: remote.linkedCoachAccounts,
      };
    }

    const coach = mapWorkspaceToPresidentCoach(user.id, user.email ?? "", selfSnapshot);
    const pl = mapWorkspaceToPresidentPlayers(user.id, user.email ?? "", selfSnapshot);
    const hasSelf =
      pl.length > 0 || (selfSnapshot.coachProfile.name ?? "").trim().length > 0 || (selfSnapshot.coachProfile.club ?? "").trim().length > 0;
    if (hasSelf) {
      return {
        coaches: [coach],
        players: pl,
        source: "self" as const,
        linkedCoachAccounts: remote?.linkedCoachAccounts ?? 0,
      };
    }

    return {
      coaches: [] as PresidentCoach[],
      players: [] as PresidentPlayer[],
      source: "none" as const,
      linkedCoachAccounts: remote?.linkedCoachAccounts ?? 0,
    };
  }, [user, remote, selfSnapshot]);

  return {
    loading,
    error,
    refresh,
    lastSyncedAt,
    coaches: merged.coaches,
    players: merged.players,
    source: merged.source,
    linkedCoachAccounts: merged.linkedCoachAccounts,
  };
}
