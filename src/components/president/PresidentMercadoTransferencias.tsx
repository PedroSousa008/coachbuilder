"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Filter,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { isClubPresident } from "@/lib/president-mode";
import type { CoachDirectoryRow } from "@/lib/president-coach-directory";
import { cn } from "@/lib/utils";

const PRESIDENT_MARKET_REFRESH_MS = 30_000;

function roleLabelPt(role: string): string {
  const m: Record<string, string> = {
    "head-coach": "Treinador principal",
    "club-president": "Presidente",
    "assistant-coach": "Treinador adjunto",
    "goalkeeper-coach": "Treinador de guarda-redes",
    "fitness-coach": "Preparador físico",
    "analyst": "Analista",
  };
  return m[role] ?? role;
}

function planLabelPt(plan: string): string {
  if (plan === "pro" || plan === "coach_pro") return "Pro";
  if (plan === "free") return "Free";
  return plan || "—";
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

function coachCurrentClub(c: CoachDirectoryRow): string {
  return c.club.trim();
}

function weekStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export function PresidentMercadoTransferencias() {
  const { user } = useAuth();
  const { coachProfile } = useAppData();
  const { state, addRecruitmentShortlistEntry, touchRecruitmentShortlistCoach } = usePresidentClub();

  const [coaches, setCoaches] = useState<CoachDirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CoachDirectoryRow | null>(null);

  const [q, setQ] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [region, setRegion] = useState("");
  const [statusF, setStatusF] = useState("");
  const [clubF, setClubF] = useState<"" | "any" | "sem" | "com" | "president">("any");
  const [expF, setExpF] = useState("");
  const [salaryF, setSalaryF] = useState("");

  const canCloud = Boolean(user && isClubPresident(user) && shouldUseCloudClientApis(user));

  const load = useCallback(async () => {
    if (!canCloud) {
      setCoaches([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloud/president/coach-directory", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; coaches?: CoachDirectoryRow[]; error?: string };
      if (!res.ok || !data.ok || !Array.isArray(data.coaches)) {
        setCoaches([]);
        setError(typeof data.error === "string" ? data.error : "Não foi possível carregar o mercado.");
        return;
      }
      setCoaches(data.coaches);
    } catch {
      setCoaches([]);
      setError("Erro de rede ao carregar treinadores.");
    } finally {
      setLoading(false);
    }
  }, [canCloud]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canCloud) return;
    const id = window.setInterval(() => {
      void load();
    }, PRESIDENT_MARKET_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [canCloud, load]);

  useEffect(() => {
    if (!canCloud) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    const onFocus = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [canCloud, load]);

  const myRegionToken = useMemo(() => {
    const loc = (coachProfile.location ?? "").trim();
    if (!loc) return "";
    return norm(loc.split(",")[0] ?? "");
  }, [coachProfile.location]);

  const regions = useMemo(() => {
    const s = new Set<string>();
    for (const c of coaches) {
      const t = c.location.trim();
      if (t) s.add(t);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt"));
  }, [coaches]);

  const weekIso = weekStartIso();

  const kpis = useMemo(() => {
    const total = coaches.length;
    const newWeek = coaches.filter((c) => c.createdAt >= weekIso).length;
    const near =
      myRegionToken.length > 0
        ? coaches.filter((c) => norm(c.location).includes(myRegionToken)).length
        : 0;
    const rated = coaches.filter((c) => c.matchesWithResult >= 3);
    const bestWin =
      rated.length > 0 ? Math.max(...rated.map((c) => c.winPct)) : null;
    const saved = state.recruitmentShortlist.length;
    return { total, newWeek, near, bestWin, saved };
  }, [coaches, myRegionToken, state.recruitmentShortlist.length, weekIso]);

  const filtered = useMemo(() => {
    const qq = norm(q);
    return coaches.filter((c) => {
      if (qq) {
        const blob = [
          c.name,
          c.profileName,
          c.email,
          c.role,
          c.teamHistory,
          c.ageGroupCoached,
          String(c.winPct),
          c.coachingRole,
          c.bio,
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(qq)) return false;
      }
      if (ageMax.trim()) {
        const n = parseInt(ageMax, 10);
        if (Number.isFinite(n) && c.age != null && c.age > n) return false;
      }
      if (region.trim() && norm(c.location) !== norm(region)) return false;
      if (statusF.trim() && !c.recruitmentStatusLabel.toLowerCase().includes(statusF.toLowerCase())) return false;
      const currentClub = coachCurrentClub(c);
      if (clubF === "sem" && currentClub) return false;
      if (clubF === "com" && !currentClub) return false;
      if (clubF === "president" && !c.linkedToPresident) return false;
      if (expF.trim() && c.experienceLevelLabel !== expF) return false;
      if (salaryF.trim() && !c.salaryExpectationNote.toLowerCase().includes(salaryF.toLowerCase())) return false;
      return true;
    });
  }, [coaches, q, ageMax, region, statusF, clubF, expF, salaryF]);

  const shortlistByUserId = useMemo(() => {
    const m = new Map<string, (typeof state.recruitmentShortlist)[0]>();
    for (const s of state.recruitmentShortlist) m.set(s.coachUserId, s);
    return m;
  }, [state.recruitmentShortlist]);

  const topWinBars = useMemo(() => {
    return [...filtered]
      .filter((c) => c.matchesWithResult >= 1)
      .sort((a, b) => b.winPct - a.winPct)
      .slice(0, 5);
  }, [filtered]);

  const openProfile = (c: CoachDirectoryRow) => {
    setSelected(c);
    if (shortlistByUserId.has(c.userId)) {
      touchRecruitmentShortlistCoach(c.userId);
    }
  };

  const saveTarget = (c: CoachDirectoryRow) => {
    addRecruitmentShortlistEntry({
      coachUserId: c.userId,
      coachEmail: c.email,
      coachName: c.profileName || c.name,
      priority: "media",
      roleNeed: c.role || "",
      contactStatus: "sem_contacto",
      notes: "",
      lastViewedAt: new Date().toISOString(),
      internalRating: 0,
      compareWithCoachIds: [],
      isPriorityTarget: false,
    });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Mercado de Transferências</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Descobre treinadores disponíveis na CoachBuilder, avalia perfis com dados e recruta de forma mais rápida e
            informada. Lista completa de todas as contas registadas na aplicação (inclui subscrições, modo clube e
            presidentes).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/president/mercado-treinadores/shortlist"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised/40 px-3.5 text-sm font-medium text-zinc-300 transition-all hover:bg-white/5 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d10]"
            )}
          >
            <Target className="h-4 w-4" />
            Shortlist ({state.recruitmentShortlist.length})
          </Link>
          <Button type="button" size="sm" onClick={() => void load()} disabled={loading || !canCloud}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {!canCloud ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-6 text-sm text-amber-100/90">
            O diretório global de treinadores está disponível com a conta cloud activa e função Presidente. Sem cloud,
            não há listagem centralizada na base de dados.
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total na app" value={kpis.total} hint="Todas as contas CoachBuilder" icon={Users} />
        <StatCard label="Novos (7 dias)" value={kpis.newWeek} hint="Registos recentes" icon={Zap} />
        <StatCard
          label="Perto da tua região"
          value={myRegionToken ? kpis.near : "—"}
          hint={
            myRegionToken
              ? `Coincidência com «${(coachProfile.location ?? "").trim().split(",")[0]?.trim() || "região"}»`
              : "Define região no teu perfil"
          }
          icon={MapPin}
        />
        <StatCard
          label="Melhor % vitórias"
          value={kpis.bestWin != null ? `${kpis.bestWin}%` : "—"}
          hint="Treinadores com ≥3 jogos (tática)"
          icon={TrendingUp}
        />
        <StatCard label="Alvos guardados" value={kpis.saved} hint="Shortlist interna" icon={Target} />
      </div>

      <Card className="border-surface-border bg-surface-raised/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Search className="h-4 w-4 text-amber-400/90" strokeWidth={1.75} />
            Pesquisa e filtros
          </CardTitle>
          <p className="text-xs text-zinc-500">
            Pesquisa por nome, função, palmarés, % vitórias ou escalão. Combina com filtros avançados.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, email, função, histórico, escalão, vitórias…"
              className="h-12 border-surface-border bg-surface-raised/80 pl-11 text-base"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                <Filter className="h-3 w-3" /> Idade máx.
              </span>
              <Input inputMode="numeric" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="ex. 45" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Região</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Todas</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Estado (texto)</span>
              <Input value={statusF} onChange={(e) => setStatusF(e.target.value)} placeholder="Disponível, funções…" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Clube / situação</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={clubF}
                onChange={(e) => setClubF(e.target.value as typeof clubF)}
              >
                <option value="any">Todos</option>
                <option value="sem">Sem clube declarado</option>
                <option value="com">Com clube</option>
                <option value="president">Ligado a Presidente</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Experiência</span>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                value={expF}
                onChange={(e) => setExpF(e.target.value)}
              >
                <option value="">Todas</option>
                <option>A iniciar carreira</option>
                <option>Em progressão</option>
                <option>Intermédio</option>
                <option>Experiente</option>
                <option>Muito experiente</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Expectativa salarial (nota)</span>
              <Input value={salaryF} onChange={(e) => setSalaryF(e.target.value)} placeholder="Palavra-chave" />
            </label>
          </div>
          <p className="text-xs text-zinc-600">
            A mostrar <span className="tabular-nums text-zinc-400">{filtered.length}</span> de{" "}
            <span className="tabular-nums text-zinc-400">{coaches.length}</span> treinadores.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {loading && coaches.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" /> A carregar treinadores…
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((c) => {
              const onShort = shortlistByUserId.has(c.userId);
              return (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => openProfile(c)}
                  className={cn(
                    "group text-left rounded-2xl border border-surface-border bg-gradient-to-b from-surface-raised/50 to-surface-raised/15 p-4 shadow-sm transition-all",
                    "hover:border-amber-500/25 hover:shadow-lg hover:shadow-black/20"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-surface-border bg-zinc-900">
                      {c.avatarDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500">
                          {(c.profileName || c.name).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white group-hover:text-amber-200/90">{c.profileName || c.name}</p>
                      <p className="truncate text-xs text-zinc-500">{roleLabelPt(c.coachingRole)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="muted" className="text-[10px]">
                          {planLabelPt(c.subscriptionPlan)}
                        </Badge>
                        {c.linkedToPresident ? (
                          <Badge className="border border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-200">Modo clube</Badge>
                        ) : null}
                        {onShort ? (
                          <Badge className="border border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-100">Na shortlist</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <span>{c.age != null ? `${c.age} anos` : "Idade —"}</span>
                    <span className="truncate text-right">{c.ageGroupCoached || "Escalão —"}</span>
                    <span className="col-span-2 truncate text-zinc-300">{c.recruitmentStatusLabel}</span>
                    <span className="col-span-2 truncate">Clube Atual (Perfil): {coachCurrentClub(c) || "Sem Clube"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-border/60 pt-3">
                    <span className="text-xs font-medium text-emerald-200/90">Score {c.performanceScore}</span>
                    <span className="text-xs text-zinc-500">{c.matchesWithResult >= 3 ? `${c.winPct}% vit.` : "— vit."}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100">
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 items-center rounded-lg border border-surface-border bg-surface-raised/50 px-3 text-[11px] font-medium text-zinc-200 transition-colors hover:border-amber-500/30 hover:text-white"
                    >
                      Contactar
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onShort) saveTarget(c);
                      }}
                      disabled={onShort}
                    >
                      {onShort ? "Já guardado" : "Guardar alvo"}
                    </Button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-surface-border bg-surface-raised/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Top % vitórias</CardTitle>
              <p className="text-[11px] text-zinc-500">Barras relativas ao melhor da lista filtrada.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {topWinBars.length === 0 ? (
                <p className="text-xs text-zinc-500">Sem dados de jogos com tática.</p>
              ) : (
                (() => {
                  const max = Math.max(...topWinBars.map((x) => x.winPct), 1);
                  return topWinBars.map((c) => (
                    <div key={c.userId}>
                      <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                        <span className="truncate pr-2">{c.profileName || c.name}</span>
                        <span className="shrink-0 tabular-nums">{c.winPct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-600/80 to-amber-400/90"
                          style={{ width: `${(c.winPct / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()
              )}
            </CardContent>
          </Card>
          <Card className="border-surface-border bg-surface-raised/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Recrutamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-zinc-400">
              <p>
                Na shortlist podes definir prioridade, notas internas, avaliação 1–10 e estado de contacto. Compara com
                os teus treinadores em{" "}
                <Link href="/app/president/treinadores/comparar" className="text-amber-400/90 underline-offset-2 hover:underline">
                  Comparar treinadores
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-surface-border bg-[#0c1014] p-6 shadow-2xl sm:rounded-2xl"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-surface-border bg-zinc-900">
                {selected.avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.avatarDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                    {(selected.profileName || selected.name).slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-white">{selected.profileName || selected.name}</h3>
                <p className="text-sm text-zinc-400">{selected.role || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="muted">{planLabelPt(selected.subscriptionPlan)}</Badge>
                  <Badge variant="muted">{roleLabelPt(selected.coachingRole)}</Badge>
                </div>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Idade</dt>
                <dd className="text-right text-zinc-200">{selected.age != null ? `${selected.age} anos` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Escalão</dt>
                <dd className="text-right text-zinc-200">{selected.ageGroupCoached || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Estado</dt>
                <dd className="text-right text-zinc-200">{selected.recruitmentStatusLabel}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Clube Atual (Perfil)</dt>
                <dd className="text-right text-zinc-200">{coachCurrentClub(selected) || "Sem Clube"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Região</dt>
                <dd className="text-right text-zinc-200">{selected.location || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Score CoachBuilder</dt>
                <dd className="text-right font-medium text-emerald-200/90">{selected.performanceScore}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Vitórias %</dt>
                <dd className="text-right tabular-nums text-zinc-200">
                  {selected.matchesWithResult >= 3 ? `${selected.winPct}%` : "— (mín. 3 jogos)"}
                </dd>
              </div>
              <div className="border-b border-surface-border/50 pb-2">
                <dt className="text-zinc-500">Histórico</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-300">{selected.teamHistory || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Bio</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-300">{selected.bio || "—"}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={`mailto:${selected.email}`}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3.5 text-sm font-medium text-zinc-100 transition-all hover:border-zinc-600 hover:bg-zinc-800/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d10]"
                )}
              >
                <Mail className="h-4 w-4" />
                Email de login
              </a>
              <Button
                type="button"
                onClick={() => {
                  if (!shortlistByUserId.has(selected.userId)) saveTarget(selected);
                  setSelected(null);
                }}
                disabled={shortlistByUserId.has(selected.userId)}
              >
                <Star className="mr-2 h-4 w-4" />
                {shortlistByUserId.has(selected.userId) ? "Já na shortlist" : "Guardar alvo"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Fechar
              </Button>
              <Link
                href="/app/president/mercado-treinadores/shortlist"
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1 rounded-xl px-3.5 text-sm font-medium text-zinc-300 transition-all hover:bg-white/5 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d10]"
                )}
              >
                Shortlist <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
