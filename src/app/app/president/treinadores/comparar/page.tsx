"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import type { PresidentCoach } from "@/types/president-club";

const rows: { key: keyof PresidentCoach; label: string }[] = [
  { key: "birthDate", label: "Data de nascimento" },
  { key: "role", label: "Função" },
  { key: "team", label: "Equipa" },
  { key: "winPct", label: "Vitórias %" },
  { key: "sessionsCreated", label: "Sessões" },
  { key: "activityLevel", label: "Atividade" },
  { key: "parentRating", label: "Avaliação pais" },
  { key: "internalRank", label: "Ranking interno" },
  { key: "contractStatus", label: "Contrato" },
];

function fmt(v: string | number | undefined) {
  if (v === "" || v == null) return "—";
  return String(v);
}

export default function PresidentTreinadoresCompararPage() {
  const { state } = usePresidentClub();
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");

  const coachA = state.coaches.find((c) => c.id === idA);
  const coachB = state.coaches.find((c) => c.id === idB);
  const canCompare = coachA && coachB && coachA.id !== coachB.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Comparar treinadores</h2>
          <p className="mt-1 text-sm text-zinc-500">Escolhe dois perfis registados para ver lado a lado.</p>
        </div>
        <Link
          href="/app/president/treinadores"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-5 text-sm font-medium text-zinc-100 transition-all hover:border-zinc-600 hover:bg-zinc-800/50"
        >
          Voltar à lista
        </Link>
      </div>

      {state.coaches.length < 2 ? (
        <Card className="border-surface-border bg-surface-raised/30">
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            Precisas de pelo menos dois treinadores na lista.{" "}
            <Link href="/app/president/treinadores" className="text-accent underline-offset-2 hover:underline">
              Adicionar treinadores
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-surface-border bg-surface-raised/30">
            <CardHeader>
              <CardTitle className="text-base text-white">Selecção</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Treinador A</span>
                <select
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                  value={idA}
                  onChange={(e) => setIdA(e.target.value)}
                >
                  <option value="">—</option>
                  {state.coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Treinador B</span>
                <select
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                  value={idB}
                  onChange={(e) => setIdB(e.target.value)}
                >
                  <option value="">—</option>
                  {state.coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </CardContent>
          </Card>

          {canCompare ? (
            <Card className="border-surface-border bg-surface-raised/30">
              <CardHeader>
                <CardTitle className="text-base text-white">Comparação</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-surface-border text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Campo</th>
                      <th className="px-4 py-2 font-medium">{coachA.name}</th>
                      <th className="px-4 py-2 font-medium">{coachB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ key, label }) => (
                      <tr key={key} className="border-b border-surface-border/50">
                        <td className="px-4 py-2 text-zinc-500">{label}</td>
                        <td className="px-4 py-2 text-zinc-300">{fmt(coachA[key] as string | number | undefined)}</td>
                        <td className="px-4 py-2 text-zinc-300">{fmt(coachB[key] as string | number | undefined)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Textos longos — A</h3>
                    <dl className="mt-2 space-y-3 text-sm text-zinc-400">
                      <div>
                        <dt className="text-zinc-500">Estatísticas</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachA.statsHistory || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Percurso</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachA.careerPath || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Troféus</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachA.trophies || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Textos longos — B</h3>
                    <dl className="mt-2 space-y-3 text-sm text-zinc-400">
                      <div>
                        <dt className="text-zinc-500">Estatísticas</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachB.statsHistory || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Percurso</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachB.careerPath || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Troféus</dt>
                        <dd className="mt-1 whitespace-pre-wrap">{coachB.trophies || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-sm text-zinc-500">Escolhe duas pessoas diferentes para ver a tabela.</p>
          )}
        </>
      )}
    </div>
  );
}
