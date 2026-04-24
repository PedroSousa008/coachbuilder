"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { cn } from "@/lib/utils";

export default function PresidentEquipasPage() {
  const { state, addEquipasSlot, reorderEquipasSlots } = usePresidentClub();
  const roster = usePresidentLinkedRoster();

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

  const slotCoachLabel = useMemo(() => {
    const byId = new Map(roster.coaches.filter((c) => c.coachUserId).map((c) => [c.coachUserId!, c.name]));
    return (coachUserId: string | null) => (coachUserId ? byId.get(coachUserId) : undefined);
  }, [roster.coaches]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Equipas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escolhe um escalão para ver tabela, forma, staff e jogadores. Arrasta o ícone à esquerda para mudar a
            ordem dos títulos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void roster.refresh()} disabled={roster.loading}>
            Actualizar treinadores
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => addEquipasSlot()}>
            <Plus className="h-4 w-4" />
            +1 Equipa
          </Button>
        </div>
      </div>

      <Card className="border-surface-border bg-surface-raised/20">
        <CardContent className="p-0">
          <ul className="divide-y divide-surface-border/80">
            {state.equipasSlots.map((slot) => {
              const coachName = slotCoachLabel(slot.linkedCoachUserId ?? null);
              return (
                <li
                  key={slot.id}
                  data-slot-id={slot.id}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, slot.id)}
                  className="flex items-stretch"
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart(e, slot.id)}
                    onDragEnd={() => setDragId(null)}
                    className="flex w-12 shrink-0 cursor-grab items-center justify-center border-r border-surface-border/60 text-zinc-500 active:cursor-grabbing"
                    aria-label={`Arrastar ${slot.title}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/app/president/equipas/${encodeURIComponent(slot.id)}`}
                    className="group flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-white group-hover:text-amber-200/95">
                        {slot.title}
                      </p>
                      {coachName ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{coachName}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-zinc-600">Sem treinador associado</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {slot.linkedCoachUserId ? (
                        <Badge variant="muted" className="hidden sm:inline-flex">
                          Ligado
                        </Badge>
                      ) : null}
                      <ChevronRight className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-amber-400/80" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
