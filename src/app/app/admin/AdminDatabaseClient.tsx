"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, RefreshCw, Server } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { buildWorkspaceSnapshotV1 } from "@/lib/build-workspace-snapshot";
import { isCloudSyncEnabledClient } from "@/lib/cloud-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

function JsonBlock({ value }: { value: unknown }) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  return (
    <pre className="max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-surface-border bg-[#080a0c] p-3 text-[11px] leading-relaxed text-zinc-400">
      {text}
    </pre>
  );
}

function Sector({
  id,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
        aria-controls={`sector-${id}`}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
          <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
          <Badge variant="muted">{count}</Badge>
        </div>
      </button>
      {open ? (
        <div id={`sector-${id}`}>
          <CardContent className="border-t border-surface-border pt-4">{children}</CardContent>
        </div>
      ) : null}
    </Card>
  );
}

export function AdminDatabaseClient() {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const {
    hydrated,
    players,
    conversations,
    messagesByConv,
    trainingSessions,
    trainingPlayerIdsBySession,
    fixtures,
    leagueTableUrl,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
    leagueTableLastFetched,
    leagueTableFetchError,
    coachProfile,
    savedTactics,
    tacticMatches,
    tacticPlayerNotes,
    savedTrainingExercises,
    sketchArea,
  } = useAppData();

  const isAdmin = Boolean(user?.role === "admin" || (user?.email && clientEmailShowsAdminNav(user.email)));

  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [serverFetchState, setServerFetchState] = useState<"idle" | "loading" | "error">("idle");

  const refreshServerMeta = useCallback(async () => {
    if (!isCloudSyncEnabledClient()) {
      setServerUpdatedAt(null);
      setServerFetchState("idle");
      return;
    }
    setServerFetchState("loading");
    try {
      const res = await fetch("/api/cloud/workspace", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; updatedAt?: string | null };
      if (res.ok && data.ok) {
        setServerUpdatedAt(data.updatedAt ?? null);
        setServerFetchState("idle");
      } else {
        setServerFetchState("error");
      }
    } catch {
      setServerFetchState("error");
    }
  }, []);

  useEffect(() => {
    if (!authReady || !isAdmin) return;
    void refreshServerMeta();
  }, [authReady, isAdmin, refreshServerMeta, hydrated]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/app");
    }
  }, [authReady, user, isAdmin, router]);

  const snapshot = useMemo(
    () =>
      buildWorkspaceSnapshotV1({
        players,
        conversations,
        messagesByConv,
        trainingSessions,
        trainingPlayerIdsBySession,
        fixtures,
        leagueTableUrl,
        leagueTableRows,
        leagueMatches,
        leagueCompetitionName,
        leagueTableLastFetched,
        leagueTableFetchError,
        coachProfile,
        savedTactics,
        tacticMatches,
        tacticPlayerNotes,
        savedTrainingExercises,
        sketchArea,
      }),
    [
      players,
      conversations,
      messagesByConv,
      trainingSessions,
      trainingPlayerIdsBySession,
      fixtures,
      leagueTableUrl,
      leagueTableRows,
      leagueMatches,
      leagueCompetitionName,
      leagueTableLastFetched,
      leagueTableFetchError,
      coachProfile,
      savedTactics,
      tacticMatches,
      tacticPlayerNotes,
      savedTrainingExercises,
      sketchArea,
    ]
  );

  const messageCount = useMemo(
    () => Object.values(messagesByConv).reduce((n, arr) => n + arr.length, 0),
    [messagesByConv]
  );

  const tacticNoteCount = useMemo(() => Object.keys(tacticPlayerNotes).length, [tacticPlayerNotes]);

  const downloadFull = useCallback(() => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coachbuilder-workspace-${user?.id ?? "account"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [snapshot, user?.id]);

  if (!authReady || !user || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-zinc-500">
        A verificar permissões…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Base de dados da conta</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Vista única de tudo o que a app guarda para <span className="text-zinc-300">{user.email}</span>. Cada alteração
          noutras páginas aparece aqui logo que grava no estado (local + sync cloud quando activa).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
            Sincronização & exportação
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={() => void refreshServerMeta()}>
              <RefreshCw className={cn("h-3.5 w-3.5", serverFetchState === "loading" && "animate-spin")} />
              Cloud
            </Button>
            <Button type="button" size="sm" className="text-xs" onClick={downloadFull}>
              <Download className="h-3.5 w-3.5" />
              JSON completo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-400">
          <p>
            <span className="text-zinc-500">Estado local:</span>{" "}
            {hydrated ? <span className="text-emerald-400/90">carregado</span> : <span className="text-amber-400/90">a carregar…</span>}
          </p>
          {!isCloudSyncEnabledClient() ? (
            <p>Cloud desactivado neste ambiente — dados ficam no browser (localStorage por conta).</p>
          ) : serverFetchState === "error" ? (
            <p className="text-red-400/90">Não foi possível ler a meta do servidor.</p>
          ) : (
            <p>
              <span className="text-zinc-500">Workspace no PostgreSQL (última actualização):</span>{" "}
              {serverUpdatedAt ? (
                <span className="text-zinc-200">{new Date(serverUpdatedAt).toLocaleString()}</span>
              ) : (
                <span className="text-zinc-500">sem registo ainda</span>
              )}
            </p>
          )}
          <p className="text-xs text-zinc-600">
            No servidor, o pacote completo vive em <code className="text-zinc-500">Workspace.payload</code> (JSON). Esta
            página espelha o mesmo modelo, repartido por setores.
          </p>
        </CardContent>
      </Card>

      <Sector id="account" title="Conta & perfil de treinador" count={1 + (coachProfile.name ? 1 : 0)} defaultOpen>
        <div className="space-y-3">
          <JsonBlock
            value={{
              userId: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              coachProfile,
            }}
          />
        </div>
      </Sector>

      <Sector id="players" title="Plantel (jogadores)" count={players.length} defaultOpen>
        <JsonBlock value={players} />
      </Sector>

      <Sector id="tactics" title="Táticas guardadas" count={savedTactics.length}>
        <JsonBlock value={savedTactics} />
      </Sector>

      <Sector id="tactic-matches" title="Jogos registados (por tática)" count={tacticMatches.length}>
        <JsonBlock value={tacticMatches} />
      </Sector>

      <Sector id="tactic-notes" title="Notas análise tática × jogador" count={tacticNoteCount}>
        <JsonBlock value={tacticPlayerNotes} />
      </Sector>

      <Sector id="training" title="Sessões de treino & convocatórias" count={trainingSessions.length}>
        <JsonBlock
          value={{
            sessions: trainingSessions,
            trainingPlayerIdsBySession,
          }}
        />
      </Sector>

      <Sector id="library" title="Biblioteca de exercícios (guardados)" count={savedTrainingExercises.length}>
        <JsonBlock value={savedTrainingExercises} />
      </Sector>

      <Sector id="fixtures" title="Calendário / jogos (fixtures)" count={fixtures.length}>
        <JsonBlock value={fixtures} />
      </Sector>

      <Sector
        id="league"
        title="Liga importada (FPF / classificação)"
        count={leagueTableRows.length + leagueMatches.length}
      >
        <JsonBlock
          value={{
            url: leagueTableUrl,
            competitionName: leagueCompetitionName,
            lastFetched: leagueTableLastFetched,
            lastError: leagueTableFetchError,
            rows: leagueTableRows,
            matches: leagueMatches,
          }}
        />
      </Sector>

      <Sector
        id="messages"
        title="Mensagens & conversas"
        count={conversations.length + messageCount}
      >
        <JsonBlock
          value={{
            conversations,
            messagesByConversation: messagesByConv,
          }}
        />
      </Sector>

      <Sector
        id="sketch"
        title="Sketch Area (calendário, notas, tarefas, ficheiros, quadros, watchlist)"
        count={
          sketchArea.calendarEvents.length +
          sketchArea.notes.length +
          sketchArea.tasks.length +
          sketchArea.files.length +
          sketchArea.boardDrafts.length +
          sketchArea.watchlist.length
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <Badge variant="muted">Eventos {sketchArea.calendarEvents.length}</Badge>
            <Badge variant="muted">Notas {sketchArea.notes.length}</Badge>
            <Badge variant="muted">Tarefas {sketchArea.tasks.length}</Badge>
            <Badge variant="muted">Ficheiros {sketchArea.files.length}</Badge>
            <Badge variant="muted">Quadros {sketchArea.boardDrafts.length}</Badge>
            <Badge variant="muted">Watchlist {sketchArea.watchlist.length}</Badge>
          </div>
          <JsonBlock value={sketchArea} />
        </div>
      </Sector>

      <Sector id="full" title="Payload completo (workspace v1)" count={1}>
        <p className="mb-3 text-xs text-zinc-500">Idêntico ao ficheiro exportado e ao corpo guardado na cloud.</p>
        <JsonBlock value={snapshot} />
      </Sector>
    </div>
  );
}
