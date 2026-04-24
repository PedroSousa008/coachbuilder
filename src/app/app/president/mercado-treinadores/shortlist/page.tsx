"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentRecruitmentShortlistEntry } from "@/types/president-club";

const ta =
  "min-h-[80px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20";

function priorityBadge(p: PresidentRecruitmentShortlistEntry["priority"]) {
  if (p === "alta") return <Badge className="border border-red-500/30 bg-red-500/10 text-red-100">Alta</Badge>;
  if (p === "baixa") return <Badge variant="muted">Baixa</Badge>;
  return <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-100">Média</Badge>;
}

export default function PresidentMercadoShortlistPage() {
  const { state, updateRecruitmentShortlistEntry, removeRecruitmentShortlistEntry } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...state.recruitmentShortlist].sort((a, b) => {
        if (a.isPriorityTarget !== b.isPriorityTarget) return a.isPriorityTarget ? -1 : 1;
        const pr: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
        return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1);
      }),
    [state.recruitmentShortlist]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/app/president/mercado-treinadores"
            className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-400/90"
          >
            <ChevronLeft className="h-4 w-4" />
            Mercado de Transferências
          </Link>
          <h2 className="font-display text-2xl font-semibold text-white">Shortlist de recrutamento</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Prioridades, função procurada, estado de contacto, notas e última visualização.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="border-surface-border bg-surface-raised/25">
          <CardContent className="py-12 text-center text-sm text-zinc-500">
            Ainda não guardaste alvos. Explora o{" "}
            <Link href="/app/president/mercado-treinadores" className="text-amber-400/90 underline-offset-2 hover:underline">
              mercado
            </Link>{" "}
            e usa «Guardar alvo».
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((row) => (
            <Card key={row.id} className="border-surface-border bg-surface-raised/25">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base text-white">{row.coachName}</CardTitle>
                  <p className="mt-1 truncate text-xs text-zinc-500">{row.coachEmail}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {priorityBadge(row.priority)}
                    {row.isPriorityTarget ? (
                      <Badge className="border border-rose-500/30 bg-rose-500/10 text-rose-100">Prioridade absoluta</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(editingId === row.id ? null : row.id)}>
                    {editingId === row.id ? "Fechar" : "Editar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400/90"
                    onClick={() => removeRecruitmentShortlistEntry(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-400">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-600">Função procurada</p>
                    <p className="text-zinc-200">{row.roleNeed || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-600">Estado de contacto</p>
                    <p className="text-zinc-200">
                      {row.contactStatus === "sem_contacto" && "Sem contacto"}
                      {row.contactStatus === "contactado" && "Contactado"}
                      {row.contactStatus === "em_conversa" && "Em conversa"}
                      {row.contactStatus === "recusado" && "Recusado"}
                      {row.contactStatus === "fechado" && "Fechado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-600">Avaliação interna</p>
                    <p className="text-zinc-200">{row.internalRating > 0 ? `${row.internalRating}/10` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-600">Última visualização</p>
                    <p className="text-zinc-200">
                      {row.lastViewedAt ? new Date(row.lastViewedAt).toLocaleString("pt-PT") : "—"}
                    </p>
                  </div>
                </div>
                {row.notes ? (
                  <div className="rounded-lg border border-surface-border/60 bg-black/20 p-3 text-xs text-zinc-300">{row.notes}</div>
                ) : null}

                {editingId === row.id ? (
                  <EditShortlistForm
                    row={row}
                    onSave={(patch) => {
                      updateRecruitmentShortlistEntry(row.id, patch);
                      setEditingId(null);
                    }}
                  />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EditShortlistForm({
  row,
  onSave,
}: {
  row: PresidentRecruitmentShortlistEntry;
  onSave: (patch: Partial<PresidentRecruitmentShortlistEntry>) => void;
}) {
  const [priority, setPriority] = useState(row.priority);
  const [roleNeed, setRoleNeed] = useState(row.roleNeed);
  const [contactStatus, setContactStatus] = useState(row.contactStatus);
  const [notes, setNotes] = useState(row.notes);
  const [internalRating, setInternalRating] = useState(row.internalRating > 0 ? String(row.internalRating) : "");
  const [isPriorityTarget, setIsPriorityTarget] = useState(row.isPriorityTarget);

  return (
    <div className="mt-4 space-y-3 border-t border-surface-border/60 pt-4">
      <label className="grid gap-1">
        <span className="text-xs text-zinc-500">Prioridade</span>
        <select
          className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
          value={priority}
          onChange={(e) => setPriority(e.target.value as PresidentRecruitmentShortlistEntry["priority"])}
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-zinc-500">Função / necessidade</span>
        <Input value={roleNeed} onChange={(e) => setRoleNeed(e.target.value)} placeholder="ex. Treinador adjunto Sub-15" />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-zinc-500">Estado de contacto</span>
        <select
          className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
          value={contactStatus}
          onChange={(e) => setContactStatus(e.target.value as PresidentRecruitmentShortlistEntry["contactStatus"])}
        >
          <option value="sem_contacto">Sem contacto</option>
          <option value="contactado">Contactado</option>
          <option value="em_conversa">Em conversa</option>
          <option value="recusado">Recusado</option>
          <option value="fechado">Fechado</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-zinc-500">Avaliação interna (1–10, vazio = sem nota)</span>
        <Input value={internalRating} onChange={(e) => setInternalRating(e.target.value)} inputMode="numeric" placeholder="8" />
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={isPriorityTarget} onChange={(e) => setIsPriorityTarget(e.target.checked)} />
        Marcar como alvo prioritário
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-zinc-500">Notas privadas</span>
        <textarea className={ta} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Promessa de resposta, valores, etc." />
      </label>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          const n = parseInt(internalRating, 10);
          const rating = Number.isFinite(n) && n >= 1 && n <= 10 ? n : 0;
          onSave({
            priority,
            roleNeed: roleNeed.trim(),
            contactStatus,
            notes: notes.trim(),
            internalRating: rating,
            isPriorityTarget,
          });
        }}
      >
        Guardar alterações
      </Button>
    </div>
  );
}
