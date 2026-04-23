"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentCoach } from "@/types/president-club";
import { cn } from "@/lib/utils";

const textareaClass = cn(
  "min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "placeholder:text-zinc-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

const emptyCoachForm: Omit<PresidentCoach, "id"> = {
  name: "",
  birthDate: "",
  role: "",
  team: "",
  winPct: 0,
  sessionsCreated: 0,
  activityLevel: "Média",
  parentRating: 0,
  internalRank: 0,
  contractStatus: "",
  statsHistory: "",
  careerPath: "",
  trophies: "",
  methodology: "",
  strengths: "",
  notes: "",
};

export default function PresidentTreinadoresPage() {
  const { state, addCoach, updateCoach, removeCoach } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PresidentCoach, "id">>(emptyCoachForm);

  const startEdit = (c: PresidentCoach) => {
    setEditingId(c.id);
    const { id: _i, ...rest } = c;
    setForm(rest);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyCoachForm);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) updateCoach(editingId, form);
    else addCoach(form);
    resetForm();
  };

  const compareDisabled = state.coaches.length < 2;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Treinadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Adiciona, edita e remove entradas — os dados ficam guardados na tua conta (modo clube).
          </p>
        </div>
        {compareDisabled ? (
          <span className="inline-flex h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-surface-border bg-surface-raised/50 px-5 text-sm font-medium text-zinc-500">
            Comparar treinadores (mín. 2)
          </span>
        ) : (
          <Link
            href="/app/president/treinadores/comparar"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-5 text-sm font-medium text-zinc-100 transition-all hover:border-zinc-600 hover:bg-zinc-800/50"
          >
            Comparar treinadores
          </Link>
        )}
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">{editingId ? "Editar treinador" : "Novo treinador"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Nome *</span>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Data de nascimento</span>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Função</span>
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Equipa</span>
              <Input value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Vitórias %</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.winPct}
                onChange={(e) => setForm((f) => ({ ...f, winPct: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Sessões criadas</span>
              <Input
                type="number"
                min={0}
                value={form.sessionsCreated}
                onChange={(e) => setForm((f) => ({ ...f, sessionsCreated: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Atividade</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={form.activityLevel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    activityLevel: e.target.value as PresidentCoach["activityLevel"],
                  }))
                }
              >
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Avaliação pais (0–10)</span>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.parentRating}
                onChange={(e) => setForm((f) => ({ ...f, parentRating: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Ranking interno</span>
              <Input
                type="number"
                value={form.internalRank}
                onChange={(e) => setForm((f) => ({ ...f, internalRank: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Contrato / estado</span>
              <Input
                value={form.contractStatus}
                onChange={(e) => setForm((f) => ({ ...f, contractStatus: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Histórico de estatísticas</span>
              <textarea
                className={textareaClass}
                value={form.statsHistory}
                onChange={(e) => setForm((f) => ({ ...f, statsHistory: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Percurso / carreira</span>
              <textarea
                className={textareaClass}
                value={form.careerPath}
                onChange={(e) => setForm((f) => ({ ...f, careerPath: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Troféus</span>
              <textarea
                className={textareaClass}
                value={form.trophies}
                onChange={(e) => setForm((f) => ({ ...f, trophies: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Metodologia</span>
              <textarea
                className={textareaClass}
                value={form.methodology}
                onChange={(e) => setForm((f) => ({ ...f, methodology: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Pontos fortes</span>
              <textarea
                className={textareaClass}
                value={form.strengths}
                onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Notas internas</span>
              <textarea
                className={textareaClass}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit">{editingId ? "Guardar alterações" : "Adicionar treinador"}</Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Plantel técnico</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Nasc.</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Equipa</th>
                <th className="px-4 py-3 font-medium">Vitórias %</th>
                <th className="px-4 py-3 font-medium">Sessões</th>
                <th className="px-4 py-3 font-medium">Atividade</th>
                <th className="px-4 py-3 font-medium">Pais</th>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium w-28">Acções</th>
              </tr>
            </thead>
            <tbody>
              {state.coaches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm text-zinc-500">
                    Ainda não há treinadores. Usa o formulário acima para adicionar o primeiro.
                  </td>
                </tr>
              ) : (
                state.coaches.map((c) => (
                  <tr key={c.id} className="border-b border-surface-border/60 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-zinc-200">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.birthDate || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.role || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.team || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">{c.winPct}%</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">{c.sessionsCreated}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.activityLevel}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">{c.parentRating}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">{c.internalRank}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-zinc-500" title={c.contractStatus}>
                      {c.contractStatus || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => startEdit(c)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-400 hover:text-red-300"
                          onClick={() => {
                            removeCoach(c.id);
                            if (editingId === c.id) resetForm();
                          }}
                          aria-label="Remover"
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
