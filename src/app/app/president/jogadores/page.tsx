"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Trash2, RefreshCw, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentPlayer } from "@/types/president-club";
import { cn } from "@/lib/utils";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { patchLinkedCoachWorkspace } from "@/lib/president-linked-workspace-client";
import { parseLinkedPlayerRowId } from "@/lib/president-linked-ids";

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

function isLinkedPlayerRow(id: string): boolean {
  return parseLinkedPlayerRowId(id) != null;
}

type LinkedCloudPlayerForm = {
  name: string;
  age: string;
  team: string;
  position: string;
  injuryKey: "" | "doubt" | "out";
  isTopTalent: boolean;
};

const emptyLinkedPlayerForm: LinkedCloudPlayerForm = {
  name: "",
  age: "",
  team: "",
  position: "",
  injuryKey: "",
  isTopTalent: false,
};

export default function PresidentJogadoresPage() {
  const { user } = useAuth();
  const { state, addPlayer, updatePlayer, removePlayer } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [linkedPlayerEdit, setLinkedPlayerEdit] = useState<PresidentPlayer | null>(null);
  const [linkedPlayerForm, setLinkedPlayerForm] = useState<LinkedCloudPlayerForm>(emptyLinkedPlayerForm);
  const [linkedSaving, setLinkedSaving] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  const cloudApis = shouldUseCloudClientApis(user);

  const mergedPlayers = useMemo(() => [...roster.players, ...state.players], [roster.players, state.players]);

  const startEdit = (p: PresidentPlayer) => {
    if (isLinkedPlayerRow(p.id)) return;
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

  const injuryKeyFromLabel = (label: string): LinkedCloudPlayerForm["injuryKey"] => {
    if (label === "Dúvida") return "doubt";
    if (label === "Indisponível") return "out";
    return "";
  };

  const injuryLabelFromKey = (k: LinkedCloudPlayerForm["injuryKey"]): string => {
    if (k === "doubt") return "Dúvida";
    if (k === "out") return "Indisponível";
    return "";
  };

  const startLinkedPlayerEdit = (p: PresidentPlayer) => {
    const ids = parseLinkedPlayerRowId(p.id);
    if (!ids || !cloudApis) return;
    setLinkedError(null);
    setLinkedPlayerEdit(p);
    setLinkedPlayerForm({
      name: p.name,
      age: p.age,
      team: p.team,
      position: p.position,
      injuryKey: injuryKeyFromLabel(p.injuryStatus),
      isTopTalent: p.isTopTalent,
    });
  };

  const closeLinkedPlayerEdit = () => {
    if (linkedSaving) return;
    setLinkedPlayerEdit(null);
    setLinkedPlayerForm(emptyLinkedPlayerForm);
    setLinkedError(null);
  };

  const saveLinkedPlayerEdit = async () => {
    const p = linkedPlayerEdit;
    const ids = p ? parseLinkedPlayerRowId(p.id) : null;
    if (!p || !ids || !linkedPlayerForm.name.trim()) return;
    setLinkedSaving(true);
    setLinkedError(null);
    const res = await patchLinkedCoachWorkspace({
      coachUserId: ids.coachUserId,
      playerId: ids.playerId,
      playerPatch: {
        name: linkedPlayerForm.name.trim(),
        age: linkedPlayerForm.age,
        team: linkedPlayerForm.team,
        position: linkedPlayerForm.position,
        injuryStatus: injuryLabelFromKey(linkedPlayerForm.injuryKey),
        isTopTalent: linkedPlayerForm.isTopTalent,
      },
    });
    setLinkedSaving(false);
    if (!res.ok) {
      setLinkedError(res.error ?? "Erro ao guardar.");
      return;
    }
    await roster.refresh();
    closeLinkedPlayerEdit();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Jogadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Nome, idade, clube, posição e disponibilidade vêm do plantel de cada treinador com conta ligada. Podes
            editá-los aqui: os dados guardam-se no workspace do treinador e reflectem-se no login dele. Campos extra
            só do clube continuam nos registos manuais.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 self-start" onClick={() => void roster.refresh()} disabled={roster.loading}>
          <RefreshCw className={cn("h-4 w-4", roster.loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardContent className="py-4 text-sm text-zinc-400">
          <p>
            Os treinadores ligam em{" "}
            <Link href="/app/settings" className="text-accent underline-offset-2 hover:underline">
              Definições
            </Link>{" "}
            com o teu email de presidente. Depois carrega em Actualizar para ver o plantel agregado.
          </p>
          {roster.error ? <p className="mt-2 text-red-400/90">{roster.error}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">Plantel de jogadores ({mergedPlayers.length})</CardTitle>
          {roster.source === "cloud" ? (
            <Badge variant="muted">Cloud · contas ligadas</Badge>
          ) : roster.source === "self" ? (
            <Badge variant="muted">Desta sessão</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Idade</th>
                <th className="px-4 py-3 font-medium">Equipa</th>
                <th className="px-4 py-3 font-medium">Pos.</th>
                <th className="px-4 py-3 font-medium">Presenças</th>
                <th className="px-4 py-3 font-medium">Topo</th>
                <th className="px-4 py-3 font-medium">Lesão</th>
                <th className="px-4 py-3 font-medium w-24">Acções</th>
              </tr>
            </thead>
            <tbody>
              {mergedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-zinc-500">
                    Sem jogadores sincronizados. Liga contas de treinadores ou adiciona registos manuais abaixo.
                  </td>
                </tr>
              ) : (
                mergedPlayers.map((p) => {
                  const linked = isLinkedPlayerRow(p.id);
                  return (
                    <tr key={p.id} className="border-b border-surface-border/60">
                      <td className="px-4 py-3">
                        {linked ? (
                          <Badge variant="muted" className="whitespace-nowrap">
                            Treinador
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-zinc-800/80 text-zinc-400">
                            Local
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500" title={p.coachEmail ?? ""}>
                        {linked ? p.coachEmail ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-200">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.age || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.team || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.position || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.attendance || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {p.isTopTalent ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                            aria-label="Jogador de topo"
                            title="Jogador de topo"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-zinc-500" title={p.injuryStatus}>
                        {p.injuryStatus || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {linked ? (
                          cloudApis ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => startLinkedPlayerEdit(p)}
                              aria-label="Editar no plantel do treinador"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-500">Cloud</span>
                          )
                        ) : (
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
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">
            {editingId ? "Editar registo manual" : "Registo manual (opcional)"}
          </CardTitle>
          <p className="text-xs text-zinc-500">Anotações internas ou jogadores fora do CoachBuilder.</p>
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
              <Button type="submit">{editingId ? "Guardar" : "Adicionar registo manual"}</Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {linkedPlayerEdit ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onClick={() => closeLinkedPlayerEdit()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="linked-player-edit-title"
            className="max-h-[min(90dvh,880px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-surface-border bg-[#0c1014] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="linked-player-edit-title" className="font-display text-lg font-semibold text-white">
              Editar jogador (plantel do treinador)
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {linkedPlayerEdit.coachEmail ?? "Treinador"} — estes campos sincronizam com o plantel na conta do
              treinador.
            </p>
            {linkedError ? <p className="mt-3 text-sm text-red-400/90">{linkedError}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Nome *</span>
                <Input
                  value={linkedPlayerForm.name}
                  onChange={(e) => setLinkedPlayerForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Idade</span>
                <Input
                  value={linkedPlayerForm.age}
                  onChange={(e) => setLinkedPlayerForm((f) => ({ ...f, age: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Disponibilidade</span>
                <select
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                  value={linkedPlayerForm.injuryKey}
                  onChange={(e) =>
                    setLinkedPlayerForm((f) => ({
                      ...f,
                      injuryKey: e.target.value as LinkedCloudPlayerForm["injuryKey"],
                    }))
                  }
                >
                  <option value="">Disponível</option>
                  <option value="doubt">Dúvida</option>
                  <option value="out">Indisponível</option>
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Clube (campo do treinador)</span>
                <Input
                  value={linkedPlayerForm.team}
                  onChange={(e) => setLinkedPlayerForm((f) => ({ ...f, team: e.target.value }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Posições (ex. CB, ST)</span>
                <Input
                  value={linkedPlayerForm.position}
                  onChange={(e) => setLinkedPlayerForm((f) => ({ ...f, position: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-surface-border"
                  checked={linkedPlayerForm.isTopTalent}
                  onChange={(e) => setLinkedPlayerForm((f) => ({ ...f, isTopTalent: e.target.checked }))}
                />
                <span className="text-sm text-zinc-300">Talento de topo (marca desempenho em alta no plantel)</span>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveLinkedPlayerEdit()} disabled={linkedSaving}>
                {linkedSaving ? "A guardar…" : "Guardar no plantel do treinador"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => closeLinkedPlayerEdit()} disabled={linkedSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
