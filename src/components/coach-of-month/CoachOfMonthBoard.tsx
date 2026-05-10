"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  COACH_MONTH_ARCHIVE_TABLE_HEADERS,
  defaultCoachOfMonthContent,
  normalizeCoachOfMonthContent,
  type CoachMonthWinner,
  type CoachOfMonthContent,
} from "@/lib/coach-of-month";
import { readCoachOfMonthClientCache, writeCoachOfMonthClientCache } from "@/lib/coach-of-month-client-cache";

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
        {winner.nametag?.trim() ? (
          <p className="truncate text-xs font-medium text-amber-200/80">@{winner.nametag.trim()}</p>
        ) : null}
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
          {winner.coachName}
          {winner.nametag?.trim() ? ` · @${winner.nametag.trim()}` : ""} · {winner.ageGroup} · {winner.clubName}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{winner.news}</p>
      </div>
    </article>
  );
}

function cellShow(v: string): string {
  return v.trim() || "—";
}

const ARCHIVE_AGE_HEADERS = COACH_MONTH_ARCHIVE_TABLE_HEADERS.filter((h) => h.key !== "monthLabel");

export function CoachOfMonthBoard({
  adminPreview,
  refetchKey = 0,
}: {
  adminPreview?: CoachOfMonthContent;
  /** Incrementar após guardar na BD para voltar a pedir o conteúdo público resolvido. */
  refetchKey?: number;
}) {
  const [content, setContent] = useState<CoachOfMonthContent>(() =>
    adminPreview ? normalizeCoachOfMonthContent(adminPreview) : defaultCoachOfMonthContent()
  );
  const [loading, setLoading] = useState(!adminPreview);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const fetchGenRef = useRef(0);

  /** Cache antes do primeiro paint (evita flash de placeholders). */
  useLayoutEffect(() => {
    if (adminPreview) return;
    const hit = readCoachOfMonthClientCache();
    if (!hit) return;
    setContent(normalizeCoachOfMonthContent(hit.payload));
    setUpdatedAt(hit.updatedAt);
    setLoading(false);
  }, [adminPreview]);

  useEffect(() => {
    if (adminPreview) {
      setContent(normalizeCoachOfMonthContent(adminPreview));
      setLoading(false);
      setError(null);
      return;
    }
    const ac = new AbortController();
    const myGen = ++fetchGenRef.current;
    const hadCache = Boolean(readCoachOfMonthClientCache());
    const silent = hadCache || refetchKey > 0;
    void (async () => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/cloud/coach-of-month", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const data = (await res.json()) as CloudPayload;
        if (myGen !== fetchGenRef.current) return;
        if (res.ok && data.ok) {
          const next = normalizeCoachOfMonthContent(data.payload);
          setContent(next);
          setUpdatedAt(data.updatedAt ?? null);
          setError(null);
          writeCoachOfMonthClientCache(data.payload, data.updatedAt ?? null);
        } else {
          if (!hadCache) setError(data.error ?? "Não foi possível carregar este módulo.");
        }
      } catch (e) {
        if (myGen !== fetchGenRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!hadCache) setError("Falha de rede ao carregar Treinador do Mês.");
      } finally {
        if (myGen === fetchGenRef.current) setLoading(false);
      }
    })();
    return () => ac.abort();
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

      <section>
        <Card className="border-white/10 bg-zinc-950/80">
          <CardHeader className="border-white/10">
            <CardTitle className="text-lg text-zinc-100">Histórico de vencedores</CardTitle>
            <p className="text-sm font-normal text-zinc-500">
              Vencedores por mês e escalão. A tabela é atualizada pelo administrador.
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-0">
            <div className="space-y-3 md:hidden">
              {content.winnersArchive.map((row, idx) => (
                <div
                  key={`archive-mobile-${idx}`}
                  className="rounded-xl border border-white/10 bg-zinc-900/35 px-4 py-3 shadow-sm"
                >
                  <p className="text-xs font-medium text-zinc-500">Mês</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-100">{cellShow(row.monthLabel)}</p>
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ARCHIVE_AGE_HEADERS.map((h) => (
                      <div key={h.key} className="min-w-0">
                        <dt className="text-xs font-medium text-zinc-500">{h.label}</dt>
                        <dd className="mt-0.5 break-words text-sm text-zinc-200">{cellShow(row[h.key])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            <div
              className="hidden md:block md:overflow-x-auto"
              role="region"
              aria-label="Tabela histórico de vencedores"
            >
              <table className="w-full min-w-[600px] table-fixed border-collapse text-left text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[15.5%]" />
                  <col className="w-[15.5%]" />
                  <col className="w-[15.5%]" />
                  <col className="w-[15.5%]" />
                  <col className="w-[15.5%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-900/50">
                    {COACH_MONTH_ARCHIVE_TABLE_HEADERS.map((h) => (
                      <th
                        key={h.key}
                        scope="col"
                        className="px-3 py-3 text-left text-[11px] font-semibold leading-snug text-zinc-400"
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {content.winnersArchive.map((row, idx) => (
                    <tr key={`archive-${idx}`} className="border-b border-white/10 last:border-0">
                      {COACH_MONTH_ARCHIVE_TABLE_HEADERS.map((h) => (
                        <td key={h.key} className="min-w-0 break-words px-3 py-3 align-top text-zinc-200">
                          {cellShow(row[h.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
