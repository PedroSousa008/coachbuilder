"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[120px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

export default function PresidentComunicacaoPage() {
  const { state, addCommunicationDraft, removeCommunicationDraft } = usePresidentClub();
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [body, setBody] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    addCommunicationDraft({
      title: title.trim(),
      audience: audience.trim(),
      body: body.trim(),
    });
    setTitle("");
    setAudience("");
    setBody("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Comunicação</h2>
        <p className="mt-1 text-sm text-zinc-500">Rascunhos de comunicados para sócios, pais ou equipas.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo rascunho</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Título *</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Destinatários</span>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Pais do Sub-15…" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Mensagem *</span>
              <textarea className={ta} value={body} onChange={(e) => setBody(e.target.value)} required />
            </label>
            <Button type="submit">Guardar rascunho</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Rascunhos ({state.communicationDrafts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.communicationDrafts.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Sem rascunhos.</p>
          ) : (
            state.communicationDrafts.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-xl border border-surface-border bg-surface-raised/40 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{c.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(c.createdAt).toLocaleString("pt-PT")}
                    {c.audience ? ` · ${c.audience}` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{c.body}</p>
                </div>
                <Button type="button" variant="ghost" className="h-9 shrink-0 text-red-400" onClick={() => removeCommunicationDraft(c.id)}>
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
