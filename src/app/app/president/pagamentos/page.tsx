"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, PieChart, Printer, Trash2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import type { PresidentExpense, PresidentExpenseCategory, PresidentExpensePaymentMethod, PresidentExpenseStatus } from "@/types/president-club";
import { cn } from "@/lib/utils";

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const todayIso = () => new Date().toISOString().slice(0, 10);

const CATEGORY_LABELS: Record<PresidentExpenseCategory, string> = {
  treinadores_staff: "Treinadores & Staff",
  arbitragem_taxas_jogo: "Arbitragem & Taxas de Jogo",
  campo_instalacoes: "Campo / Instalações",
  equipamento: "Equipamento",
  transporte: "Transporte",
  seguros_licencas: "Seguros & Licenças",
  administracao: "Administração",
  saude: "Saúde",
  dividas_antigas: "Dívidas Antigas",
  outras_despesas: "Outras Despesas",
};

const PAYMENT_METHOD_LABELS: Record<PresidentExpensePaymentMethod, string> = {
  numerario: "Numerário",
  transferencia_bancaria: "Transferência Bancária",
  mbway: "MB Way",
  cartao: "Cartão",
  debito_direto: "Débito Direto",
  outro: "Outro",
};

function statusBadge(s: PresidentExpenseStatus) {
  if (s === "pago") return <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-100">Pago</Badge>;
  if (s === "atrasado") return <Badge className="border border-red-500/30 bg-red-500/10 text-red-100">Atrasado</Badge>;
  return <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-100">Pendente</Badge>;
}

export default function PresidentPagamentosPage() {
  const roster = usePresidentLinkedRoster();
  const {
    state,
    addExpense,
    updateExpense,
    removeExpense,
    markExpensePaid,
    syncExpensesWithLinkedStaff,
    syncMedicalStaffToExpenses,
  } = usePresidentClub();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PresidentExpenseCategory>("treinadores_staff");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<PresidentExpenseStatus>("pendente");
  const [method, setMethod] = useState<PresidentExpensePaymentMethod>("transferencia_bancaria");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"" | PresidentExpenseCategory>("");
  const [filterStatus, setFilterStatus] = useState<"" | PresidentExpenseStatus>("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterThisWeek, setFilterThisWeek] = useState(false);
  const [filterThisMonth, setFilterThisMonth] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PresidentExpense | null>(null);

  useEffect(() => {
    syncExpensesWithLinkedStaff(roster.staffRows ?? []);
  }, [roster.staffRows, syncExpensesWithLinkedStaff]);

  useEffect(() => {
    syncMedicalStaffToExpenses(state.medicalStaff);
  }, [state.medicalStaff, syncMedicalStaffToExpenses]);

  useEffect(() => {
    const now = todayIso();
    state.expenses.forEach((e) => {
      if (e.status === "pendente" && e.dueDate && e.dueDate < now) updateExpense(e.id, { status: "atrasado" });
    });
  }, [state.expenses, updateExpense]);

  const ym = useMemo(() => todayIso().slice(0, 7), []);
  const monthExpenses = useMemo(() => state.expenses.filter((e) => e.dueDate.startsWith(ym)), [state.expenses, ym]);
  const kpis = useMemo(() => {
    const totalMonth = monthExpenses.reduce((s, e) => s + e.valueEUR, 0);
    const paidMonth = state.expenses
      .filter((e) => e.status === "pago" && e.lastPaidAt && e.lastPaidAt.startsWith(ym))
      .reduce((s, e) => s + e.valueEUR, 0);
    const pending = state.expenses.filter((e) => e.status === "pendente").reduce((s, e) => s + e.valueEUR, 0);
    const overdue = state.expenses.filter((e) => e.status === "atrasado").reduce((s, e) => s + e.valueEUR, 0);
    const payroll = state.expenses
      .filter((e) => e.category === "treinadores_staff")
      .reduce((s, e) => s + e.valueEUR, 0);
    const forecastNext = state.expenses
      .filter((e) => e.recurringMonthly || e.dueDate.startsWith(addMonth(ym)))
      .reduce((s, e) => s + e.valueEUR, 0);
    return { totalMonth, paidMonth, pending, overdue, payroll, forecastNext };
  }, [monthExpenses, state.expenses, ym]);

  const teams = useMemo(
    () => [...new Set(state.expenses.map((e) => e.teamOrDepartment.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt")),
    [state.expenses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const endWeek = addDays(todayIso(), 7);
    return state.expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterTeam && e.teamOrDepartment !== filterTeam) return false;
      if (filterThisWeek && (!e.dueDate || e.dueDate < todayIso() || e.dueDate > endWeek)) return false;
      if (filterThisMonth && !e.dueDate.startsWith(ym)) return false;
      if (!q) return true;
      const blob = [e.name, e.description, e.note, e.supplier, e.role, e.teamOrDepartment].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [state.expenses, filterCategory, filterStatus, filterTeam, filterThisWeek, filterThisMonth, search, ym]);

  const upcoming = useMemo(
    () =>
      [...state.expenses]
        .filter((e) => e.status !== "pago" && e.dueDate && e.dueDate >= todayIso())
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 6),
    [state.expenses]
  );
  const biggest = useMemo(() => [...monthExpenses].sort((a, b) => b.valueEUR - a.valueEUR).slice(0, 6), [monthExpenses]);
  const urgent = useMemo(() => [...state.expenses].filter((e) => e.status === "atrasado").sort((a, b) => b.valueEUR - a.valueEUR).slice(0, 6), [state.expenses]);
  const byCategory = useMemo(() => {
    const total = state.expenses.reduce((s, e) => s + e.valueEUR, 0) || 1;
    return Object.entries(
      state.expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.valueEUR;
        return acc;
      }, {})
    ).map(([k, v]) => ({ key: k as PresidentExpenseCategory, value: v, pct: Math.round((v / total) * 100) }));
  }, [state.expenses]);

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value.replace(",", "."));
    if (!name.trim() || !Number.isFinite(n)) return;
    addExpense({
      name: name.trim(),
      category,
      description: description.trim(),
      teamOrDepartment: team.trim(),
      dueDate: dueDate.trim(),
      valueEUR: Math.max(0, n),
      status,
      paymentMethod: method,
      paymentInfo: paymentInfo.trim(),
      note: note.trim(),
      lastPaidAt: "",
      recurringMonthly: category === "treinadores_staff",
      role: "",
      supplier: "",
    });
    setName("");
    setDescription("");
    setTeam("");
    setDueDate("");
    setValue("");
    setPaymentInfo("");
    setNote("");
  };

  const exportCsv = () => {
    const rows = [["Nome", "Categoria", "Descrição", "Departamento", "Vencimento", "Valor", "Estado", "Método", "Informação Pagamento", "Nota"]];
    filtered.forEach((e) =>
      rows.push([
        e.name,
        CATEGORY_LABELS[e.category],
        e.description,
        e.teamOrDepartment,
        e.dueDate,
        String(e.valueEUR),
        e.status,
        PAYMENT_METHOD_LABELS[e.paymentMethod],
        e.paymentInfo,
        e.note,
      ])
    );
    const blob = new Blob([rows.map((r) => r.map((x) => `"${x.replaceAll('"', '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pagamentos-despesas-${todayIso()}.csv`;
    a.click();
  };

  const startEditExpense = (expense: PresidentExpense) => {
    setEditingExpenseId(expense.id);
    setEditingDraft({ ...expense });
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setEditingDraft(null);
  };

  const saveEditExpense = () => {
    if (!editingExpenseId || !editingDraft) return;
    updateExpense(editingExpenseId, {
      name: editingDraft.name.trim(),
      category: editingDraft.category,
      description: editingDraft.description.trim(),
      teamOrDepartment: editingDraft.teamOrDepartment.trim(),
      dueDate: editingDraft.dueDate.trim(),
      valueEUR: Math.max(0, Number.isFinite(editingDraft.valueEUR) ? editingDraft.valueEUR : 0),
      status: editingDraft.status,
      paymentMethod: editingDraft.paymentMethod,
      paymentInfo: editingDraft.paymentInfo.trim(),
      note: editingDraft.note.trim(),
      recurringMonthly: Boolean(editingDraft.recurringMonthly),
      role: editingDraft.role.trim(),
      supplier: editingDraft.supplier.trim(),
    });
    cancelEditExpense();
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Pagamentos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Gestão de despesas do clube, obrigações, salários e pagamentos operacionais (dinheiro a sair).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.print()}>
            Relatório mensal
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total despesas mês" value={eur(kpis.totalMonth)} icon={Wallet} />
        <StatCard label="Pago este mês" value={eur(kpis.paidMonth)} />
        <StatCard label="Pendentes" value={eur(kpis.pending)} />
        <StatCard label="Atrasados" value={eur(kpis.overdue)} />
        <StatCard label="Payroll staff" value={eur(kpis.payroll)} />
        <StatCard label="Previsão próximo mês" value={eur(kpis.forecastNext)} />
      </div>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardHeader><CardTitle className="text-base text-white">Adicionar despesa</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome / entidade" required />
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value as PresidentExpenseCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
            <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Equipa / Departamento" />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor €" inputMode="decimal" />
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as PresidentExpenseStatus)}>
              <option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option>
            </select>
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value as PresidentExpensePaymentMethod)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder="Informação pagamento" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota" />
            <Button type="submit">Adicionar despesa</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/25">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base text-white">Tabela de despesas</CardTitle>
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nome, fornecedor, função..." />
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as "" | PresidentExpenseCategory)}>
              <option value="">Categoria (todas)</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | PresidentExpenseStatus)}>
              <option value="">Estado (todos)</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option>
            </select>
            <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              <option value="">Equipa / Departamento</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-surface-border px-3 text-sm"><input type="checkbox" checked={filterThisWeek} onChange={(e) => setFilterThisWeek(e.target.checked)} /> Vence esta semana</label>
            <label className="flex items-center gap-2 rounded-xl border border-surface-border px-3 text-sm"><input type="checkbox" checked={filterThisMonth} onChange={(e) => setFilterThisMonth(e.target.checked)} /> Este mês</label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="sticky top-0 z-10 border-y border-surface-border bg-[#0c1116] text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Categoria</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Equipa / Dep.</th><th className="px-3 py-2 text-left">Vencimento</th><th className="px-3 py-2 text-left">Valor (€)</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-left">Método</th><th className="px-3 py-2 text-left">Informação pagamento</th><th className="px-3 py-2 text-left">Nota</th><th className="px-3 py-2 w-28 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-zinc-500">Sem despesas para os filtros aplicados.</td></tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-b border-surface-border/50 transition-colors hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-zinc-200">{e.name}</td>
                    <td className="px-3 py-2 text-zinc-400">{CATEGORY_LABELS[e.category]}</td>
                    <td className="px-3 py-2 text-zinc-400">{e.description || "—"}</td>
                    <td className="px-3 py-2 text-zinc-400">{e.teamOrDepartment || "—"}</td>
                    <td className="px-3 py-2 text-zinc-400">{e.dueDate || "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-200">{eur(e.valueEUR)}</td>
                    <td className="px-3 py-2">
                      <select className="h-9 rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-xs" value={e.status} onChange={(ev) => updateExpense(e.id, { status: ev.target.value as PresidentExpenseStatus })}>
                        <option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option>
                      </select>
                      <div className="mt-1">{statusBadge(e.status)}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
                    <td className="px-3 py-2 text-zinc-400">{e.paymentInfo || "—"}</td>
                    <td className="px-3 py-2 text-zinc-400">{e.note || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button type="button" size="sm" className="h-8 px-2" onClick={() => markExpensePaid(e.id)}>Pago</Button>
                        <Button type="button" size="sm" variant="secondary" className="h-8 px-2" onClick={() => startEditExpense(e)}>
                          Editar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removeExpense(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editingExpenseId && editingDraft ? (
        <Card className="border-surface-border bg-surface-raised/25">
          <CardHeader>
            <CardTitle className="text-base text-white">Editar pagamento/despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input value={editingDraft.name} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, name: ev.target.value } : p))} placeholder="Nome / entidade" />
              <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={editingDraft.category} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, category: ev.target.value as PresidentExpenseCategory } : p))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Input value={editingDraft.description} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, description: ev.target.value } : p))} placeholder="Descrição" />
              <Input value={editingDraft.teamOrDepartment} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, teamOrDepartment: ev.target.value } : p))} placeholder="Equipa / Departamento" />
              <Input type="date" value={editingDraft.dueDate} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, dueDate: ev.target.value } : p))} />
              <Input value={String(editingDraft.valueEUR)} onChange={(ev) => {
                const parsed = Number(ev.target.value.replace(",", "."));
                setEditingDraft((p) => (p ? { ...p, valueEUR: Number.isFinite(parsed) ? parsed : 0 } : p));
              }} placeholder="Valor €" inputMode="decimal" />
              <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={editingDraft.status} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, status: ev.target.value as PresidentExpenseStatus } : p))}>
                <option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option>
              </select>
              <select className="h-11 rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm" value={editingDraft.paymentMethod} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, paymentMethod: ev.target.value as PresidentExpensePaymentMethod } : p))}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Input value={editingDraft.paymentInfo} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, paymentInfo: ev.target.value } : p))} placeholder="Informação pagamento" />
              <Input value={editingDraft.note} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, note: ev.target.value } : p))} placeholder="Nota" />
              <Input value={editingDraft.role} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, role: ev.target.value } : p))} placeholder="Função (opcional)" />
              <Input value={editingDraft.supplier} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, supplier: ev.target.value } : p))} placeholder="Fornecedor (opcional)" />
              <label className="flex items-center gap-2 rounded-xl border border-surface-border px-3 text-sm">
                <input type="checkbox" checked={editingDraft.recurringMonthly} onChange={(ev) => setEditingDraft((p) => (p ? { ...p, recurringMonthly: ev.target.checked } : p))} />
                Recorrência mensal
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={saveEditExpense}>Guardar alterações</Button>
              <Button type="button" variant="ghost" onClick={cancelEditExpense}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-surface-border bg-surface-raised/25 lg:col-span-2"><CardHeader><CardTitle className="text-sm text-white">Pagamentos próximos (7 dias)</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{upcoming.length ? upcoming.map((e) => <div key={e.id} className="flex justify-between rounded-lg border border-surface-border/50 px-2 py-1.5"><span className="truncate">{e.name}</span><span className="tabular-nums">{e.dueDate || "—"}</span></div>) : <p className="text-zinc-500">Sem itens.</p>}</CardContent></Card>
        <Card className="border-surface-border bg-surface-raised/25"><CardHeader><CardTitle className="text-sm text-white">Maiores custos mês</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{biggest.length ? biggest.map((e) => <div key={e.id} className="flex justify-between"><span className="truncate">{e.name}</span><span className="tabular-nums">{eur(e.valueEUR)}</span></div>) : <p className="text-zinc-500">Sem custos.</p>}</CardContent></Card>
        <Card className="border-surface-border bg-surface-raised/25"><CardHeader><CardTitle className="text-sm text-white">Atrasos urgentes</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{urgent.length ? urgent.map((e) => <div key={e.id} className="flex justify-between"><span className="truncate">{e.name}</span><span className="tabular-nums text-red-300">{eur(e.valueEUR)}</span></div>) : <p className="text-zinc-500">Sem atrasos.</p>}</CardContent></Card>
        <Card className="border-surface-border bg-surface-raised/25"><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-white"><PieChart className="h-4 w-4" /> Breakdown despesas</CardTitle></CardHeader><CardContent className="space-y-2">{byCategory.length ? byCategory.map((c) => <div key={c.key}><div className="mb-1 flex justify-between text-xs"><span>{CATEGORY_LABELS[c.key]}</span><span>{c.pct}%</span></div><div className="h-2 rounded-full bg-zinc-800"><div className={cn("h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-300/80")} style={{ width: `${c.pct}%` }} /></div></div>) : <p className="text-sm text-zinc-500">Sem dados.</p>}</CardContent></Card>
      </div>
    </div>
  );
}

function addMonth(ym: string): string {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
