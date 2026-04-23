"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentSponsor } from "@/types/president-club";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-2 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

const empty: Omit<PresidentSponsor, "id"> = {
  company: "",
  contactPerson: "",
  contractValueEUR: 0,
  startDate: "",
  renewalDate: "",
  paymentStatus: "",
  benefits: "",
  notes: "",
  pipelineStage: "ativo",
};

export default function PresidentPatrocinadoresPage() {
  const { state, addSponsor, updateSponsor, removeSponsor } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const startEdit = (s: PresidentSponsor) => {
    setEditingId(s.id);
    const { id: _i, ...r } = s;
    setForm(r);
  };

  const reset = () => {
    setEditingId(null);
    setForm(empty);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    if (editingId) updateSponsor(editingId, form);
    else addSponsor(form);
    reset();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Patrocinadores e parceiros</h2>
        <p className="mt-1 text-sm text-zinc-500">Contratos, renovações e pipeline comercial.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">{editingId ? "Editar" : "Novo patrocinador"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Empresa *</span>
              <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Contacto</span>
              <Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Valor contrato (€)</span>
              <Input
                type="number"
                min={0}
                value={form.contractValueEUR || ""}
                onChange={(e) => setForm((f) => ({ ...f, contractValueEUR: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Início</span>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Renovação</span>
              <Input type="date" value={form.renewalDate} onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Estágio</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={form.pipelineStage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pipelineStage: e.target.value as PresidentSponsor["pipelineStage"] }))
                }
              >
                <option value="ativo">Activo</option>
                <option value="potencial">Potencial</option>
                <option value="negociação">Negociação</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Estado pagamento</span>
              <Input value={form.paymentStatus} onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Benefícios acordados</span>
              <textarea className={ta} value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Notas</span>
              <textarea className={ta} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
          <CardTitle className="text-base text-white">Lista ({state.sponsors.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Empresa</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Estágio</th>
                <th className="px-4 py-2 w-24">Acções</th>
              </tr>
            </thead>
            <tbody>
              {state.sponsors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                    Sem patrocinadores.
                  </td>
                </tr>
              ) : (
                state.sponsors.map((s) => (
                  <tr key={s.id} className="border-b border-surface-border/50">
                    <td className="px-4 py-2 font-medium text-zinc-200">{s.company}</td>
                    <td className="px-4 py-2 tabular-nums text-zinc-400">{s.contractValueEUR.toFixed(0)} €</td>
                    <td className="px-4 py-2 text-zinc-500">{s.pipelineStage}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => { removeSponsor(s.id); if (editingId === s.id) reset(); }}>
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
