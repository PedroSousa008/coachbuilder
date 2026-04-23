"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[160px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

export default function PresidentRelatoriosPage() {
  const { state, addReport, removeReport } = usePresidentClub();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    addReport({ title: title.trim(), body: body.trim() });
    setTitle("");
    setBody("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Relatórios</h2>
        <p className="mt-1 text-sm text-zinc-500">Notas executivas e relatórios internos (texto livre).</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Título *</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Conteúdo *</span>
              <textarea className={ta} value={body} onChange={(e) => setBody(e.target.value)} required />
            </label>
            <Button type="submit">Guardar relatório</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Arquivo ({state.reports.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.reports.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Sem relatórios.</p>
          ) : (
            state.reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-surface-border bg-surface-raised/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-white">{r.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("pt-PT")}</p>
                  </div>
                  <Button type="button" variant="ghost" className="h-9 text-red-400" onClick={() => removeReport(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{r.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
