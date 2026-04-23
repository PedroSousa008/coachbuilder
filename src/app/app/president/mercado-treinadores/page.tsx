"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-3 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

export default function PresidentMercadoTreinadoresPage() {
  const { state, addMarketContact, removeMarketContact } = usePresidentClub();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [trophies, setTrophies] = useState("");
  const [preferredRole, setPreferredRole] = useState("");
  const [availability, setAvailability] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMarketContact({
      name: name.trim(),
      bio: bio.trim(),
      experience: experience.trim(),
      trophies: trophies.trim(),
      preferredRole: preferredRole.trim(),
      availability: availability.trim(),
    });
    setName("");
    setBio("");
    setExperience("");
    setTrophies("");
    setPreferredRole("");
    setAvailability("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Mercado de treinadores</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Guarda perfis de candidatos ou contactos do mercado (shortlist interna).
        </p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Adicionar contacto / candidato</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Nome *</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Bio</span>
              <textarea className={ta} value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Experiência</span>
              <textarea className={ta} value={experience} onChange={(e) => setExperience(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Troféus</span>
              <Input value={trophies} onChange={(e) => setTrophies(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Função preferida</span>
              <Input value={preferredRole} onChange={(e) => setPreferredRole(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Disponibilidade</span>
              <Input value={availability} onChange={(e) => setAvailability(e.target.value)} />
            </label>
            <Button type="submit">Guardar na shortlist</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Shortlist ({state.marketContacts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.marketContacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Sem contactos guardados.</p>
          ) : (
            state.marketContacts.map((m) => (
              <div key={m.id} className="flex gap-3 rounded-xl border border-surface-border bg-surface-raised/40 p-4">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-white">{m.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Guardado {new Date(m.savedAt).toLocaleString("pt-PT")}
                    {m.preferredRole ? ` · ${m.preferredRole}` : ""}
                  </p>
                  {m.bio ? <p className="mt-2 text-zinc-400">{m.bio}</p> : null}
                  {m.experience ? <p className="mt-2 whitespace-pre-wrap text-zinc-500">{m.experience}</p> : null}
                </div>
                <Button type="button" variant="ghost" className="h-9 shrink-0 text-red-400" onClick={() => removeMarketContact(m.id)}>
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
