"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-2 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

export default function PresidentDocumentosPage() {
  const { state, addDocument, removeDocument } = usePresidentClub();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addDocument({
      name: name.trim(),
      category: category.trim(),
      expiryDate: expiryDate.trim(),
      notes: notes.trim(),
    });
    setName("");
    setCategory("");
    setExpiryDate("");
    setNotes("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Documentos</h2>
        <p className="mt-1 text-sm text-zinc-500">Seguros, certificados, contratos — com validade para alertas no painel.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Nome *</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Categoria</span>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Validade</span>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Notas</span>
              <textarea className={ta} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Lista ({state.documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Validade</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {state.documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                    Sem documentos.
                  </td>
                </tr>
              ) : (
                state.documents.map((d) => (
                  <tr key={d.id} className="border-b border-surface-border/50">
                    <td className="px-4 py-2 font-medium text-zinc-200">{d.name}</td>
                    <td className="px-4 py-2 text-zinc-400">{d.category || "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">{d.expiryDate || "—"}</td>
                    <td className="px-4 py-2">
                      <Button type="button" variant="ghost" className="h-8 text-red-400" onClick={() => removeDocument(d.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
