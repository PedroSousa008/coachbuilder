"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PresidentBarChart } from "@/components/president/PresidentBarChart";
import { usePresidentClub } from "@/contexts/PresidentClubContext";

export default function PresidentFinancasPage() {
  const { state, addFinanceMovement, removeFinanceMovement, financeChart } = usePresidentClub();
  const [kind, setKind] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [amountEUR, setAmountEUR] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amountEUR.replace(",", "."));
    if (!category.trim() || !Number.isFinite(n) || n <= 0) return;
    addFinanceMovement({ kind, category: category.trim(), amountEUR: n, date, note: note.trim() });
    setCategory("");
    setAmountEUR("");
    setNote("");
  };

  const netBars = financeChart.income.map((d, i) => ({
    label: d.label.slice(5),
    value: d.value - financeChart.expense[i].value,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Finanças</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Regista receitas e despesas com data (YYYY-MM-DD). O painel executivo usa o mês da data para totais.
        </p>
      </div>

      <PresidentBarChart
        title="Saldo mensal (últimos 6 meses)"
        subtitle="Receita − despesa por mês da data do movimento."
        data={state.financeMovements.length ? netBars : []}
        emptyMessage="Sem movimentos. Adiciona o primeiro abaixo."
      />

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo movimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Tipo</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={kind}
                onChange={(e) => setKind(e.target.value as "income" | "expense")}
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs text-zinc-500">Categoria *</span>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Quotas, relvado…" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Valor (€) *</span>
              <Input value={amountEUR} onChange={(e) => setAmountEUR(e.target.value)} inputMode="decimal" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Data *</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Nota</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="flex items-end">
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Movimentos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Nota</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {state.financeMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    Lista vazia.
                  </td>
                </tr>
              ) : (
                state.financeMovements.map((m) => (
                  <tr key={m.id} className="border-b border-surface-border/50">
                    <td className="px-4 py-2 text-zinc-300">{m.kind === "income" ? "Receita" : "Despesa"}</td>
                    <td className="px-4 py-2 text-zinc-400">{m.category}</td>
                    <td className="px-4 py-2 tabular-nums text-zinc-200">
                      {m.kind === "expense" ? "−" : "+"}
                      {m.amountEUR.toFixed(2)} €
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{m.date}</td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-zinc-500" title={m.note}>
                      {m.note || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Button type="button" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removeFinanceMovement(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
