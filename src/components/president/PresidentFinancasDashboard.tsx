"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Download,
  Euro,
  FileText,
  Printer,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import type { PresidentPayment, PresidentPaymentMethod } from "@/types/president-club";
import { cn } from "@/lib/utils";
import {
  defaultQuotaDueDate,
  monthsLateCount,
  paymentEffectiveEUR,
  PAYMENT_METHOD_LABELS,
} from "@/lib/president-finance";

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function statusBadge(status: PresidentPayment["status"]) {
  if (status === "pago")
    return <Badge className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-200">Pago</Badge>;
  if (status === "atrasado")
    return <Badge className="border border-red-500/40 bg-red-500/15 text-red-200">Em atraso</Badge>;
  return <Badge className="border border-amber-500/40 bg-amber-500/15 text-amber-100">Pendente</Badge>;
}

function contactHref(contact: string): string | null {
  const t = contact.trim();
  if (!t) return null;
  if (t.includes("@")) return `mailto:${t}`;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9) return `tel:${digits}`;
  return null;
}

type SortKey =
  | "name"
  | "team"
  | "dueDate"
  | "amount"
  | "status"
  | "monthsLate";

export function PresidentFinancasDashboard() {
  const roster = usePresidentLinkedRoster();
  const {
    state,
    syncFinancePaymentsWithRoster,
    updatePayment,
    markPaymentPaid,
    archiveFinancePayment,
    removePayment,
  } = usePresidentClub();

  const mergedPlayers = useMemo(() => {
    const m = new Map<string, (typeof roster.players)[0]>();
    for (const p of [...roster.players, ...state.players]) m.set(p.id, p);
    return [...m.values()];
  }, [roster.players, state.players]);

  useEffect(() => {
    syncFinancePaymentsWithRoster(mergedPlayers);
  }, [mergedPlayers, syncFinancePaymentsWithRoster]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const ymPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);

  useEffect(() => {
    state.payments.forEach((p) => {
      if (p.archived) return;
      if (p.status !== "pendente") return;
      if (!p.dueDate || p.dueDate >= todayIso) return;
      updatePayment(p.id, { status: "atrasado" });
    });
  }, [state.payments, todayIso, updatePayment]);

  const activePayments = useMemo(() => state.payments.filter((p) => !p.archived), [state.payments]);

  const kpis = useMemo(() => {
    const totalPlayers = mergedPlayers.length;
    const paidThisMonth = activePayments.filter(
      (p) => p.status === "pago" && p.lastPaidAt && p.lastPaidAt.startsWith(ymPrefix)
    ).length;
    const pending = activePayments.filter((p) => p.status === "pendente");
    const overdue = activePayments.filter((p) => p.status === "atrasado");
    const pendingSum = pending.reduce((s, p) => s + paymentEffectiveEUR(p), 0);
    const overdueSum = overdue.reduce((s, p) => s + paymentEffectiveEUR(p), 0);
    const expectedThisMonth = activePayments
      .filter((p) => p.dueDate && p.dueDate.startsWith(ymPrefix))
      .reduce((s, p) => s + paymentEffectiveEUR(p), 0);
    const collectedThisMonth = activePayments
      .filter((p) => p.status === "pago" && p.lastPaidAt && p.lastPaidAt.startsWith(ymPrefix))
      .reduce((s, p) => s + paymentEffectiveEUR(p), 0);
    return {
      totalPlayers,
      paidThisMonth,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      pendingSum,
      overdueSum,
      expectedThisMonth,
      collectedThisMonth,
    };
  }, [activePayments, mergedPlayers.length, ymPrefix]);

  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | PresidentPayment["status"]>("");
  const [filterDueWeek, setFilterDueWeek] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterPaidMonth, setFilterPaidMonth] = useState(false);
  const [filterCoach, setFilterCoach] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [editRow, setEditRow] = useState<PresidentPayment | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  const teamOptions = useMemo(() => {
    const s = new Set<string>();
    activePayments.forEach((p) => {
      if (p.team.trim()) s.add(p.team.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, "pt"));
  }, [activePayments]);

  const coachOptions = useMemo(() => {
    const s = new Set<string>();
    activePayments.forEach((p) => {
      if (p.coachEmail?.trim()) s.add(p.coachEmail.trim());
    });
    return [...s].sort();
  }, [activePayments]);

  const weekEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const filteredRows = useMemo(() => {
    let rows = [...activePayments];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.playerName.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.familyContact.toLowerCase().includes(q) ||
          p.personalContact.toLowerCase().includes(q) ||
          (p.coachEmail ?? "").toLowerCase().includes(q)
      );
    }
    if (filterTeam) rows = rows.filter((p) => p.team === filterTeam);
    if (filterStatus) rows = rows.filter((p) => p.status === filterStatus);
    if (filterCoach) rows = rows.filter((p) => (p.coachEmail ?? "").includes(filterCoach));
    if (filterDueWeek) {
      rows = rows.filter((p) => p.dueDate && p.dueDate >= todayIso && p.dueDate <= weekEnd);
    }
    if (filterOverdue) rows = rows.filter((p) => p.status === "atrasado");
    if (filterPaidMonth) {
      rows = rows.filter((p) => p.status === "pago" && p.lastPaidAt?.startsWith(ymPrefix));
    }
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.playerName.localeCompare(b.playerName, "pt");
      else if (sortKey === "team") cmp = a.team.localeCompare(b.team, "pt");
      else if (sortKey === "dueDate") cmp = (a.dueDate || "").localeCompare(b.dueDate || "");
      else if (sortKey === "amount") cmp = paymentEffectiveEUR(a) - paymentEffectiveEUR(b);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "monthsLate")
        cmp = monthsLateCount(a, todayIso) - monthsLateCount(b, todayIso);
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [
    activePayments,
    search,
    filterTeam,
    filterStatus,
    filterCoach,
    filterDueWeek,
    filterOverdue,
    filterPaidMonth,
    todayIso,
    weekEnd,
    ymPrefix,
    sortKey,
    sortAsc,
  ]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  const upcoming = useMemo(() => {
    return [...activePayments]
      .filter((p) => p.status !== "pago" && p.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [activePayments]);

  const recentPaid = useMemo(() => {
    return [...activePayments]
      .filter((p) => p.status === "pago" && p.lastPaidAt)
      .sort((a, b) => (b.lastPaidAt ?? "").localeCompare(a.lastPaidAt ?? ""))
      .slice(0, 6);
  }, [activePayments]);

  const biggestOverdue = useMemo(() => {
    return [...activePayments]
      .filter((p) => p.status === "atrasado")
      .sort((a, b) => paymentEffectiveEUR(b) - paymentEffectiveEUR(a))
      .slice(0, 5);
  }, [activePayments]);

  const exportCsv = useCallback(() => {
    const headers = [
      "Nome",
      "Equipa",
      "Família",
      "Jogador",
      "Vencimento",
      "Valor",
      "Desconto",
      "Estado",
      "Último pagamento",
      "Método",
      "Meses atraso",
      "Nota",
    ];
    const lines = filteredRows.map((p) =>
      [
        p.playerName,
        p.team,
        p.familyContact,
        p.personalContact,
        p.dueDate,
        String(p.amountEUR),
        String(p.discountEUR),
        p.status,
        p.lastPaidAt,
        PAYMENT_METHOD_LABELS[p.paymentMethod],
        String(monthsLateCount(p, todayIso)),
        (p.note || "").replace(/"/g, '""'),
      ]
        .map((c) => `"${String(c)}"`)
        .join(",")
    );
    const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas-clube-${ymPrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRows, todayIso, ymPrefix]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const Th = ({
    label,
    k,
    className,
  }: {
    label: string;
    k: SortKey;
    className?: string;
  }) => (
    <th className={cn("sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm", className)}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-zinc-300" onClick={() => toggleSort(k)}>
        {label}
        {sortKey === k ? (sortAsc ? <ArrowUpRight className="h-3 w-3 opacity-70" /> : <ArrowDownRight className="h-3 w-3 opacity-70" />) : null}
      </button>
    </th>
  );

  return (
    <div id="finance-print-root" className="mx-auto max-w-[1600px] space-y-8 print:max-w-none">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white">Finanças</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Gere quotas, mensalidades, estado financeiro e cobranças. Os jogadores das contas de treinador ligadas
            aparecem automaticamente na tabela — os dados sincronizam com o plantel agregado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={printReport}>
            <Printer className="h-4 w-4" />
            Imprimir relatório
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={printReport} title="No diálogo de impressão, escolhe Guardar como PDF">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
        <StatCard
          className="border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-transparent"
          label="Total de jogadores"
          value={kpis.totalPlayers}
          hint="Plantel agregado (ligados + manuais)"
          icon={Users}
        />
        <StatCard
          className="border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-transparent"
          label="Pagos este mês"
          value={kpis.paidThisMonth}
          hint={`${kpis.paidThisMonth} registo(s) · ${eur(kpis.collectedThisMonth)} cobrados`}
          icon={Calendar}
        />
        <StatCard
          className="border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-transparent"
          label="Pagamentos pendentes"
          value={eur(kpis.pendingSum)}
          hint={`${kpis.pendingCount} jogador(es)`}
          icon={Euro}
        />
        <StatCard
          className="border-red-500/10 bg-gradient-to-br from-red-500/5 to-transparent"
          label="Em atraso"
          value={eur(kpis.overdueSum)}
          hint={`${kpis.overdueCount} caso(s)`}
          icon={AlertTriangle}
        />
        <StatCard
          label="Receita prevista (mês)"
          value={eur(kpis.expectedThisMonth)}
          hint="Soma das quotas com vencimento no mês actual"
          icon={TrendingUp}
        />
        <StatCard
          label="Total cobrado (mês)"
          value={eur(kpis.collectedThisMonth)}
          hint="Efectivo registado como pago neste mês"
          icon={Euro}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px] print:block">
        <Card className="overflow-hidden border-surface-border bg-surface-raised/25 shadow-card print:border-0 print:shadow-none">
          <CardHeader className="border-b border-surface-border/80 bg-surface-raised/40 print:hidden">
            <CardTitle className="text-base text-white">Pagamentos por jogador</CardTitle>
            <p className="text-xs text-zinc-500">Filtros, ordenação e pesquisa. Cabeçalhos fixos ao deslocar.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 print:p-0">
            <div className="flex flex-col gap-3 print:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome, equipa, contacto…"
                  className="h-11 border-surface-border bg-[#0a0d10]/80 pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-xs text-zinc-100"
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                >
                  <option value="">Todas as equipas</option>
                  {teamOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-xs text-zinc-100"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                >
                  <option value="">Todos os estados</option>
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Em atraso</option>
                </select>
                <select
                  className="h-9 max-w-[200px] rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-xs text-zinc-100"
                  value={filterCoach}
                  onChange={(e) => setFilterCoach(e.target.value)}
                >
                  <option value="">Treinador (email)</option>
                  {coachOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-2 py-1 text-xs text-zinc-400">
                  <input type="checkbox" checked={filterDueWeek} onChange={(e) => setFilterDueWeek(e.target.checked)} />
                  Vence esta semana
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-2 py-1 text-xs text-zinc-400">
                  <input type="checkbox" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} />
                  Só atrasados
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-2 py-1 text-xs text-zinc-400">
                  <input type="checkbox" checked={filterPaidMonth} onChange={(e) => setFilterPaidMonth(e.target.checked)} />
                  Pagos este mês
                </label>
              </div>
            </div>

            <div className="hidden max-h-[min(70vh,720px)] overflow-auto rounded-xl border border-surface-border print:block print:max-h-none print:overflow-visible lg:block">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-surface-border">
                  <tr>
                    <Th label="Nome" k="name" />
                    <Th label="Equipa" k="team" />
                    <th className="sticky top-0 z-10 min-w-[120px] bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Família
                    </th>
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Jogador
                    </th>
                    <Th label="Vencimento" k="dueDate" />
                    <Th label="Valor €" k="amount" />
                    <Th label="Estado" k="status" />
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Nota
                    </th>
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Último pago
                    </th>
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Método
                    </th>
                    <Th label="Meses atraso" k="monthsLate" />
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                      Desconto
                    </th>
                    <th className="sticky top-0 z-10 bg-[#0d1116]/95 px-3 py-3 text-[10px] font-semibold uppercase text-zinc-500 print:hidden">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center text-zinc-500">
                        Sem linhas com estes filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-surface-border/50 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-2.5 font-medium text-zinc-100">{p.playerName}</td>
                        <td className="px-3 py-2.5 text-zinc-400">{p.team || "—"}</td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 text-xs text-zinc-500" title={p.familyContact}>
                          {p.familyContact || "—"}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-2.5 text-xs text-zinc-500" title={p.personalContact}>
                          {p.personalContact || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-zinc-400">{p.dueDate || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums text-zinc-200">{eur(paymentEffectiveEUR(p))}</td>
                        <td className="px-3 py-2.5">{statusBadge(p.status)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-xs text-zinc-500" title={p.note}>
                          {p.note || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500">{p.lastPaidAt || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-zinc-500">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</td>
                        <td className="px-3 py-2.5 tabular-nums text-zinc-500">{monthsLateCount(p, todayIso)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-zinc-500">{p.discountEUR > 0 ? eur(p.discountEUR) : "—"}</td>
                        <td className="px-2 py-2 print:hidden">
                          <details
                            className="relative"
                            open={openMenuId === p.id}
                            onToggle={(e) => setOpenMenuId((e.target as HTMLDetailsElement).open ? p.id : null)}
                          >
                            <summary className="cursor-pointer list-none rounded-lg border border-surface-border px-2 py-1 text-xs text-zinc-300 marker:content-none [&::-webkit-details-marker]:hidden">
                              <span className="inline-flex items-center gap-1">
                                Menu <ChevronDown className="h-3 w-3" />
                              </span>
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-xl border border-surface-border bg-[#12171c] py-1 shadow-xl">
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                                onClick={() => {
                                  setEditRow(p);
                                  setOpenMenuId(null);
                                }}
                              >
                                Editar linha
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-emerald-200/90 hover:bg-white/5"
                                onClick={() => {
                                  markPaymentPaid(p.id);
                                  setOpenMenuId(null);
                                }}
                              >
                                Marcar como pago
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs hover:bg-white/5"
                                onClick={() => {
                                  updatePayment(p.id, { status: "pendente" });
                                  setOpenMenuId(null);
                                }}
                              >
                                Marcar pendente
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs hover:bg-white/5"
                                onClick={() => {
                                  updatePayment(p.id, { status: "atrasado" });
                                  setOpenMenuId(null);
                                }}
                              >
                                Marcar em atraso
                              </button>
                              <Link
                                href="/app/president/jogadores"
                                className="block px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                                onClick={() => setOpenMenuId(null)}
                              >
                                Ver plantel
                              </Link>
                              {contactHref(p.familyContact) ? (
                                <a
                                  href={contactHref(p.familyContact)!}
                                  className="block px-3 py-2 text-xs text-amber-200/90 hover:bg-white/5"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  Contactar família
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/5"
                                onClick={() => {
                                  archiveFinancePayment(p.id);
                                  setOpenMenuId(null);
                                }}
                              >
                                Arquivar (sai da lista activa)
                              </button>
                              <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-xs text-red-300/90 hover:bg-white/5"
                                onClick={() => {
                                  if (confirm("Remover esta linha de finanças? O jogador mantém-se no plantel.")) removePayment(p.id);
                                  setOpenMenuId(null);
                                }}
                              >
                                Apagar linha de finanças
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden print:hidden">
              {filteredRows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMobileOpen((x) => (x === p.id ? null : p.id))}
                  className="flex w-full flex-col gap-2 rounded-2xl border border-surface-border bg-[#0a0d10]/80 p-4 text-left transition-colors hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{p.playerName}</p>
                      <p className="text-xs text-zinc-500">{p.team || "—"}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Valor</span>
                    <span className="tabular-nums font-medium text-zinc-200">{eur(paymentEffectiveEUR(p))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Vencimento</span>
                    <span className="tabular-nums text-zinc-400">{p.dueDate || "—"}</span>
                  </div>
                  {mobileOpen === p.id ? (
                    <div className="mt-2 space-y-2 border-t border-surface-border pt-3 text-xs text-zinc-400">
                      <p>Família: {p.familyContact || "—"}</p>
                      <p>Jogador: {p.personalContact || "—"}</p>
                      <p>Último pago: {p.lastPaidAt || "—"}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setEditRow(p)}>
                          Editar
                        </Button>
                        <Button type="button" size="sm" onClick={() => markPaymentPaid(p.id)}>
                          Marcar pago
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-600">Toca para ver mais</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 print:hidden">
          <Card className="border-surface-border bg-surface-raised/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Próximos vencimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {upcoming.length === 0 ? (
                <p className="text-zinc-500">Nada agendado.</p>
              ) : (
                upcoming.map((p) => (
                  <div key={p.id} className="flex justify-between gap-2 rounded-lg border border-surface-border/60 px-2 py-2">
                    <span className="truncate text-zinc-300">{p.playerName}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">{p.dueDate}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-surface-border bg-surface-raised/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Pagos recentemente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {recentPaid.length === 0 ? (
                <p className="text-zinc-500">Sem registos recentes.</p>
              ) : (
                recentPaid.map((p) => (
                  <div key={p.id} className="flex justify-between gap-2 rounded-lg border border-emerald-500/15 px-2 py-2">
                    <span className="truncate text-zinc-300">{p.playerName}</span>
                    <span className="shrink-0 text-emerald-200/80">{p.lastPaidAt}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-surface-border bg-surface-raised/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Maiores atrasos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {biggestOverdue.length === 0 ? (
                <p className="text-zinc-500">Sem atrasos.</p>
              ) : (
                biggestOverdue.map((p) => (
                  <div key={p.id} className="flex justify-between gap-2 rounded-lg border border-red-500/15 px-2 py-2">
                    <span className="truncate text-zinc-300">{p.playerName}</span>
                    <span className="shrink-0 tabular-nums text-red-200/90">{eur(paymentEffectiveEUR(p))}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-surface-border bg-surface-raised/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Previsão do mês</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              <p className="tabular-nums text-lg font-semibold text-white">{eur(kpis.expectedThisMonth)}</p>
              <p className="mt-1 text-xs">Soma das quotas com vencimento em {ymPrefix}.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {editRow ? (
        <EditPaymentModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSave={(patch) => {
            updatePayment(editRow.id, patch);
            setEditRow(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EditPaymentModal({
  row,
  onClose,
  onSave,
}: {
  row: PresidentPayment;
  onClose: () => void;
  onSave: (patch: Partial<PresidentPayment>) => void;
}) {
  const [team, setTeam] = useState(row.team);
  const [family, setFamily] = useState(row.familyContact);
  const [personal, setPersonal] = useState(row.personalContact);
  const [due, setDue] = useState(row.dueDate || defaultQuotaDueDate());
  const [amount, setAmount] = useState(String(row.amountEUR));
  const [discount, setDiscount] = useState(String(row.discountEUR));
  const [note, setNote] = useState(row.note);
  const [method, setMethod] = useState<PresidentPaymentMethod>(row.paymentMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose} role="presentation">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-[#0c1014] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 className="font-display text-lg font-semibold text-white">Editar — {row.playerName}</h3>
        <div className="mt-4 grid gap-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Equipa / escalão</span>
            <Input value={team} onChange={(e) => setTeam(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Contacto família</span>
            <Input value={family} onChange={(e) => setFamily(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Contacto jogador</span>
            <Input value={personal} onChange={(e) => setPersonal(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Vencimento</span>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Valor (€)</span>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Desconto (€)</span>
              <Input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" />
            </label>
          </div>
          <p className="text-[11px] text-zinc-600">
            Para marcar como pago (com avanço automático do vencimento e movimento de receita), usa o menu da linha —
            «Marcar como pago».
          </p>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Método de pagamento</span>
            <select
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as PresidentPaymentMethod)}
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PresidentPaymentMethod[]).map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_METHOD_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Nota</span>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              const n = Number(amount.replace(",", "."));
              const d = Number(discount.replace(",", "."));
              onSave({
                team,
                familyContact: family,
                personalContact: personal,
                dueDate: due,
                amountEUR: Number.isFinite(n) ? n : 0,
                discountEUR: Number.isFinite(d) ? Math.max(0, d) : 0,
                note,
                paymentMethod: method,
              });
            }}
          >
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
