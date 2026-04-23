"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentPlayer } from "@/types/president-club";
import { cn } from "@/lib/utils";

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

export default function PresidentJogadoresPage() {
  const { state, addPlayer, updatePlayer, removePlayer } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const startEdit = (p: PresidentPlayer) => {
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
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Jogadores</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Plantel do clube: presenças, potencial, lesões, contactos e talentos de topo — tudo persistido localmente.
        </p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">{editingId ? "Editar jogador" : "Novo jogador"}</CardTitle>
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
              <Button type="submit">{editingId ? "Guardar" : "Adicionar jogador"}</Button>
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
        <CardHeader>
          <CardTitle className="text-base text-white">Plantel ({state.players.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Equipa</th>
                <th className="px-4 py-3 font-medium">Pos.</th>
                <th className="px-4 py-3 font-medium">Presenças</th>
                <th className="px-4 py-3 font-medium">Topo</th>
                <th className="px-4 py-3 font-medium">Lesão</th>
                <th className="px-4 py-3 font-medium w-24">Acções</th>
              </tr>
            </thead>
            <tbody>
              {state.players.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-zinc-500">
                    Sem jogadores. Usa o formulário acima.
                  </td>
                </tr>
              ) : (
                state.players.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border/60">
                    <td className="px-4 py-3 font-medium text-zinc-200">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.team || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.position || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.attendance || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.isTopTalent ? "Sim" : "—"}</td>
                    <td className="max-w-[120px] truncate px-4 py-3 text-zinc-500" title={p.injuryStatus}>
                      {p.injuryStatus || "—"}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
