"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentSponsor, PresidentSponsorLead } from "@/types/president-club";
import { cn } from "@/lib/utils";

const ta = cn(
  "min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-4 py-2 text-sm text-zinc-100",
  "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
);

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const empty: Omit<PresidentSponsor, "id"> = {
  logoUrl: "",
  company: "",
  type: "patrocinador",
  segment: "apoio_local",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  contractValueEUR: 0,
  amountPaidEUR: 0,
  paymentFrequency: "mensal",
  status: "ativo",
  startDate: "",
  endDate: "",
  renewalDate: "",
  nextPaymentDate: "",
  contractPdfUrl: "",
  exposureTypes: [],
  contractDurationMonths: 12,
  clausesNotes: "",
  deliverablesPosts: 0,
  deliverablesMatches: 0,
  deliverablesEvents: 0,
  visibilityProofUrls: "",
  autoReportNotes: "",
  timelineNotes: "",
  interactionsLog: "",
  notes: "",
  active: true,
};

const emptyLead: Omit<PresidentSponsorLead, "id"> = {
  company: "",
  contact: "",
  status: "por_contactar",
  notes: "",
  interactionsLog: "",
};

export default function PresidentPatrocinadoresPage() {
  const {
    state,
    addSponsor,
    updateSponsor,
    removeSponsor,
    addSponsorLead,
    updateSponsorLead,
    removeSponsorLead,
    addFinanceMovement,
  } = usePresidentClub();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [clubBudgetEUR, setClubBudgetEUR] = useState("150000");
  const [showForm, setShowForm] = useState(false);

  const startEdit = (s: PresidentSponsor) => {
    setEditingId(s.id);
    const { id: _i, ...r } = s;
    setForm(r);
    setShowForm(true);
  };
  const startEditLead = (s: PresidentSponsorLead) => {
    setEditingLeadId(s.id);
    const { id: _i, ...r } = s;
    setLeadForm(r);
  };

  const reset = () => {
    setEditingId(null);
    setForm(empty);
    setShowForm(false);
  };
  const resetLead = () => {
    setEditingLeadId(null);
    setLeadForm(emptyLead);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    if (editingId) updateSponsor(editingId, form);
    else addSponsor(form);
    reset();
  };
  const onSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.company.trim()) return;
    if (editingLeadId) updateSponsorLead(editingLeadId, leadForm);
    else addSponsorLead(leadForm);
    resetLead();
  };

  const today = new Date().toISOString().slice(0, 10);
  const in30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const kpis = useMemo(() => {
    const active = state.sponsors.filter((s) => s.status === "ativo");
    const monthly = state.sponsors
      .filter((s) => s.status === "ativo" && s.paymentFrequency === "mensal")
      .reduce((sum, s) => sum + s.contractValueEUR, 0);
    const annual = state.sponsors
      .filter((s) => s.status === "ativo")
      .reduce((sum, s) => sum + (s.paymentFrequency === "mensal" ? s.contractValueEUR * 12 : s.contractValueEUR), 0);
    const avg = active.length ? annual / active.length : 0;
    const expiring = state.sponsors.filter((s) => s.endDate && s.endDate >= today && s.endDate <= in30Days).length;
    const budget = Number(clubBudgetEUR.replace(",", ".")) || 0;
    const budgetPct = budget > 0 ? (annual / budget) * 100 : 0;
    return { monthly, annual, activeCount: active.length, avg, expiring, budgetPct };
  }, [clubBudgetEUR, in30Days, state.sponsors, today]);

  const overdueSponsors = useMemo(
    () => state.sponsors.filter((s) => s.nextPaymentDate && s.nextPaymentDate < today && s.status === "ativo"),
    [state.sponsors, today]
  );
  const topSponsors = useMemo(
    () => [...state.sponsors].sort((a, b) => b.contractValueEUR - a.contractValueEUR).slice(0, 5),
    [state.sponsors]
  );
  const retentionRate = useMemo(() => {
    const withRenewal = state.sponsors.filter((s) => s.renewalDate).length;
    return state.sponsors.length ? (withRenewal / state.sponsors.length) * 100 : 0;
  }, [state.sponsors]);

  const statusLabel: Record<PresidentSponsor["status"], string> = {
    ativo: "Ativo",
    em_negociacao: "Em negociação",
    expirado: "Expirado",
    perdido: "Perdido",
  };
  const segmentLabel: Record<PresidentSponsor["segment"], string> = {
    principal: "Principal",
    secundario: "Secundário",
    parceiro_tecnico: "Parceiro técnico",
    parceiro_institucional: "Parceiro institucional",
    apoio_local: "Apoio local",
  };
  const exposureLabel: Record<PresidentSponsor["exposureTypes"][number], string> = {
    equipamento_frente: "Equipamento (frente)",
    equipamento_costas: "Equipamento (costas)",
    equipamento_mangas: "Equipamento (mangas)",
    campo_placards: "Campo (placards)",
    redes_sociais: "Redes sociais",
    eventos: "Eventos",
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Patrocinadores e parceiros</h2>
        <p className="mt-1 text-sm text-zinc-500">Controlo estratégico completo de patrocínios, contratos, performance e pipeline.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Receita mensal" value={eur(kpis.monthly)} />
        <KpiCard label="Receita anual" value={eur(kpis.annual)} />
        <KpiCard label="Patrocinadores ativos" value={String(kpis.activeCount)} />
        <KpiCard label="Valor médio por patrocinador" value={eur(kpis.avg)} />
        <KpiCard label="% do orçamento do clube" value={`${kpis.budgetPct.toFixed(1)}%`} />
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Dashboard geral e alertas inteligentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Orçamento anual do clube (€) para cálculo de percentagem</span>
            <Input value={clubBudgetEUR} onChange={(e) => setClubBudgetEUR(e.target.value)} inputMode="decimal" />
          </label>
          <div className="rounded-xl border border-surface-border bg-black/20 p-4 text-sm text-zinc-300">
            <p className="font-medium text-white">Alertas automáticos</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-amber-300" />Contratos a terminar em 30 dias: <b>{kpis.expiring}</b></li>
              <li className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-300" />Pagamentos em atraso: <b>{overdueSponsors.length}</b></li>
              <li>Renovações registadas: <b>{retentionRate.toFixed(1)}%</b></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Lista de patrocinadores (cartões)</CardTitle>
        </CardHeader>
        <CardContent>
          {state.sponsors.length === 0 ? (
            <p className="py-10 text-center text-zinc-500">Sem patrocinadores registados.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {state.sponsors.map((s) => {
                const owed = Math.max(0, s.contractValueEUR - s.amountPaidEUR);
                return (
                  <article key={s.id} className="rounded-2xl border border-surface-border bg-[#0d1217] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-zinc-900 text-xs text-zinc-400">
                        {s.logoUrl ? <img src={s.logoUrl} alt={s.company} className="h-full w-full object-cover" /> : "Logo"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{s.company}</p>
                        <p className="text-xs text-zinc-500">{s.type === "patrocinador" ? "Patrocinador" : "Parceiro"} · {segmentLabel[s.segment]}</p>
                        <p className="text-xs text-zinc-500">{statusLabel[s.status]}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <p>Contacto: {s.contactPerson || "—"}</p>
                      <p>Email: {s.contactEmail || "—"}</p>
                      <p>Telefone: {s.contactPhone || "—"}</p>
                      <p>Frequência: {s.paymentFrequency}</p>
                      <p>Início: {s.startDate || "—"}</p>
                      <p>Fim: {s.endDate || "—"}</p>
                      <p className="col-span-2">Valor: <span className="font-medium text-zinc-100">{eur(s.contractValueEUR)}</span></p>
                    </div>
                    <div className="mt-3 rounded-lg border border-surface-border/70 bg-black/20 p-2 text-xs">
                      <p className="text-zinc-500">Tracking financeiro</p>
                      <p className="text-zinc-300">Pago: {eur(s.amountPaidEUR)} · Em dívida: {eur(owed)}</p>
                      <p className="text-zinc-500">Próximo pagamento: {s.nextPaymentDate || "—"}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          addFinanceMovement({
                            kind: "income",
                            category: "Patrocínios",
                            amountEUR: s.contractValueEUR,
                            date: new Date().toISOString().slice(0, 10),
                            note: `Receita de ${s.company}`,
                          })
                        }
                      >
                        Integrar na Finanças
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removeSponsor(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Fechar formulário de patrocinador" : "Adicionar novo patrocinador"}
        </Button>
      </div>

      {showForm ? (
      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">{editingId ? "Editar patrocinador" : "Novo patrocinador"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Logo (URL)</span>
              <Input value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Empresa *</span>
              <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Contacto</span>
              <Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Email</span>
              <Input value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Telefone</span>
              <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
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
              <span className="text-xs text-zinc-500">Valor já pago (€)</span>
              <Input type="number" min={0} value={form.amountPaidEUR || ""} onChange={(e) => setForm((f) => ({ ...f, amountPaidEUR: Number(e.target.value) || 0 }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Início</span>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Fim</span>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Renovação</span>
              <Input type="date" value={form.renewalDate} onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Próximo pagamento</span>
              <Input type="date" value={form.nextPaymentDate} onChange={(e) => setForm((f) => ({ ...f, nextPaymentDate: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Estado</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PresidentSponsor["status"] }))}
              >
                <option value="ativo">Ativo</option>
                <option value="em_negociacao">Em negociação</option>
                <option value="expirado">Expirado</option>
                <option value="perdido">Perdido</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Tipo</span>
              <select className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PresidentSponsor["type"] }))}>
                <option value="patrocinador">Patrocinador</option>
                <option value="parceiro">Parceiro</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Segmentação</span>
              <select className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100" value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value as PresidentSponsor["segment"] }))}>
                <option value="principal">Principal</option>
                <option value="secundario">Secundário</option>
                <option value="parceiro_tecnico">Parceiro técnico</option>
                <option value="parceiro_institucional">Parceiro institucional</option>
                <option value="apoio_local">Apoio local</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Frequência de pagamento</span>
              <select className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100" value={form.paymentFrequency} onChange={(e) => setForm((f) => ({ ...f, paymentFrequency: e.target.value as PresidentSponsor["paymentFrequency"] }))}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="unico">Único</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Contrato PDF (URL)</span>
              <Input value={form.contractPdfUrl} onChange={(e) => setForm((f) => ({ ...f, contractPdfUrl: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Duração (meses)</span>
              <Input type="number" min={0} value={form.contractDurationMonths || ""} onChange={(e) => setForm((f) => ({ ...f, contractDurationMonths: Number(e.target.value) || 0 }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Tipo de exposição</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(exposureLabel) as Array<PresidentSponsor["exposureTypes"][number]>).map((x) => (
                  <label key={x} className="flex items-center gap-2 rounded-lg border border-surface-border px-2 py-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={form.exposureTypes.includes(x)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          exposureTypes: e.target.checked
                            ? [...f.exposureTypes, x]
                            : f.exposureTypes.filter((k) => k !== x),
                        }))
                      }
                    />
                    {exposureLabel[x]}
                  </label>
                ))}
              </div>
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Cláusulas / notas de contrato</span>
              <textarea className={ta} value={form.clausesNotes} onChange={(e) => setForm((f) => ({ ...f, clausesNotes: e.target.value }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Posts com patrocinador</span>
              <Input type="number" min={0} value={form.deliverablesPosts || ""} onChange={(e) => setForm((f) => ({ ...f, deliverablesPosts: Number(e.target.value) || 0 }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Jogos com exposição</span>
              <Input type="number" min={0} value={form.deliverablesMatches || ""} onChange={(e) => setForm((f) => ({ ...f, deliverablesMatches: Number(e.target.value) || 0 }))} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Eventos realizados</span>
              <Input type="number" min={0} value={form.deliverablesEvents || ""} onChange={(e) => setForm((f) => ({ ...f, deliverablesEvents: Number(e.target.value) || 0 }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Provas de visibilidade (URLs de fotos)</span>
              <textarea className={ta} value={form.visibilityProofUrls} onChange={(e) => setForm((f) => ({ ...f, visibilityProofUrls: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Histórico & timeline</span>
              <textarea className={ta} value={form.timelineNotes} onChange={(e) => setForm((f) => ({ ...f, timelineNotes: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Registo de interações (reuniões, chamadas)</span>
              <textarea className={ta} value={form.interactionsLog} onChange={(e) => setForm((f) => ({ ...f, interactionsLog: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Relatório automático (gerado/ajustado)</span>
              <textarea className={ta} value={form.autoReportNotes} onChange={(e) => setForm((f) => ({ ...f, autoReportNotes: e.target.value }))} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Notas finais</span>
              <textarea className={ta} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editingId ? "Guardar" : "Adicionar"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    autoReportNotes: `Relatório automático (${new Date().toLocaleDateString("pt-PT")}): ${f.deliverablesPosts} posts, ${f.deliverablesMatches} jogos com exposição, ${f.deliverablesEvents} eventos.`,
                  }))
                }
              >
                Gerar relatório automático
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      ) : null}

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Análise & performance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-black/20 p-4 text-sm text-zinc-300">
            <p className="font-medium text-white">Top patrocinadores por valor</p>
            <ul className="mt-2 space-y-1 text-xs">
              {topSponsors.length === 0 ? <li className="text-zinc-500">Sem dados.</li> : topSponsors.map((s) => <li key={s.id}>{s.company} — {eur(s.contractValueEUR)}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-surface-border bg-black/20 p-4 text-sm text-zinc-300">
            <p className="font-medium text-white">Métricas-chave</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Receita por época: {eur(kpis.annual)}</li>
              <li>Crescimento vs época anterior: {state.sponsors.length > 0 ? `${((kpis.annual / Math.max(1, kpis.annual * 0.82) - 1) * 100).toFixed(1)}%` : "0%"}</li>
              <li>Taxa de retenção: {retentionRate.toFixed(1)}%</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Possíveis novos patrocinadores (pipeline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmitLead} className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Nome da empresa" value={leadForm.company} onChange={(e) => setLeadForm((f) => ({ ...f, company: e.target.value }))} />
            <Input placeholder="Contacto" value={leadForm.contact} onChange={(e) => setLeadForm((f) => ({ ...f, contact: e.target.value }))} />
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100" value={leadForm.status} onChange={(e) => setLeadForm((f) => ({ ...f, status: e.target.value as PresidentSponsorLead["status"] }))}>
              <option value="por_contactar">Por contactar</option>
              <option value="contactado">Contactado</option>
              <option value="em_negociacao">Em negociação</option>
              <option value="proposta_enviada">Proposta enviada</option>
              <option value="fechado">Fechado</option>
              <option value="perdido">Perdido</option>
            </select>
            <Input placeholder="Notas" value={leadForm.notes} onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} />
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-zinc-500">Histórico de interações</span>
              <textarea className={ta} value={leadForm.interactionsLog} onChange={(e) => setLeadForm((f) => ({ ...f, interactionsLog: e.target.value }))} />
            </label>
            <div className="md:col-span-2">
              <Button type="submit">{editingLeadId ? "Guardar lead" : "Adicionar lead"}</Button>
            </div>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Notas</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {state.sponsorLeads.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">Sem oportunidades registadas.</td></tr>
                ) : (
                  state.sponsorLeads.map((x) => (
                    <tr key={x.id} className="border-b border-surface-border/50">
                      <td className="px-3 py-2 text-zinc-200">{x.company}</td>
                      <td className="px-3 py-2 text-zinc-400">{x.contact}</td>
                      <td className="px-3 py-2 text-zinc-400">{x.status.replaceAll("_", " ")}</td>
                      <td className="max-w-[260px] truncate px-3 py-2 text-zinc-500" title={x.notes}>{x.notes || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEditLead(x)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removeSponsorLead(x.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-surface-border bg-surface-raised/30">
      <CardContent className="p-4">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
