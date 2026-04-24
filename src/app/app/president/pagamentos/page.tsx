"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentPayment } from "@/types/president-club";
import { defaultQuotaDueDate, emptyPaymentRow, paymentEffectiveEUR } from "@/lib/president-finance";

export default function PresidentPagamentosPage() {
  const { state, addPayment, updatePayment, removePayment } = usePresidentClub();
  const [playerName, setPlayerName] = useState("");
  const [familyContact, setFamilyContact] = useState("");
  const [status, setStatus] = useState<PresidentPayment["status"]>("pendente");
  const [amountEUR, setAmountEUR] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amountEUR.replace(",", "."));
    if (!playerName.trim() || !Number.isFinite(n) || n < 0) return;
    addPayment({
      ...emptyPaymentRow({ playerName: playerName.trim(), familyContact: familyContact.trim() }),
      status,
      amountEUR: n,
      dueDate: dueDate.trim() || defaultQuotaDueDate(),
      note: note.trim(),
    });
    setPlayerName("");
    setFamilyContact("");
    setAmountEUR("");
    setDueDate("");
    setNote("");
    setStatus("pendente");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Pagamentos</h2>
        <p className="mt-1 text-sm text-zinc-500">Quotas e mensalidades por jogador — altera o estado directamente na tabela.</p>
      </div>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Novo registo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">Jogador *</span>
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Estado inicial</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={status}
                onChange={(e) => setStatus(e.target.value as PresidentPayment["status"])}
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Contacto família</span>
              <Input value={familyContact} onChange={(e) => setFamilyContact(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Valor (€) *</span>
              <Input value={amountEUR} onChange={(e) => setAmountEUR(e.target.value)} inputMode="decimal" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Vencimento</span>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-3">
              <span className="text-xs text-zinc-500">Nota</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base text-white">Lista</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Jogador</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Venc.</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {state.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    Sem pagamentos.
                  </td>
                </tr>
              ) : (
                state.payments.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border/50">
                    <td className="px-4 py-2 font-medium text-zinc-200">{p.playerName}</td>
                    <td className="px-4 py-2 tabular-nums text-zinc-400">{paymentEffectiveEUR(p).toFixed(2)} €</td>
                    <td className="px-4 py-2 text-zinc-500">{p.dueDate || "—"}</td>
                    <td className="px-4 py-2">
                      <select
                        className="h-9 rounded-lg border border-surface-border bg-surface-raised/90 px-2 text-xs text-zinc-100"
                        value={p.status}
                        onChange={(e) => updatePayment(p.id, { status: e.target.value as PresidentPayment["status"] })}
                      >
                        <option value="pago">Pago</option>
                        <option value="pendente">Pendente</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Button type="button" variant="ghost" className="h-8 px-2 text-red-400" onClick={() => removePayment(p.id)}>
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
