"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";

export default function PresidentOperacoesPage() {
  const { state, addOperationEvent, removeOperationEvent } = usePresidentClub();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [resource, setResource] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addOperationEvent({
      title: title.trim(),
      category: category.trim(),
      start: start.trim(),
      end: end.trim(),
      location: location.trim(),
      resource: resource.trim(),
    });
    setTitle("");
    setCategory("");
    setStart("");
    setEnd("");
    setLocation("");
    setResource("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Operações</h2>
        <p className="mt-1 text-sm text-zinc-500">Eventos, recursos e logística (campos de data em texto ou ISO).</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Título *</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Categoria</span>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Jogo, transporte…" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Recurso</span>
              <Input value={resource} onChange={(e) => setResource(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Início (data/hora)</span>
              <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2026-04-23T10:00" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Fim</span>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Local</span>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Agenda ({state.operationsEvents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.operationsEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Sem eventos.</p>
          ) : (
            state.operationsEvents.map((ev) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised/40 px-4 py-3">
                <div className="text-sm">
                  <p className="font-medium text-zinc-200">{ev.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {[ev.category, ev.start, ev.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button type="button" variant="ghost" className="h-9 text-red-400" onClick={() => removeOperationEvent(ev.id)}>
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
