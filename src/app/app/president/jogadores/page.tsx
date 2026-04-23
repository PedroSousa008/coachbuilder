"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentPlayer } from "@/types/president-club";
import { cn } from "@/lib/utils";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";

const ta = cn(
  "min-h-[64px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "placeholder:text-zinc-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

const empty: Omit<PresidentPlayer, "id"> = {
  name: "",
  age: "",
  team: "",
  position: "",
  attendance: "",
  potentialRating: "",
  injuryStatus: "",
  notes: "",
  isTopTalent: false,
  technicalEvolution: "",
  physicalNotes: "",
  coachFeedback: "",
  paymentsNote: "",
  injuriesNote: "",
  familyContacts: "",
};

function isLinkedPlayerRow(id: string): boolean {
  return id.startsWith("linked:") && id.split(":").length >= 3;
}

export default function PresidentJogadoresPage() {
  const { state, addPlayer, updatePlayer, removePlayer } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const mergedPlayers = useMemo(() => [...roster.players, ...state.players], [roster.players, state.players]);

  const startEdit = (p: PresidentPlayer) => {
    if (isLinkedPlayerRow(p.id)) return;
    setEditingId(p.id);
    const { id: _i, ...rest } = p;
    setForm(rest);
  };

  const reset = () => {
    setEditingId(null);
    setForm(empty);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) updatePlayer(editingId, form);
    else addPlayer(form);
    reset();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Jogadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Nome, idade, equipa (clube) e posição vêm do plantel que cada treinador gere no login normal, quando a conta
            está ligada ao presidente (cloud). Campos extra do presidente ficam nos registos manuais.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 self-start" onClick={() => void roster.refresh()} disabled={roster.loading}>
          <RefreshCw className={cn("h-4 w-4", roster.loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardContent className="py-4 text-sm text-zinc-400">
          <p>
            Os treinadores ligam em{" "}
            <Link href="/app/settings" className="text-accent underline-offset-2 hover:underline">
              Definições
            </Link>{" "}
            com o teu email de presidente. Depois carrega em Actualizar para ver o plantel agregado.
          </p>
          {roster.error ? <p className="mt-2 text-red-400/90">{roster.error}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">
            {editingId ? "Editar registo local" : "Registo local adicional (opcional)"}
          </CardTitle>
          <p className="text-xs text-zinc-500">Anotações internas ou jogadores fora do CoachBuilder.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Nome *</span>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-surface-border"
                checked={form.isTopTalent}
                onChange={(e) => setForm((f) => ({ ...f, isTopTalent: e.target.checked }))}
              />
              <span className="text-sm text-zinc-300">Talento de topo</span>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Idade / ano</span>
              <Input value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Equipa</span>
              <Input value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Posição</span>
              <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Presenças</span>
              <Input
                value={form.attendance}
                onChange={(e) => setForm((f) => ({ ...f, attendance: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Potencial</span>
              <Input
                value={form.potentialRating}
                onChange={(e) => setForm((f) => ({ ...f, potentialRating: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Estado lesão</span>
              <Input
                value={form.injuryStatus}
                onChange={(e) => setForm((f) => ({ ...f, injuryStatus: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Contactos família</span>
              <textarea
                className={ta}
                value={form.familyContacts}
                onChange={(e) => setForm((f) => ({ ...f, familyContacts: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Evolução técnica</span>
              <textarea
                className={ta}
                value={form.technicalEvolution}
                onChange={(e) => setForm((f) => ({ ...f, technicalEvolution: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Notas físicas</span>
              <textarea className={ta} value={form.physicalNotes} onChange={(e) => setForm((f) => ({ ...f, physicalNotes: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Feedback treinadores</span>
              <textarea className={ta} value={form.coachFeedback} onChange={(e) => setForm((f) => ({ ...f, coachFeedback: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Pagamentos</span>
              <textarea className={ta} value={form.paymentsNote} onChange={(e) => setForm((f) => ({ ...f, paymentsNote: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Lesões / histórico</span>
              <textarea className={ta} value={form.injuriesNote} onChange={(e) => setForm((f) => ({ ...f, injuriesNote: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Notas gerais</span>
              <textarea className={ta} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit">{editingId ? "Guardar" : "Adicionar registo local"}</Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">Plantel ({mergedPlayers.length})</CardTitle>
          {roster.source === "cloud" ? (
            <Badge variant="muted">Cloud · contas ligadas</Badge>
          ) : roster.source === "self" ? (
            <Badge variant="muted">Desta sessão</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Idade</th>
                <th className="px-4 py-3 font-medium">Equipa</th>
                <th className="px-4 py-3 font-medium">Pos.</th>
                <th className="px-4 py-3 font-medium">Presenças</th>
                <th className="px-4 py-3 font-medium">Topo</th>
                <th className="px-4 py-3 font-medium">Lesão</th>
                <th className="px-4 py-3 font-medium w-24">Acções</th>
              </tr>
            </thead>
            <tbody>
              {mergedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-zinc-500">
                    Sem jogadores sincronizados. Liga contas de treinadores ou adiciona registos locais acima.
                  </td>
                </tr>
              ) : (
                mergedPlayers.map((p) => {
                  const linked = isLinkedPlayerRow(p.id);
                  return (
                    <tr key={p.id} className="border-b border-surface-border/60">
                      <td className="px-4 py-3">
                        {linked ? (
                          <Badge variant="muted" className="whitespace-nowrap">
                            Treinador
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-zinc-800/80 text-zinc-400">
                            Local
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500" title={p.coachEmail ?? ""}>
                        {linked ? p.coachEmail ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-200">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.age || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.team || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.position || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.attendance || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.isTopTalent ? "Sim" : "—"}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-zinc-500" title={p.injuryStatus}>
                        {p.injuryStatus || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {linked ? (
                          <span className="text-xs text-zinc-600">—</span>
                        ) : (
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-400"
                              onClick={() => {
                                removePlayer(p.id);
                                if (editingId === p.id) reset();
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
