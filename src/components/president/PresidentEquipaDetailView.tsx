"use client";

import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { PresidentLinkedCoachBrief } from "@/lib/president-linked-coach-brief";

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

export type PresidentEquipaDetailViewProps = {
  title: string;
  linkedCoachUserId: string | null;
  coachOptions: { id: string; label: string }[];
  brief: PresidentLinkedCoachBrief | undefined;
  briefLoading: boolean;
  briefError: string | null;
  rosterLoading: boolean;
  onTitleChange: (title: string) => void;
  onCoachChange: (coachUserId: string | null) => void;
  onRefreshRoster: () => void | Promise<void>;
  onRefreshBriefs: () => void | Promise<void>;
};

export function PresidentEquipaDetailView({
  title,
  linkedCoachUserId,
  coachOptions,
  brief,
  briefLoading,
  briefError,
  rosterLoading,
  onTitleChange,
  onCoachChange,
  onRefreshRoster,
  onRefreshBriefs,
}: PresidentEquipaDetailViewProps) {
  const formStr = brief?.formLast5?.length ? brief.formLast5.join(" · ") : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/app/president/equipas"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-amber-400/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Todas as equipas
          </Link>
          <div>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Nome da equipa</span>
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="max-w-xl font-display text-xl font-semibold text-white sm:text-2xl"
                placeholder="Nome da equipa"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Treinador / conta para métricas:</span>
            <select
              className="h-9 max-w-full rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-sm text-zinc-100"
              value={linkedCoachUserId ?? ""}
              onChange={(e) => onCoachChange(e.target.value ? e.target.value : null)}
            >
              <option value="">— Não associado —</option>
              {coachOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {linkedCoachUserId ? <Badge variant="muted">Conta ligada</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void onRefreshRoster()} disabled={rosterLoading}>
            <RefreshCw className={cn("h-4 w-4", rosterLoading && "animate-spin")} />
            Actualizar treinadores
          </Button>
          <Button type="button" size="sm" onClick={() => void onRefreshBriefs()} disabled={briefLoading}>
            <RefreshCw className={cn("h-4 w-4", briefLoading && "animate-spin")} />
            Actualizar métricas
          </Button>
        </div>
      </div>

      {briefError ? <p className="text-sm text-red-400/90">{briefError}</p> : null}

      <Card className="border-surface-border bg-surface-raised/25">
        <CardContent className="space-y-6 pt-6 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormRow label="Posição na tabela">
              <p className="text-lg font-semibold tabular-nums text-white">
                {brief?.tablePosition != null ? `${brief.tablePosition}º` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Importada da liga no workspace do treinador. Actualiza com «Actualizar métricas».
              </p>
            </FormRow>
            <FormRow label="Forma (últimos 5)">
              <p className="text-lg font-medium text-white">{formStr}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Jogos registados com tática (igual ao painel do treinador).</p>
            </FormRow>
            <FormRow label="% vitórias">
              <p className="text-lg font-semibold tabular-nums text-white">{brief ? `${brief.winPct}%` : "—"}</p>
            </FormRow>
            <FormRow label="Liga (URL)">
              <p className="truncate text-sm text-zinc-400" title={brief?.leagueUrl ?? ""}>
                {brief?.leagueUrl ? brief.leagueUrl : "—"}
              </p>
            </FormRow>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <CardTitle className="text-sm text-white">Staff + treinador</CardTitle>
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {!brief || brief.staffRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-8 text-center text-zinc-500">
                        Associa um treinador para listar o staff sincronizado.
                      </td>
                    </tr>
                  ) : (
                    brief.staffRows.map((r) => (
                      <tr key={r.id} className="border-b border-surface-border/50">
                        <td className="px-3 py-2 font-medium text-zinc-200">{r.name}</td>
                        <td className="px-3 py-2 text-zinc-400">{r.role}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <CardTitle className="mb-2 text-sm text-white">Jogadores e desempenho</CardTitle>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Pos.</th>
                    <th className="px-3 py-2 font-medium">Jogos</th>
                    <th className="px-3 py-2 font-medium">Golos</th>
                    <th className="px-3 py-2 font-medium">Assist.</th>
                    <th className="px-3 py-2 font-medium">Amarelos</th>
                    <th className="px-3 py-2 font-medium">Vermelhos</th>
                  </tr>
                </thead>
                <tbody>
                  {!brief || brief.playerRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                        Sem plantel ou sem jogos registados nas táticas.
                      </td>
                    </tr>
                  ) : (
                    brief.playerRows.map((r) => (
                      <tr key={r.id} className="border-b border-surface-border/50">
                        <td className="px-3 py-2 font-medium text-zinc-200">{r.name}</td>
                        <td className="px-3 py-2 text-zinc-400">{r.position}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{r.games}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{r.goals}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{r.assists}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{r.yellowCards}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-400">{r.redCards}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
