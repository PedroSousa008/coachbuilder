"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentDisciplineIncident } from "@/types/president-club";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[80px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

export default function PresidentDisciplinaPage() {
  const { state, addDisciplineIncident, removeDisciplineIncident } = usePresidentClub();
  const [subjectType, setSubjectType] = useState<PresidentDisciplineIncident["subjectType"]>("jogador");
  const [subjectName, setSubjectName] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [details, setDetails] = useState("");
  const [fineEUR, setFineEUR] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !details.trim()) return;
    const fine = Number(fineEUR.replace(",", "."));
    addDisciplineIncident({
      subjectType,
      subjectName: subjectName.trim(),
      category: category.trim(),
      date,
      details: details.trim(),
      fineEUR: Number.isFinite(fine) && fine >= 0 ? fine : 0,
    });
    setSubjectName("");
    setCategory("");
    setDetails("");
    setFineEUR("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Disciplina</h2>
        <p className="mt-1 text-sm text-zinc-500">Incidentes, multas e registo disciplinar interno.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo incidente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Sujeito</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as PresidentDisciplineIncident["subjectType"])}
              >
                <option value="jogador">Jogador</option>
                <option value="treinador">Treinador</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Nome *</span>
              <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Categoria</span>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cartão, falta grave…" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Data</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Multa (€)</span>
              <Input value={fineEUR} onChange={(e) => setFineEUR(e.target.value)} inputMode="decimal" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Detalhes *</span>
              <textarea className={ta} value={details} onChange={(e) => setDetails(e.target.value)} required />
            </label>
            <Button type="submit">Registar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.disciplineIncidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Sem incidentes.</p>
          ) : (
            state.disciplineIncidents.map((d) => (
              <div key={d.id} className="flex gap-3 rounded-xl border border-surface-border bg-surface-raised/40 p-4">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-zinc-200">
                    {d.subjectName}{" "}
                    <span className="text-zinc-500">({d.subjectType})</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {d.date} {d.category ? `· ${d.category}` : ""}
                    {d.fineEUR > 0 ? ` · multa ${d.fineEUR.toFixed(2)} €` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-400">{d.details}</p>
                </div>
                <Button type="button" variant="ghost" className="h-9 shrink-0 text-red-400" onClick={() => removeDisciplineIncident(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
