"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Package,
  Printer,
  Stethoscope,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PresidentBarChart } from "@/components/president/PresidentBarChart";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import {
  buildMedicalAlerts,
  countAvailablePlayers,
  highestRiskTeamLabel,
  injuriesByBodyChart,
  injuriesByTeamChart,
  isActiveInjury,
  longTermInjuriesCount,
  medicalCostsThisMonthEUR,
  monthlyInjuryTrend,
  returningThisWeekCount,
} from "@/lib/president-medical-computed";
import { cn } from "@/lib/utils";
import type {
  PresidentInjury,
  PresidentInjurySeverity,
  PresidentInjuryStatus,
  PresidentMedicalAppointment,
  PresidentMedicalInventoryItem,
  PresidentMedicalStaff,
  PresidentMedicalStaffRole,
} from "@/types/president-club";

type TabId =
  | "dashboard"
  | "injured"
  | "recovery"
  | "availability"
  | "appointments"
  | "inventory"
  | "reports";

const SEVERITY_LABEL: Record<PresidentInjurySeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
  longa_duracao: "Longa duração",
};

const STATUS_LABEL: Record<PresidentInjuryStatus, string> = {
  em_avaliacao: "Em avaliação",
  em_recuperacao: "Em recuperação",
  retorno_ao_treino: "Retorno ao treino",
  plenas_condicoes: "Plenas condições",
  cirurgia: "Cirurgia",
  repouso: "Em repouso",
};

const STAFF_ROLE_LABEL: Record<PresidentMedicalStaffRole, string> = {
  fisioterapeuta: "Fisioterapeuta",
  medico: "Médico",
  preparador_reabilitacao: "Preparador de reabilitação",
  nutricionista: "Nutricionista",
  psicologo: "Psicólogo",
};

function severityBadgeClass(s: PresidentInjurySeverity): string {
  if (s === "leve") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (s === "moderada") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  if (s === "grave") return "border-orange-500/35 bg-orange-500/10 text-orange-100";
  return "border-red-500/35 bg-red-500/10 text-red-100";
}

function statusBadgeClass(st: PresidentInjuryStatus): string {
  if (st === "plenas_condicoes") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (st === "retorno_ao_treino") return "border-sky-500/30 bg-sky-500/10 text-sky-100";
  if (st === "em_recuperacao") return "border-violet-500/30 bg-violet-500/10 text-violet-100";
  if (st === "em_avaliacao") return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
  if (st === "cirurgia") return "border-rose-500/35 bg-rose-500/10 text-rose-100";
  return "border-zinc-600/40 bg-zinc-800/60 text-zinc-300";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyManualInjury(): Omit<PresidentInjury, "id"> {
  return {
    syncedFromCoach: false,
    playerName: "",
    team: "",
    position: "",
    injuryType: "",
    bodyArea: "",
    severity: "moderada",
    startDate: todayIso(),
    expectedReturn: "",
    daysOut: 0,
    status: "em_recuperacao",
    assignedStaff: "",
    note: "",
    recoveryProgress: "",
    medicalNotes: "",
    availabilityPct: 50,
    medicalCostEUR: 0,
  };
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PresidentCentroMedicoClient() {
  const roster = usePresidentLinkedRoster();
  const {
    state,
    addInjury,
    updateInjury,
    removeInjury,
    syncMedicalFromLinkedRoster,
    addMedicalStaff,
    removeMedicalStaff,
    addMedicalAppointment,
    removeMedicalAppointment,
    addMedicalInventoryItem,
    removeMedicalInventoryItem,
  } = usePresidentClub();

  const [tab, setTab] = useState<TabId>("dashboard");
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"" | PresidentInjurySeverity>("");
  const [filterStatus, setFilterStatus] = useState<"" | PresidentInjuryStatus>("");
  const [profile, setProfile] = useState<PresidentInjury | null>(null);

  const [injForm, setInjForm] = useState<Omit<PresidentInjury, "id">>(emptyManualInjury());
  const [injEditId, setInjEditId] = useState<string | null>(null);

  const [staffForm, setStaffForm] = useState<Omit<PresidentMedicalStaff, "id">>({
    name: "",
    email: "",
    phone: "",
    role: "fisioterapeuta",
    notes: "",
  });

  const [apptForm, setApptForm] = useState<Omit<PresidentMedicalAppointment, "id">>({
    playerName: "",
    date: todayIso(),
    type: "Fisioterapia",
    professional: "",
    status: "agendado",
    notes: "",
  });

  const [invForm, setInvForm] = useState<Omit<PresidentMedicalInventoryItem, "id">>({
    item: "",
    stock: 0,
    minLevel: 0,
    supplier: "",
  });

  useEffect(() => {
    syncMedicalFromLinkedRoster(roster.players);
  }, [roster.players, syncMedicalFromLinkedRoster]);

  const ym = useMemo(() => todayIso().slice(0, 7), []);
  const activeInjuries = useMemo(() => state.injuries.filter(isActiveInjury), [state.injuries]);

  const kpis = useMemo(() => {
    const injured = activeInjuries.length;
    const available = countAvailablePlayers(roster.players);
    const returning = returningThisWeekCount(state.injuries);
    const longTerm = longTermInjuriesCount(state.injuries);
    const costs = medicalCostsThisMonthEUR(state.injuries, state.expenses, ym);
    const riskTeam = highestRiskTeamLabel(state.injuries);
    return { injured, available, returning, longTerm, costs, riskTeam };
  }, [activeInjuries.length, roster.players, state.injuries, state.expenses, ym]);

  const alerts = useMemo(
    () => buildMedicalAlerts(state.injuries, roster.players, state.medicalInventory),
    [state.injuries, roster.players, state.medicalInventory]
  );

  const filteredInjuries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.injuries.filter((i) => {
      if (q && !i.playerName.toLowerCase().includes(q)) return false;
      if (filterTeam && (i.team ?? "").trim() !== filterTeam) return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    });
  }, [state.injuries, search, filterTeam, filterSeverity, filterStatus]);

  const teamOptions = useMemo(() => {
    const s = new Set<string>();
    for (const i of state.injuries) {
      const t = (i.team ?? "").trim();
      if (t) s.add(t);
    }
    for (const p of roster.players) {
      const t = (p.team ?? "").trim();
      if (t) s.add(t);
    }
    return [...s].sort();
  }, [state.injuries, roster.players]);

  const availabilityRows = useMemo(() => {
    return roster.players.map((p) => {
      const inj = state.injuries.find((i) => i.sourcePlayerId === p.id) ?? state.injuries.find((i) => i.playerName === p.name);
      return { player: p, injury: inj };
    });
  }, [roster.players, state.injuries]);

  const onSaveInjury = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!injForm.playerName.trim()) return;
      const row = { ...injForm, syncedFromCoach: false };
      if (injEditId) updateInjury(injEditId, row);
      else addInjury(row);
      setInjForm(emptyManualInjury());
      setInjEditId(null);
    },
    [addInjury, updateInjury, injForm, injEditId]
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Painel de lesões", icon: <Activity className="h-4 w-4" /> },
    { id: "injured", label: "Jogadores lesionados", icon: <HeartPulse className="h-4 w-4" /> },
    { id: "recovery", label: "Progresso de recuperação", icon: <Stethoscope className="h-4 w-4" /> },
    { id: "availability", label: "Lista de disponibilidade", icon: <Users className="h-4 w-4" /> },
    { id: "appointments", label: "Consultas e sessões", icon: <Calendar className="h-4 w-4" /> },
    { id: "inventory", label: "Inventário de saúde", icon: <Package className="h-4 w-4" /> },
    { id: "reports", label: "Relatórios", icon: <FileText className="h-4 w-4" /> },
  ];

  const exportInjuriesCsv = () => {
    const header =
      "Nome;Equipa;Posição;Tipo;Zona corporal;Gravidade;Início;Retorno previsto;Dias;Estado;Staff;Nota;Sincronizado treinador";
    const lines = state.injuries.map((i) =>
      [
        i.playerName,
        i.team,
        i.position,
        i.injuryType,
        i.bodyArea,
        SEVERITY_LABEL[i.severity],
        i.startDate,
        i.expectedReturn,
        String(i.daysOut),
        STATUS_LABEL[i.status],
        i.assignedStaff,
        (i.note ?? "").replace(/;/g, ","),
        i.syncedFromCoach ? "sim" : "não",
      ].join(";")
    );
    downloadText(`centro-medico-lesoes-${todayIso()}.csv`, [header, ...lines].join("\n"), "text/csv;charset=utf-8");
  };

  const printReport = (title: string, body: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><title>${title}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111} h1{font-size:20px} pre{white-space:pre-wrap}</style></head><body>
      <h1>${title}</h1><p>Gerado em ${new Date().toLocaleString("pt-PT")}</p><pre>${body}</pre></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-white">Centro médico</h2>
        <p className="text-sm text-zinc-400">
          Acompanhar lesões, disponibilidade dos jogadores, evolução da recuperação e estado de saúde do clube.
        </p>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 text-xs leading-relaxed text-zinc-300">
            <p className="font-semibold text-emerald-100/90">Regras de sincronização automática</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-400">
              <li>
                Quando os treinadores marcam jogadores como lesionados ou em dúvida na equipa, esses jogadores aparecem
                automaticamente aqui — o Presidente não precisa de os adicionar manualmente (mas pode complementar).
              </li>
              <li>Se o jogador existe no CoachBuilder (plantel do treinador ligado), pode ser gerido clinicamente neste módulo.</li>
              <li>
                A equipa clínica (fisioterapeuta, médico, preparador de reabilitação, nutricionista, psicólogo) é registada
                abaixo e sincronizada com <strong className="text-zinc-200">Pagamentos</strong> como linhas de despesa na categoria Saúde.
              </li>
              <li>Quando o treinador repõe o jogador como disponível, o caso sincronizado deixa de constar como lesão activa.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {roster.lastSyncedAt ? (
        <p className="text-xs text-zinc-500">
          Última sincronização do plantel: {new Date(roster.lastSyncedAt).toLocaleString("pt-PT")}
        </p>
      ) : null}

      {alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 6).map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                a.level === "danger" && "border-red-500/30 bg-red-500/10 text-red-100",
                a.level === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-100",
                a.level === "info" && "border-sky-500/25 bg-sky-500/10 text-sky-100"
              )}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi title="Total lesionados" value={String(kpis.injured)} subtitle="Casos activos" />
        <Kpi title="Disponíveis" value={String(kpis.available)} subtitle="Plantel agregado" />
        <Kpi title="Retorno esta semana" value={String(kpis.returning)} subtitle="Previsto ≤7 dias" />
        <Kpi title="Lesões longas" value={String(kpis.longTerm)} subtitle="Graves / longo prazo" />
        <Kpi title="Custos médicos (mês)" value={`${kpis.costs.toFixed(0)} €`} subtitle="Lesões + despesas Saúde" />
        <Kpi title="Equipa em maior risco" value={kpis.riskTeam} subtitle="Mais casos activos" />
      </div>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <ClipboardList className="h-4 w-4 text-accent" />
            Equipa clínica
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Estes perfis ficam disponíveis para atribuição nas fichas de lesão e surgem em Pagamentos (despesas Saúde).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!staffForm.name.trim()) return;
              addMedicalStaff(staffForm);
              setStaffForm({ name: "", email: "", phone: "", role: "fisioterapeuta", notes: "" });
            }}
          >
            <Input placeholder="Nome" value={staffForm.name} onChange={(e) => setStaffForm((s) => ({ ...s, name: e.target.value }))} />
            <Input placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))} />
            <Input placeholder="Telefone" value={staffForm.phone} onChange={(e) => setStaffForm((s) => ({ ...s, phone: e.target.value }))} />
            <select
              className="rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100"
              value={staffForm.role}
              onChange={(e) => setStaffForm((s) => ({ ...s, role: e.target.value as PresidentMedicalStaffRole }))}
            >
              {(Object.keys(STAFF_ROLE_LABEL) as PresidentMedicalStaffRole[]).map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <Input
              className="lg:col-span-1"
              placeholder="Notas"
              value={staffForm.notes}
              onChange={(e) => setStaffForm((s) => ({ ...s, notes: e.target.value }))}
            />
            <Button type="submit" className="w-full sm:w-auto">
              Adicionar
            </Button>
          </form>
          <div className="overflow-x-auto rounded-xl border border-surface-border/60">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Função</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {state.medicalStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                      Sem equipa clínica registada.
                    </td>
                  </tr>
                ) : (
                  state.medicalStaff.map((m) => (
                    <tr key={m.id} className="border-b border-surface-border/40">
                      <td className="px-3 py-2 font-medium text-zinc-200">{m.name}</td>
                      <td className="px-3 py-2 text-zinc-400">{STAFF_ROLE_LABEL[m.role]}</td>
                      <td className="px-3 py-2 text-zinc-500">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button type="button" size="sm" variant="ghost" className="text-red-400" onClick={() => removeMedicalStaff(m.id)}>
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-accent text-white shadow-lg shadow-accent/20"
                : "bg-surface-raised/50 text-zinc-400 hover:text-white"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PresidentBarChart title="Lesões por equipa" data={injuriesByTeamChart(state.injuries)} />
          <PresidentBarChart title="Lesões por zona corporal" data={injuriesByBodyChart(state.injuries)} />
          <PresidentBarChart title="Tendência mensal (início)" subtitle="Novos registos por mês" data={monthlyInjuryTrend(state.injuries)} />
          <Card className="border-surface-border bg-surface-raised/30">
            <CardHeader>
              <CardTitle className="text-base text-white">Disponíveis vs lesionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-400">
              <div className="flex justify-between">
                <span>Disponíveis</span>
                <span className="font-semibold text-emerald-200">{kpis.available}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-accent"
                  style={{
                    width: `${roster.players.length ? Math.round((kpis.available / roster.players.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span>Lesionados / indisponíveis (activos)</span>
                <span className="font-semibold text-amber-200">{kpis.injured}</span>
              </div>
              <ul className="list-inside list-disc text-xs">
                <li>Equipa com mais casos activos: {kpis.riskTeam}</li>
                <li>Retornos previstos nos próximos 7 dias: {kpis.returning}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "injured" ? (
        <div className="space-y-4">
          <Card className="border-surface-border bg-surface-raised/30">
            <CardHeader>
              <CardTitle className="text-base text-white">{injEditId ? "Editar caso" : "Novo caso manual"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSaveInjury} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Nome *">
                  <Input value={injForm.playerName} onChange={(e) => setInjForm((f) => ({ ...f, playerName: e.target.value }))} required />
                </Field>
                <Field label="Equipa">
                  <Input value={injForm.team} onChange={(e) => setInjForm((f) => ({ ...f, team: e.target.value }))} />
                </Field>
                <Field label="Posição">
                  <Input value={injForm.position} onChange={(e) => setInjForm((f) => ({ ...f, position: e.target.value }))} />
                </Field>
                <Field label="Tipo de lesão">
                  <Input value={injForm.injuryType} onChange={(e) => setInjForm((f) => ({ ...f, injuryType: e.target.value }))} />
                </Field>
                <Field label="Zona corporal">
                  <Input value={injForm.bodyArea} onChange={(e) => setInjForm((f) => ({ ...f, bodyArea: e.target.value }))} />
                </Field>
                <Field label="Gravidade">
                  <select
                    className="w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm"
                    value={injForm.severity}
                    onChange={(e) => setInjForm((f) => ({ ...f, severity: e.target.value as PresidentInjurySeverity }))}
                  >
                    {(Object.keys(SEVERITY_LABEL) as PresidentInjurySeverity[]).map((k) => (
                      <option key={k} value={k}>
                        {SEVERITY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de início">
                  <Input type="date" value={injForm.startDate} onChange={(e) => setInjForm((f) => ({ ...f, startDate: e.target.value }))} />
                </Field>
                <Field label="Retorno previsto">
                  <Input
                    type="date"
                    value={injForm.expectedReturn}
                    onChange={(e) => setInjForm((f) => ({ ...f, expectedReturn: e.target.value }))}
                  />
                </Field>
                <Field label="Estado">
                  <select
                    className="w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm"
                    value={injForm.status}
                    onChange={(e) => setInjForm((f) => ({ ...f, status: e.target.value as PresidentInjuryStatus }))}
                  >
                    {(Object.keys(STATUS_LABEL) as PresidentInjuryStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {STATUS_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Staff atribuído">
                  <Input value={injForm.assignedStaff} onChange={(e) => setInjForm((f) => ({ ...f, assignedStaff: e.target.value }))} />
                </Field>
                <Field label="Prontidão % (0–100)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={injForm.availabilityPct}
                    onChange={(e) => setInjForm((f) => ({ ...f, availabilityPct: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Custo médico (EUR)">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={injForm.medicalCostEUR ?? 0}
                    onChange={(e) => setInjForm((f) => ({ ...f, medicalCostEUR: Number(e.target.value) || 0 }))}
                  />
                </Field>
                <Field label="Nota" className="md:col-span-2 lg:col-span-3">
                  <textarea
                    className="min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100"
                    value={injForm.note}
                    onChange={(e) => setInjForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </Field>
                <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3">
                  <Button type="submit">{injEditId ? "Guardar" : "Adicionar"}</Button>
                  {injEditId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setInjEditId(null);
                        setInjForm(emptyManualInjury());
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Pesquisar">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do jogador" />
            </Field>
            <Field label="Equipa">
              <select
                className="rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
              >
                <option value="">Todas</option>
                {teamOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gravidade">
              <select
                className="rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as "" | PresidentInjurySeverity)}
              >
                <option value="">Todas</option>
                {(Object.keys(SEVERITY_LABEL) as PresidentInjurySeverity[]).map((k) => (
                  <option key={k} value={k}>
                    {SEVERITY_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                className="rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "" | PresidentInjuryStatus)}
              >
                <option value="">Todos</option>
                {(Object.keys(STATUS_LABEL) as PresidentInjuryStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-surface-border/70 md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Equipa</th>
                  <th className="px-2 py-2">Pos.</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Zona</th>
                  <th className="px-2 py-2">Grav.</th>
                  <th className="px-2 py-2">Início</th>
                  <th className="px-2 py-2">Retorno</th>
                  <th className="px-2 py-2">Dias</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Staff</th>
                  <th className="px-2 py-2">Nota</th>
                  <th className="px-2 py-2">Origem</th>
                  <th className="px-2 py-2 w-28" />
                </tr>
              </thead>
              <tbody>
                {filteredInjuries.map((i) => (
                  <tr key={i.id} className="border-b border-surface-border/40">
                    <td className="px-2 py-2 font-medium text-zinc-200">{i.playerName}</td>
                    <td className="px-2 py-2 text-zinc-400">{i.team || "—"}</td>
                    <td className="px-2 py-2 text-zinc-500">{i.position || "—"}</td>
                    <td className="px-2 py-2 text-zinc-400">{i.injuryType || "—"}</td>
                    <td className="px-2 py-2 text-zinc-500">{i.bodyArea || "—"}</td>
                    <td className="px-2 py-2">
                      <Badge className={severityBadgeClass(i.severity)}>{SEVERITY_LABEL[i.severity]}</Badge>
                    </td>
                    <td className="px-2 py-2 text-zinc-500">{i.startDate || "—"}</td>
                    <td className="px-2 py-2 text-zinc-500">{i.expectedReturn || "—"}</td>
                    <td className="px-2 py-2 tabular-nums text-zinc-400">{i.daysOut}</td>
                    <td className="px-2 py-2">
                      <Badge className={statusBadgeClass(i.status)}>{STATUS_LABEL[i.status]}</Badge>
                    </td>
                    <td className="px-2 py-2 text-zinc-500">{i.assignedStaff || "—"}</td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-zinc-500" title={i.note}>
                      {i.note || "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-500">{i.syncedFromCoach ? "Treinador" : "Clube"}</td>
                    <td className="px-2 py-2 text-right">
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setProfile(i)}>
                        Ficha
                      </Button>
                      {!i.syncedFromCoach ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => {
                              setInjEditId(i.id);
                              const { id: _id, ...rest } = i;
                              setInjForm(rest);
                            }}
                          >
                            Editar
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removeInjury(i.id)}>
                            Apagar
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-zinc-500"
                          title="Altere o estado na equipa do treinador ou complemente aqui via ficha"
                          onClick={() => setProfile(i)}
                        >
                          Ver
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredInjuries.map((i) => (
              <Card key={i.id} className="border-surface-border bg-surface-raised/40">
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{i.playerName}</p>
                      <p className="text-xs text-zinc-500">
                        {i.team} · {i.injuryType}
                      </p>
                    </div>
                    <Badge className={statusBadgeClass(i.status)}>{STATUS_LABEL[i.status]}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">Retorno: {i.expectedReturn || "—"}</p>
                  <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setProfile(i)}>
                    Ver ficha
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "recovery" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {state.injuries.filter(isActiveInjury).map((i) => (
            <Card key={i.id} className="border-surface-border bg-surface-raised/35">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">{i.playerName}</CardTitle>
                <p className="text-xs text-zinc-500">
                  {i.team} · {i.injuryType}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>Prontidão para retorno</span>
                    <span>{i.availabilityPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-accent" style={{ width: `${i.availabilityPct}%` }} />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Sessões concluídas: {i.rehabSessionsDone ?? 0}</p>
                <p className="text-xs text-zinc-500">Próximo marco: {i.nextMilestone?.trim() ? i.nextMilestone : "—"}</p>
                <p className="text-xs text-zinc-500">Retorno estimado: {i.expectedReturn || "—"}</p>
                <textarea
                  className="min-h-[64px] w-full rounded-lg border border-surface-border bg-black/20 px-2 py-1 text-xs text-zinc-200"
                  placeholder="Notas de reabilitação"
                  defaultValue={i.recoveryProgress}
                  onBlur={(e) => updateInjury(i.id, { recoveryProgress: e.target.value })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "availability" ? (
        <Card className="border-surface-border bg-surface-raised/30">
          <CardContent className="overflow-x-auto p-0 sm:p-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Jogador</th>
                  <th className="px-3 py-2 text-left">Equipa</th>
                  <th className="px-3 py-2 text-left">Posição</th>
                  <th className="px-3 py-2 text-left">Estado treinador</th>
                  <th className="px-3 py-2 text-left">Centro médico</th>
                </tr>
              </thead>
              <tbody>
                {availabilityRows.map(({ player, injury }) => (
                  <tr key={player.id} className="border-b border-surface-border/40">
                    <td className="px-3 py-2 font-medium text-zinc-200">{player.name}</td>
                    <td className="px-3 py-2 text-zinc-400">{player.team}</td>
                    <td className="px-3 py-2 text-zinc-500">{player.position}</td>
                    <td className="px-3 py-2 text-zinc-400">{player.injuryStatus || "Disponível"}</td>
                    <td className="px-3 py-2">
                      {injury ? (
                        <Badge className={statusBadgeClass(injury.status)}>{STATUS_LABEL[injury.status]}</Badge>
                      ) : (
                        <span className="text-emerald-400/90">Disponível</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {tab === "appointments" ? (
        <div className="space-y-4">
          <form
            className="grid gap-2 md:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!apptForm.playerName.trim()) return;
              addMedicalAppointment(apptForm);
              setApptForm({ playerName: "", date: todayIso(), type: "Fisioterapia", professional: "", status: "agendado", notes: "" });
            }}
          >
            <Input placeholder="Jogador" value={apptForm.playerName} onChange={(e) => setApptForm((a) => ({ ...a, playerName: e.target.value }))} />
            <Input type="datetime-local" value={apptForm.date} onChange={(e) => setApptForm((a) => ({ ...a, date: e.target.value }))} />
            <Input placeholder="Tipo" value={apptForm.type} onChange={(e) => setApptForm((a) => ({ ...a, type: e.target.value }))} />
            <Input placeholder="Profissional" value={apptForm.professional} onChange={(e) => setApptForm((a) => ({ ...a, professional: e.target.value }))} />
            <select
              className="rounded-xl border border-surface-border bg-surface-raised/90 px-2 py-2 text-sm"
              value={apptForm.status}
              onChange={(e) => setApptForm((a) => ({ ...a, status: e.target.value as PresidentMedicalAppointment["status"] }))}
            >
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <Button type="submit">Agendar</Button>
            <Input
              className="md:col-span-6"
              placeholder="Notas"
              value={apptForm.notes}
              onChange={(e) => setApptForm((a) => ({ ...a, notes: e.target.value }))}
            />
          </form>
          <div className="overflow-x-auto rounded-xl border border-surface-border/70">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Jogador</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Profissional</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Notas</th>
                  <th className="px-3 py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {state.medicalAppointments.map((a) => (
                  <tr key={a.id} className="border-b border-surface-border/40">
                    <td className="px-3 py-2 text-zinc-200">{a.playerName}</td>
                    <td className="px-3 py-2 text-zinc-500">{a.date}</td>
                    <td className="px-3 py-2 text-zinc-400">{a.type}</td>
                    <td className="px-3 py-2 text-zinc-500">{a.professional}</td>
                    <td className="px-3 py-2 text-zinc-400">{a.status}</td>
                    <td className="px-3 py-2 text-zinc-500">{a.notes}</td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" size="sm" variant="ghost" className="text-red-400" onClick={() => removeMedicalAppointment(a.id)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "inventory" ? (
        <div className="space-y-4">
          <form
            className="grid gap-2 md:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!invForm.item.trim()) return;
              addMedicalInventoryItem(invForm);
              setInvForm({ item: "", stock: 0, minLevel: 0, supplier: "" });
            }}
          >
            <Input placeholder="Artigo" value={invForm.item} onChange={(e) => setInvForm((x) => ({ ...x, item: e.target.value }))} />
            <Input type="number" placeholder="Stock" value={invForm.stock} onChange={(e) => setInvForm((x) => ({ ...x, stock: Number(e.target.value) || 0 }))} />
            <Input type="number" placeholder="Mínimo" value={invForm.minLevel} onChange={(e) => setInvForm((x) => ({ ...x, minLevel: Number(e.target.value) || 0 }))} />
            <Input placeholder="Fornecedor" value={invForm.supplier} onChange={(e) => setInvForm((x) => ({ ...x, supplier: e.target.value }))} />
            <Button type="submit">Adicionar</Button>
          </form>
          <div className="overflow-x-auto rounded-xl border border-surface-border/70">
            <table className="w-full text-sm">
              <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Artigo</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Mínimo</th>
                  <th className="px-3 py-2">Fornecedor</th>
                  <th className="px-3 py-2">Repor?</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {state.medicalInventory.map((x) => (
                  <tr key={x.id} className="border-b border-surface-border/40">
                    <td className="px-3 py-2 font-medium text-zinc-200">{x.item}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-300">{x.stock}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">{x.minLevel}</td>
                    <td className="px-3 py-2 text-zinc-500">{x.supplier}</td>
                    <td className="px-3 py-2">
                      {x.stock <= x.minLevel ? (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-100">Sim</Badge>
                      ) : (
                        <span className="text-zinc-600">Não</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeMedicalInventoryItem(x.id)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "reports" ? (
        <Card className="border-surface-border bg-surface-raised/30">
          <CardHeader>
            <CardTitle className="text-base text-white">Relatórios exportáveis</CardTitle>
            <p className="text-xs text-zinc-500">Resumo mensal, disponibilidade por equipa e custos. Use CSV para Excel ou Imprimir para PDF do navegador.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportInjuriesCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV — Lesões
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const body = state.injuries.map((i) => `${i.playerName} | ${i.team} | ${STATUS_LABEL[i.status]} | ${i.expectedReturn}`).join("\n");
                printReport("Relatório de lesões", body);
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir — Lesões
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const lines = roster.players.map((p) => `${p.name};${p.team};${p.injuryStatus || "Disponível"}`).join("\n");
                downloadText(`disponibilidade-${todayIso()}.csv`, `Jogador;Equipa;Estado treinador\n${lines}`, "text/csv;charset=utf-8");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV — Disponibilidade
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {profile ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-surface-border bg-zinc-950 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white">Ficha médica</CardTitle>
              <Button type="button" variant="ghost" onClick={() => setProfile(null)}>
                Fechar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Informação base</h3>
                <p>
                  <strong className="text-white">{profile.playerName}</strong> · {profile.team} · {profile.position}
                </p>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lesão actual</h3>
                <p>{profile.injuryType}</p>
                <p className="text-xs text-zinc-500">
                  {SEVERITY_LABEL[profile.severity]} · {STATUS_LABEL[profile.status]}
                </p>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prontidão</h3>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full bg-accent" style={{ width: `${profile.availabilityPct}%` }} />
                </div>
                <p className="mt-1 text-xs">{profile.availabilityPct}%</p>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notas clínicas (acesso restrito)</h3>
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-surface-border bg-black/30 px-2 py-2 text-xs"
                  defaultValue={profile.medicalNotes}
                  onBlur={(e) => updateInjury(profile.id, { medicalNotes: e.target.value })}
                />
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Carga / fadiga</h3>
                <textarea
                  className="min-h-[64px] w-full rounded-lg border border-surface-border bg-black/30 px-2 py-2 text-xs"
                  placeholder="Observações de carga, minutos, risco de sobrecarga…"
                  defaultValue={profile.workloadNotes}
                  onBlur={(e) => updateInjury(profile.id, { workloadNotes: e.target.value })}
                />
              </section>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="border-surface-border bg-gradient-to-br from-surface-raised/60 to-surface-raised/20">
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("space-y-1", className)}>
      <span className="text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
