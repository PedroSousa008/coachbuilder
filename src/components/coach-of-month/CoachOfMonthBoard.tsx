"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  defaultCoachOfMonthContent,
  normalizeCoachOfMonthContent,
  type CoachMonthWinner,
  type CoachOfMonthContent,
} from "@/lib/coach-of-month";

type CloudPayload = {
  ok?: boolean;
  payload?: unknown;
  updatedAt?: string | null;
  error?: string;
};

function nonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    if (v?.trim()) return v;
  }
  return "";
}

function WinnerCard({ winner }: { winner: CoachMonthWinner }) {
  const photo = nonEmpty(winner.photoUrl);
  return (
    <Card className="min-w-0 border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/95">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
            {winner.rankLabel || "#1"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{winner.ageGroup}</span>
        </div>
        <div className="mb-3 h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900/70">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={winner.coachName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">Sem foto</div>
          )}
        </div>
        <p className="truncate text-base font-semibold text-white">{winner.coachName || "Treinador"}</p>
        <div className="mt-1 flex items-center gap-2">
          {winner.clubLogoUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={winner.clubLogoUrl} alt="" className="h-5 w-5 rounded-full border border-white/10 object-cover" />
          ) : null}
          <p className="truncate text-sm text-zinc-400">{winner.clubName || "Clube"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsRow({ winner }: { winner: CoachMonthWinner }) {
  const photo = nonEmpty(winner.photoUrl);
  return (
    <article className="flex items-start gap-4 border-b border-white/10 py-4 last:border-b-0">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900/70">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={winner.coachName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">Foto</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {winner.coachName} · {winner.ageGroup} · {winner.clubName}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{winner.news}</p>
      </div>
    </article>
  );
}

export function CoachOfMonthBoard({
  adminPreview,
  refetchKey = 0,
}: {
  adminPreview?: CoachOfMonthContent;
  /** Incrementar após guardar na BD para voltar a pedir o conteúdo público resolvido. */
  refetchKey?: number;
}) {
  const [content, setContent] = useState<CoachOfMonthContent>(adminPreview ?? defaultCoachOfMonthContent());
  const [loading, setLoading] = useState(!adminPreview);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (adminPreview) {
      setContent(normalizeCoachOfMonthContent(adminPreview));
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/cloud/coach-of-month", { credentials: "include" });
        const data = (await res.json()) as CloudPayload;
        if (cancelled) return;
        if (res.ok && data.ok) {
          setContent(normalizeCoachOfMonthContent(data.payload));
          setUpdatedAt(data.updatedAt ?? null);
          setError(null);
        } else {
          setError(data.error ?? "Não foi possível carregar este módulo.");
        }
      } catch {
        if (!cancelled) setError("Falha de rede ao carregar Treinador do Mês.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminPreview, refetchKey]);

  const winners = useMemo(() => content.winners.slice(0, 5), [content.winners]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/95 px-6 py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.10),transparent_55%)]" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/90" />
            Destaques do mês
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {content.headerTitle}
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">{content.headerSubtitle}</p>
          {updatedAt ? (
            <p className="mt-3 text-xs text-zinc-600">
              Última atualização: {new Date(updatedAt).toLocaleString("pt-PT")}
            </p>
          ) : null}
        </div>
      </section>

      {loading ? <p className="text-sm text-zinc-500">A carregar Treinador do Mês…</p> : null}
      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-300/90" />
          <h2 className="font-display text-lg font-semibold text-zinc-100">Top 5 treinadores</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {winners.map((winner) => (
            <WinnerCard key={winner.id} winner={winner} />
          ))}
        </div>
      </section>

      <section>
        <Card className="border-white/10 bg-zinc-950/80">
          <CardHeader className="border-white/10">
            <CardTitle className="text-lg text-zinc-100">Notícias dos premiados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {winners.map((winner) => (
              <NewsRow key={`news-${winner.id}`} winner={winner} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
