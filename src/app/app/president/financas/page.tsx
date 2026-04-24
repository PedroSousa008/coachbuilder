"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PresidentFinancasDashboard } from "@/components/president/PresidentFinancasDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";

export default function PresidentFinancasPage() {
  const { state, addFinanceMovement, removeFinanceMovement } = usePresidentClub();
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

  const netBars = state.financeMovements.length
    ? (() => {
        const labels = [...new Set(state.financeMovements.map((m) => m.date.slice(0, 7)))].sort().slice(-6);
        return labels.map((ym) => {
          const inc = state.financeMovements
            .filter((m) => m.kind === "income" && m.date.startsWith(ym))
            .reduce((s, m) => s + m.amountEUR, 0);
          const exp = state.financeMovements
            .filter((m) => m.kind === "expense" && m.date.startsWith(ym))
            .reduce((s, m) => s + m.amountEUR, 0);
          return { label: ym.slice(5), value: inc - exp };
        });
      })()
    : [];

  return (
    <div className="space-y-10">
      <PresidentFinancasDashboard />

      <details className="mx-auto max-w-[1600px] rounded-2xl border border-surface-border bg-surface-raised/15 print:hidden">
        <summary className="cursor-pointer list-none px-5 py-4 font-medium text-zinc-300 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm">Outros movimentos financeiros (receitas / despesas gerais)</span>
          <span className="ml-2 text-xs text-zinc-600">— opcional, alimenta gráficos do painel</span>
        </summary>
        <div className="border-t border-surface-border/60 px-5 pb-6 pt-2">
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card className="border-surface-border bg-surface-raised/30">
              <CardHeader>
                <CardTitle className="text-base text-white">Saldo por mês (últimos registos)</CardTitle>
              </CardHeader>
              <CardContent>
                {netBars.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sem movimentos gerais.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {netBars.map((b) => (
                      <li key={b.label} className="flex justify-between tabular-nums">
                        <span>{b.label}</span>
                        <span className={b.value >= 0 ? "text-emerald-300/90" : "text-red-300/80"}>
                          {b.value >= 0 ? "+" : ""}
                          {b.value.toFixed(0)} €
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-surface-border bg-surface-raised/30">
              <CardHeader>
                <CardTitle className="text-base text-white">Novo movimento geral</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
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
                  <label className="space-y-1">
                    <span className="text-xs text-zinc-500">Categoria *</span>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Relvado, equipamento…" />
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
                  <Button type="submit">Adicionar movimento</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="border-surface-border bg-surface-raised/30">
            <CardHeader>
              <CardTitle className="text-base text-white">Lista de movimentos</CardTitle>
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
                    <th className="w-16 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {state.financeMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                        Sem movimentos.
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
      </details>
    </div>
  );
}
