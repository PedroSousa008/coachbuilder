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

type AdminSummaryRow = {
  userId: string;
  email: string;
  name: string;
  role: string;
  subscriptionPlan: string;
  workspaceUpdatedAt: string | null;
  hasWorkspace: boolean;
  counts: {
    players: number;
    tactics: number;
    tacticMatches: number;
    tacticPlayerNotes: number;
    trainingSessions: number;
    fixtures: number;
    conversations: number;
    messages: number;
    savedTrainingExercises: number;
    sketchCalendarEvents: number;
    sketchNotes: number;
    sketchTasks: number;
    sketchFiles: number;
    sketchBoardDrafts: number;
    sketchWatchlist: number;
  };
};

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
    staff,
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

  const [allRows, setAllRows] = useState<AdminSummaryRow[]>([]);
  const [summaryMeta, setSummaryMeta] = useState<{ generatedAt: string; totalUsers: number } | null>(null);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [inspectLabel, setInspectLabel] = useState<string>("");
  const [inspectPayload, setInspectPayload] = useState<unknown>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectErr, setInspectErr] = useState<string | null>(null);

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

  const loadAllWorkspacesSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryErr(null);
    try {
      const res = await fetch("/api/cloud/admin/workspaces/summary", { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        rows?: AdminSummaryRow[];
        generatedAt?: string;
        totalUsers?: number;
      };
      if (!res.ok || !data.ok) {
        setSummaryErr(typeof data.error === "string" ? data.error : "Não foi possível carregar o índice de contas.");
        setAllRows([]);
        setSummaryMeta(null);
        return;
      }
      setAllRows(Array.isArray(data.rows) ? data.rows : []);
      setSummaryMeta(
        data.generatedAt != null && data.totalUsers != null
          ? { generatedAt: data.generatedAt, totalUsers: data.totalUsers }
          : null
      );
    } catch {
      setSummaryErr("Erro de rede ao pedir o índice.");
      setAllRows([]);
      setSummaryMeta(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadInspectPayload = useCallback(async (row: AdminSummaryRow) => {
    setInspectUserId(row.userId);
    setInspectLabel(`${row.name} · ${row.email}`);
    setInspectPayload(null);
    setInspectErr(null);
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/cloud/admin/workspaces/${encodeURIComponent(row.userId)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; payload?: unknown };
      if (!res.ok || !data.ok) {
        setInspectErr(typeof data.error === "string" ? data.error : "Falha ao ler o workspace.");
        return;
      }
      setInspectPayload(data.payload ?? null);
    } catch {
      setInspectErr("Erro de rede.");
    } finally {
      setInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !isAdmin) return;
    void refreshServerMeta();
  }, [authReady, isAdmin, refreshServerMeta, hydrated]);

  useEffect(() => {
    if (!authReady || !isAdmin) return;
    void loadAllWorkspacesSummary();
  }, [authReady, isAdmin, loadAllWorkspacesSummary]);

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
        staff,
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
      staff,
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

  const downloadInspectJson = useCallback(() => {
    if (inspectPayload == null) return;
    const blob = new Blob([JSON.stringify(inspectPayload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safe = inspectUserId ?? "user";
    a.download = `coachbuilder-workspace-server-${safe}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [inspectPayload, inspectUserId]);

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
        <h2 className="font-display text-xl font-semibold text-white">Base de dados (admin)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          <strong className="font-medium text-zinc-400">Todas as contas (PostgreSQL):</strong> cada utilizador que usa a
          sync na nuvem tem uma linha <code className="text-zinc-600">Workspace</code> com o pacote completo (táticas,
          jogadores, treinos, calendário, mensagens, Sketch Area, etc.). O índice abaixo inclui{" "}
          <span className="text-zinc-300">contas actuais e futuras</span> automaticamente quando sincronizam.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          <strong className="font-medium text-zinc-400">Sessão actual (browser):</strong> os setores mais abaixo
          reflectem a conta com que estás autenticado agora (<span className="text-zinc-300">{user.email}</span>) — útil
          para ver alterações em tempo real antes de irem para o servidor.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base text-white">Índice — todas as contas no servidor</CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-xs"
            disabled={summaryLoading}
            onClick={() => void loadAllWorkspacesSummary()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", summaryLoading && "animate-spin")} />
            Actualizar índice
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryErr ? <p className="text-sm text-red-400/90">{summaryErr}</p> : null}
          {summaryMeta ? (
            <p className="text-xs text-zinc-500">
              {summaryMeta.totalUsers} utilizadores · gerado {new Date(summaryMeta.generatedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 font-medium">Conta</th>
                  <th className="px-3 py-2 font-medium">Plano</th>
                  <th className="px-3 py-2 font-medium">Sync</th>
                  <th className="px-3 py-2 font-medium">Jog.</th>
                  <th className="px-3 py-2 font-medium">Tát.</th>
                  <th className="px-3 py-2 font-medium">Jogos</th>
                  <th className="px-3 py-2 font-medium">Treinos</th>
                  <th className="px-3 py-2 font-medium">Fix.</th>
                  <th className="px-3 py-2 font-medium">Msg</th>
                  <th className="px-3 py-2 font-medium">Ex.</th>
                  <th className="px-3 py-2 font-medium">Sketch</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {allRows.map((r) => {
                  const sk =
                    r.counts.sketchCalendarEvents +
                    r.counts.sketchNotes +
                    r.counts.sketchTasks +
                    r.counts.sketchFiles +
                    r.counts.sketchBoardDrafts +
                    r.counts.sketchWatchlist;
                  return (
                    <tr key={r.userId} className="border-b border-surface-border/60 text-zinc-300 hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <p className="font-medium text-zinc-200">{r.name}</p>
                        <p className="text-[10px] text-zinc-500">{r.email}</p>
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{r.subscriptionPlan}</td>
                      <td className="px-3 py-2 text-zinc-500">
                        {r.hasWorkspace && r.workspaceUpdatedAt
                          ? new Date(r.workspaceUpdatedAt).toLocaleString()
                          : r.hasWorkspace
                            ? "—"
                            : "sem workspace"}
                      </td>
                      <td className="px-3 py-2">{r.counts.players}</td>
                      <td className="px-3 py-2">{r.counts.tactics}</td>
                      <td className="px-3 py-2">{r.counts.tacticMatches}</td>
                      <td className="px-3 py-2">{r.counts.trainingSessions}</td>
                      <td className="px-3 py-2">{r.counts.fixtures}</td>
                      <td className="px-3 py-2">{r.counts.messages}</td>
                      <td className="px-3 py-2">{r.counts.savedTrainingExercises}</td>
                      <td className="px-3 py-2">{sk}</td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px] text-accent"
                          onClick={() => void loadInspectPayload(r)}
                        >
                          Ver JSON
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!summaryLoading && allRows.length === 0 && !summaryErr ? (
            <p className="text-sm text-zinc-500">Sem utilizadores na base de dados.</p>
          ) : null}
        </CardContent>
      </Card>

      {inspectUserId ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base text-white">Payload no servidor · {inspectLabel}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setInspectUserId(null);
                  setInspectPayload(null);
                  setInspectErr(null);
                }}
              >
                Fechar
              </Button>
              <Button type="button" size="sm" className="text-xs" disabled={inspectPayload == null} onClick={downloadInspectJson}>
                <Download className="h-3.5 w-3.5" />
                Descarregar JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {inspectLoading ? <p className="text-sm text-zinc-500">A carregar…</p> : null}
            {inspectErr ? <p className="text-sm text-red-400/90">{inspectErr}</p> : null}
            {!inspectLoading && inspectPayload != null ? <JsonBlock value={inspectPayload} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">Sessão actual (esta conta)</p>

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

      <Sector id="account" title="Conta & perfil de treinador (sessão)" count={2} defaultOpen>
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
