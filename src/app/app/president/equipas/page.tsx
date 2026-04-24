"use client";

import { useMemo, useState, useCallback } from "react";
import { GripVertical, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { useLinkedCoachesBrief } from "@/hooks/useLinkedCoachesBrief";
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

function EquipaCard({
  slotId,
  title,
  linkedCoachUserId,
  coachOptions,
  brief,
  onTitleChange,
  onCoachChange,
  dragProps,
}: {
  slotId: string;
  title: string;
  linkedCoachUserId: string | null;
  coachOptions: { id: string; label: string }[];
  brief: PresidentLinkedCoachBrief | undefined;
  onTitleChange: (title: string) => void;
  onCoachChange: (coachUserId: string | null) => void;
  dragProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  const formStr = brief?.formLast5?.length ? brief.formLast5.join(" · ") : "—";
  return (
    <div data-slot-id={slotId} onDragOver={dragProps.onDragOver} onDrop={dragProps.onDrop}>
      <Card className="border-surface-border bg-surface-raised/25">
      <CardHeader className="flex flex-row flex-wrap items-start gap-3 border-b border-surface-border/60 pb-4">
        <button
          type="button"
          draggable={dragProps.draggable}
          onDragStart={dragProps.onDragStart}
          onDragEnd={dragProps.onDragEnd}
          className="mt-1 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-surface-border text-zinc-500 active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block">
            <span className="sr-only">Nome da equipa</span>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="font-display text-lg font-semibold text-white"
              placeholder="Nome da equipa"
            />
          </label>
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormRow label="Posição na tabela">
            <p className="text-lg font-semibold tabular-nums text-white">
              {brief?.tablePosition != null ? `${brief.tablePosition}º` : "—"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Importada da liga no workspace do treinador (link no calendário). Actualiza ao actualizar esta página.
            </p>
          </FormRow>
          <FormRow label="Forma (últimos 5)">
            <p className="text-lg font-medium text-white">{formStr}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Mesma lógica que o painel do treinador (jogos com tática).</p>
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
            {linkedCoachUserId ? <Badge variant="muted">Conta ligada</Badge> : null}
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

export default function PresidentEquipasPage() {
  const { state, renameEquipasSlot, setEquipasSlotCoach, addEquipasSlot, reorderEquipasSlots } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const coachIdsForBrief = useMemo(
    () => state.equipasSlots.map((s) => s.linkedCoachUserId).filter((x): x is string => Boolean(x)),
    [state.equipasSlots]
  );
  const { briefs, loading: briefLoading, error: briefError, refresh: refreshBriefs } = useLinkedCoachesBrief(coachIdsForBrief);

  const coachOptions = useMemo(() => {
    const opts = roster.coaches
      .filter((c) => c.coachUserId)
      .map((c) => ({
        id: c.coachUserId!,
        label: `${c.name}${c.coachEmail ? ` · ${c.coachEmail}` : ""}`,
      }));
    return opts;
  }, [roster.coaches]);

  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = useCallback((e: React.DragEvent, slotId: string) => {
    setDragId(slotId);
    e.dataTransfer.setData("text/plain", slotId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent, targetSlotId: string) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain") || dragId;
      setDragId(null);
      if (!fromId || fromId === targetSlotId) return;
      const slots = state.equipasSlots;
      const fromIndex = slots.findIndex((s) => s.id === fromId);
      const toIndex = slots.findIndex((s) => s.id === targetSlotId);
      if (fromIndex < 0 || toIndex < 0) return;
      reorderEquipasSlots(fromIndex, toIndex);
    },
    [dragId, reorderEquipasSlots, state.equipasSlots]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Equipas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escalões do clube: renomeia cada cartão, associa um treinador com conta ligada para puxar posição na tabela,
            forma recente, % de vitórias, staff e estatísticas de jogadores (jogos com tática). Arrasta o ícone à
            esquerda para reordenar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void roster.refresh()} disabled={roster.loading}>
            <RefreshCw className={cn("h-4 w-4", roster.loading && "animate-spin")} />
            Actualizar treinadores
          </Button>
          <Button type="button" size="sm" onClick={() => void refreshBriefs()} disabled={briefLoading}>
            <RefreshCw className={cn("h-4 w-4", briefLoading && "animate-spin")} />
            Actualizar métricas
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => addEquipasSlot()}>
            <Plus className="h-4 w-4" />
            +1 Equipa
          </Button>
        </div>
      </div>

      {briefError ? <p className="text-sm text-red-400/90">{briefError}</p> : null}

      <div className="space-y-6">
        {state.equipasSlots.map((slot) => (
          <EquipaCard
            key={slot.id}
            slotId={slot.id}
            title={slot.title}
            linkedCoachUserId={slot.linkedCoachUserId}
            coachOptions={coachOptions}
            brief={slot.linkedCoachUserId ? briefs[slot.linkedCoachUserId] : undefined}
            onTitleChange={(t) => renameEquipasSlot(slot.id, t)}
            onCoachChange={(cid) => setEquipasSlotCoach(slot.id, cid)}
            dragProps={{
              draggable: true,
              onDragStart: (e) => onDragStart(e, slot.id),
              onDragOver,
              onDrop: (e) => onDrop(e, slot.id),
              onDragEnd: () => setDragId(null),
            }}
          />
        ))}
      </div>
    </div>
  );
}
