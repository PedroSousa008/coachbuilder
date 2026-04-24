"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trash2, Pencil, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentCoach } from "@/types/president-club";
import { cn } from "@/lib/utils";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { patchLinkedCoachWorkspace } from "@/lib/president-linked-workspace-client";
import { parseLinkedCoachRowId } from "@/lib/president-linked-ids";

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

function isLinkedCoachRow(c: PresidentCoach): boolean {
  return Boolean(parseLinkedCoachRowId(c.id));
}

type LinkedCloudCoachForm = {
  name: string;
  birthDate: string;
  role: string;
  team: string;
  methodology: string;
  strengths: string;
};

const emptyLinkedCloudForm: LinkedCloudCoachForm = {
  name: "",
  birthDate: "",
  role: "",
  team: "",
  methodology: "",
  strengths: "",
};

export default function PresidentTreinadoresPage() {
  const { user } = useAuth();
  const { state, addCoach, updateCoach, removeCoach } = usePresidentClub();
  const roster = usePresidentLinkedRoster();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PresidentCoach, "id">>(emptyCoachForm);
  const [linkedCloudEdit, setLinkedCloudEdit] = useState<PresidentCoach | null>(null);
  const [linkedCloudForm, setLinkedCloudForm] = useState<LinkedCloudCoachForm>(emptyLinkedCloudForm);
  const [linkedSaving, setLinkedSaving] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  const cloudApis = shouldUseCloudClientApis(user);

  const mergedCoaches = useMemo(() => [...roster.coaches, ...state.coaches], [roster.coaches, state.coaches]);

  const startEdit = (c: PresidentCoach) => {
    if (isLinkedCoachRow(c)) return;
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

  const compareDisabled = mergedCoaches.length < 2;

  const startLinkedCloudEdit = (c: PresidentCoach) => {
    const cid = parseLinkedCoachRowId(c.id) ?? c.coachUserId;
    if (!cid || !cloudApis) return;
    setLinkedError(null);
    setLinkedCloudEdit(c);
    setLinkedCloudForm({
      name: c.name,
      birthDate: c.birthDate,
      role: c.role,
      team: c.team,
      methodology: c.methodology,
      strengths: c.strengths,
    });
  };

  const closeLinkedCloudEdit = () => {
    if (linkedSaving) return;
    setLinkedCloudEdit(null);
    setLinkedCloudForm(emptyLinkedCloudForm);
    setLinkedError(null);
  };

  const saveLinkedCloudEdit = async () => {
    const c = linkedCloudEdit;
    const coachUserId = c ? parseLinkedCoachRowId(c.id) ?? c.coachUserId : null;
    if (!c || !coachUserId || !linkedCloudForm.name.trim()) return;
    setLinkedSaving(true);
    setLinkedError(null);
    const res = await patchLinkedCoachWorkspace({
      coachUserId,
      coachProfilePatch: {
        name: linkedCloudForm.name.trim(),
        birthDate: linkedCloudForm.birthDate,
        role: linkedCloudForm.role,
        team: linkedCloudForm.team,
        methodology: linkedCloudForm.methodology,
        strengths: linkedCloudForm.strengths,
      },
    });
    setLinkedSaving(false);
    if (!res.ok) {
      setLinkedError(res.error ?? "Erro ao guardar.");
      return;
    }
    await roster.refresh();
    closeLinkedCloudEdit();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Treinadores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Nome, data de nascimento, função, clube e texto de perfil vêm do workspace de cada treinador com conta
            ligada. Podes editá-los aqui: as alterações guardam-se na conta do treinador e aparecem logo no login dele.
            Vitórias % e sessões continuam a ser calculadas automaticamente. Registos manuais são só no modo
            presidente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => void roster.refresh()} disabled={roster.loading}>
            <RefreshCw className={cn("h-4 w-4", roster.loading && "animate-spin")} />
            Actualizar
          </Button>
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
      </div>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardContent className="py-4 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-200">Treinadores com conta:</strong> em{" "}
            <Link href="/app/settings" className="text-accent underline-offset-2 hover:underline">
              Definições
            </Link>
            , cada treinador usa «Ligar ao presidente do clube» e indica o <strong className="text-zinc-200">teu email de login</strong>{" "}
            (conta Presidente). Os dados sincronizam quando carregas em Actualizar ou ao reabrir esta página.
          </p>
          {roster.source === "none" && !roster.loading ? (
            <p className="mt-2 text-amber-200/80">
              Ainda sem treinadores ligados nem plantel nesta conta. Liga contas de treinadores (cloud) ou preenche o teu
              próprio plantel como treinador na mesma sessão para pré-visualizar aqui.
            </p>
          ) : null}
          {roster.error ? <p className="mt-2 text-red-400/90">{roster.error}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">Plantel técnico</CardTitle>
          {roster.source === "cloud" ? (
            <Badge variant="muted">Cloud · {roster.linkedCoachAccounts} conta(s) ligada(s)</Badge>
          ) : roster.source === "self" ? (
            <Badge variant="muted">Desta sessão / conta</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Email</th>
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
              {mergedCoaches.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center text-sm text-zinc-500">
                    Sem treinadores. Liga contas em Definições (treinadores) ou adiciona um registo manual abaixo.
                  </td>
                </tr>
              ) : (
                mergedCoaches.map((c) => {
                  const linked = isLinkedCoachRow(c);
                  return (
                    <tr key={c.id} className="border-b border-surface-border/60 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        {linked ? (
                          <Badge variant="muted" className="whitespace-nowrap">
                            Conta treinador
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-zinc-800/80 text-zinc-400">
                            Manual
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs text-zinc-500" title={c.coachEmail ?? ""}>
                        {linked ? c.coachEmail ?? "—" : "—"}
                      </td>
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
                        {linked ? (
                          cloudApis && (parseLinkedCoachRowId(c.id) ?? c.coachUserId) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => startLinkedCloudEdit(c)}
                              aria-label="Editar na conta do treinador"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-500">Cloud</span>
                          )
                        ) : (
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
          <p className="text-xs text-zinc-500">Para colaboradores sem conta CoachBuilder ou notas extra.</p>
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
              <Button type="submit">{editingId ? "Guardar alterações" : "Adicionar registo manual"}</Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {linkedCloudEdit ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onClick={() => closeLinkedCloudEdit()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="linked-coach-edit-title"
            className="max-h-[min(90dvh,900px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-border bg-[#0c1014] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="linked-coach-edit-title" className="font-display text-lg font-semibold text-white">
              Editar treinador (conta ligada)
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {linkedCloudEdit.coachEmail ?? "Conta treinador"} — os campos abaixo sincronizam com o perfil do
              treinador na app.
            </p>
            {linkedError ? <p className="mt-3 text-sm text-red-400/90">{linkedError}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Nome *</span>
                <Input
                  value={linkedCloudForm.name}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Data de nascimento</span>
                <Input
                  type="date"
                  value={linkedCloudForm.birthDate}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Função</span>
                <Input
                  value={linkedCloudForm.role}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, role: e.target.value }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Clube / equipa</span>
                <Input
                  value={linkedCloudForm.team}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, team: e.target.value }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Bio / metodologia (perfil treinador)</span>
                <textarea
                  className={textareaClass}
                  value={linkedCloudForm.methodology}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, methodology: e.target.value }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-500">Pontos fortes (profissão / destaque)</span>
                <textarea
                  className={textareaClass}
                  value={linkedCloudForm.strengths}
                  onChange={(e) => setLinkedCloudForm((f) => ({ ...f, strengths: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveLinkedCloudEdit()} disabled={linkedSaving}>
                {linkedSaving ? "A guardar…" : "Guardar na conta do treinador"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => closeLinkedCloudEdit()} disabled={linkedSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
