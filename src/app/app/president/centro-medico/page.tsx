"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentInjury } from "@/types/president-club";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

const empty: Omit<PresidentInjury, "id"> = {
  playerName: "",
  injuryType: "",
  expectedReturn: "",
  recoveryProgress: "",
  medicalNotes: "",
  availabilityPct: 0,
};

export default function PresidentCentroMedicoPage() {
  const { state, addInjury, updateInjury, removeInjury } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const startEdit = (i: PresidentInjury) => {
    setEditingId(i.id);
    const { id: _x, ...r } = i;
    setForm(r);
  };

  const reset = () => {
    setEditingId(null);
    setForm(empty);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.playerName.trim()) return;
    if (editingId) updateInjury(editingId, form);
    else addInjury(form);
    reset();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Centro médico</h2>
        <p className="mt-1 text-sm text-zinc-500">Lesões, retorno previsto e disponibilidade estimada.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">{editingId ? "Editar registo" : "Novo registo"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Jogador *</span>
              <Input value={form.playerName} onChange={(e) => setForm((f) => ({ ...f, playerName: e.target.value }))} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Tipo de lesão</span>
              <Input value={form.injuryType} onChange={(e) => setForm((f) => ({ ...f, injuryType: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Retorno previsto</span>
              <Input type="date" value={form.expectedReturn} onChange={(e) => setForm((f) => ({ ...f, expectedReturn: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Disponibilidade %</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.availabilityPct}
                onChange={(e) => setForm((f) => ({ ...f, availabilityPct: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Progresso recuperação</span>
              <textarea className={ta} value={form.recoveryProgress} onChange={(e) => setForm((f) => ({ ...f, recoveryProgress: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Notas clínicas</span>
              <textarea className={ta} value={form.medicalNotes} onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))} />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editingId ? "Guardar" : "Adicionar"}</Button>
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
          <CardTitle className="text-base text-white">Casos ({state.injuries.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Jogador</th>
                <th className="px-4 py-2">Lesão</th>
                <th className="px-4 py-2">Retorno</th>
                <th className="px-4 py-2">Disp.</th>
                <th className="px-4 py-2 w-24">Acções</th>
              </tr>
            </thead>
            <tbody>
              {state.injuries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    Sem casos.
                  </td>
                </tr>
              ) : (
                state.injuries.map((i) => (
                  <tr key={i.id} className="border-b border-surface-border/50">
                    <td className="px-4 py-2 font-medium text-zinc-200">{i.playerName}</td>
                    <td className="px-4 py-2 text-zinc-400">{i.injuryType || "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">{i.expectedReturn || "—"}</td>
                    <td className="px-4 py-2 tabular-nums text-zinc-400">{i.availabilityPct}%</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(i)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => { removeInjury(i.id); if (editingId === i.id) reset(); }}>
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
