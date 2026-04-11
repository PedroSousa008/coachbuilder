"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Stats = {
  generatedAt: string;
  usersOnlineNow: number;
  onlineApprox5Min: number;
  distinctActiveLastHour: number;
  distinctActiveLast24h: number;
  distinctActiveLast7d: number;
  signupsToday: number;
  totalRegisteredUsers: number;
  totalCoachesRegistered: number;
  adminUsers: number;
  coachesWithActivePro: number;
  proMonthlyUsersAll: number;
  freePlanUsers: number;
  estimatedMonthlyRevenueEur: number;
  proPriceEur: number;
  cancellationsRecentCount: number;
  cancellationsTracked: boolean;
  activeTrialsCount: number;
  trialsSupported: boolean;
  totalLoginEvents: number;
  loginsLast24h: number;
  loginsLastHour: number;
  signupsTotal: number;
};

type ListedUser = {
  id: string;
  email: string;
  name: string;
  coachingRole: string;
  role: string;
  subscriptionPlan: string;
  subscriptionRenewsAt: string | null;
  lastSeenAt: string | null;
  loginCount: number;
  createdAt: string;
};

const REFRESH_MS = 45_000;

export function AdminPanel() {
  const { user, authReady, refreshUserFromCloud } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sRes, uRes] = await Promise.all([
        fetch("/api/cloud/admin/stats", { credentials: "include" }),
        fetch("/api/cloud/admin/users", { credentials: "include" }),
      ]);
      const sJson = (await sRes.json()) as { ok?: boolean; stats?: Stats; error?: string };
      const uJson = (await uRes.json()) as { ok?: boolean; users?: ListedUser[]; error?: string };
      if (!sRes.ok || !sJson.ok || !sJson.stats) {
        setError(sJson.error || "Sem permissão ou cloud inativa.");
        setStats(null);
      } else {
        setStats(sJson.stats);
      }
      if (uRes.ok && uJson.ok && uJson.users) {
        setUsers(uJson.users);
        const d: Record<string, string> = {};
        for (const u of uJson.users) d[u.id] = u.subscriptionPlan;
        setPlanDraft(d);
      }
    } catch {
      setError("Erro de rede ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const allowed =
      user?.role === "admin" || (user?.email ? clientEmailShowsAdminNav(user.email) : false);
    if (!allowed) {
      router.replace("/app");
      return;
    }

    void (async () => {
      if (user?.role !== "admin" && user?.email && clientEmailShowsAdminNav(user.email)) {
        await fetch("/api/cloud/auth/sync-admin-role", { method: "POST", credentials: "include" });
        await refreshUserFromCloud();
      }
      await load();
    })();
  }, [authReady, user?.role, user?.email, router, load, refreshUserFromCloud]);

  useEffect(() => {
    if (!stats) return;
    const t = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [stats, load]);

  const savePlan = async (id: string) => {
    const subscriptionPlan = planDraft[id];
    if (!subscriptionPlan) return;
    const res = await fetch(`/api/cloud/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionPlan }),
    });
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setError(j.error || "Não foi possível atualizar o plano.");
      return;
    }
    void load();
  };

  if (!authReady || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">A carregar painel…</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Visão geral em tempo real (atualiza ~45s). Métricas MVP até integrares billing real (Stripe, etc.).
          </p>
          {user?.role !== "admin" && user?.email && clientEmailShowsAdminNav(user.email) ? (
            <p className="mt-2 text-xs text-amber-200/90">
              A sincronizar o teu perfil de administrador com o servidor… Se os dados não aparecerem, vai a Settings →
              &quot;Atualizar sessão com o servidor&quot;.
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" className="shrink-0 text-xs" onClick={() => void load()}>
          Atualizar agora
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      {stats ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-white">
                Visão geral do negócio
              </h2>
              <p className="text-xs text-zinc-500">
                Dados gerados: {new Date(stats.generatedAt).toLocaleString("pt-PT")} · UTC nos registos “hoje”
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Online agora"
                value={stats.usersOnlineNow}
                hint="Última atividade ≤ 2 min (sessão + heartbeat)"
                accent
              />
              <StatCard
                title="Ativos última hora"
                value={stats.distinctActiveLastHour}
                hint="Contas únicas com eventos na plataforma"
              />
              <StatCard
                title="Ativos últimas 24 h"
                value={stats.distinctActiveLast24h}
                hint="Contas únicas (eventos)"
              />
              <StatCard
                title="Ativos últimos 7 dias"
                value={stats.distinctActiveLast7d}
                hint="Contas únicas (eventos)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <StatCard title="Novos registos hoje" value={stats.signupsToday} hint="Contas criadas (UTC)" />
              <StatCard
                title="Total de coaches"
                value={stats.totalCoachesRegistered}
                hint="Utilizadores não-admin"
              />
              <StatCard
                title="Subscrição Pro ativa"
                value={stats.coachesWithActivePro}
                hint="Pro mensal sem data de fim ou renovação ≥ hoje"
              />
              <StatCard title="Utilizadores grátis" value={stats.freePlanUsers} hint="Plano free (não admin)" />
              <StatCardEuro
                title="Receita mensal estimada"
                amount={stats.estimatedMonthlyRevenueEur}
                hint={`${stats.coachesWithActivePro} × ${stats.proPriceEur} € (ADMIN_PRO_MONTHLY_PRICE_EUR; sem Stripe)`}
              />
              <StatCard
                title="Cancelamentos recentes"
                value={stats.cancellationsTracked ? stats.cancellationsRecentCount : "—"}
                hint={
                  stats.cancellationsTracked
                    ? "Últimos 30 dias (quando existir modelo)"
                    : "Não rastreado — integra billing para registar churn"
                }
              />
              <StatCard
                title="Trials ativos"
                value={stats.trialsSupported ? stats.activeTrialsCount : "—"}
                hint={
                  stats.trialsSupported
                    ? "Contas em período experimental"
                    : "Ainda não implementado — quando existir trial, aparece aqui"
                }
              />
              <StatCard
                title="Total na plataforma"
                value={stats.totalRegisteredUsers}
                hint={`Inclui ${stats.adminUsers} admin`}
              />
            </div>

            <details className="rounded-xl border border-surface-border bg-surface-raised/20 px-4 py-3 text-sm text-zinc-400">
              <summary className="cursor-pointer font-medium text-zinc-300">Métricas técnicas extra</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Online (≈5 min)" value={stats.onlineApprox5Min} hint="lastSeenAt" />
                <StatCard title="Pro (marcados)" value={stats.proMonthlyUsersAll} hint="Todos com plano pro_monthly" />
                <StatCard title="Logins (total)" value={stats.totalLoginEvents} />
                <StatCard title="Logins última hora" value={stats.loginsLastHour} />
                <StatCard title="Logins últimas 24 h" value={stats.loginsLast24h} />
                <StatCard title="Registos (eventos total)" value={stats.signupsTotal} hint="signup + migração" />
              </div>
            </details>
          </section>
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Utilizadores</CardTitle>
          <Button type="button" variant="secondary" className="text-xs" onClick={() => void load()}>
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Logins</th>
                <th className="px-4 py-3">Última atividade</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-surface-border/60">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{u.email}</td>
                  <td className="px-4 py-3 text-zinc-300">{u.name}</td>
                  <td className="px-4 py-3">{u.role === "admin" ? "Admin" : "Utilizador"}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="text-zinc-500">—</span>
                    ) : (
                      <select
                        value={planDraft[u.id] ?? u.subscriptionPlan}
                        onChange={(e) => setPlanDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                        className="rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="free">Grátis</option>
                        <option value="pro_monthly">Pro mensal</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.loginCount}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString("pt-PT") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(u.createdAt).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" ? (
                      <Button
                        type="button"
                        className="text-xs"
                        onClick={() => void savePlan(u.id)}
                        disabled={(planDraft[u.id] ?? u.subscriptionPlan) === u.subscriptionPlan}
                      >
                        Guardar plano
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p className="px-4 py-6 text-center text-sm text-zinc-500">Sem utilizadores.</p> : null}
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-600">
        <strong className="text-zinc-500">Nota legal:</strong> em produção deves ter política de privacidade e base de
        tratamento (RGPD) alinhada com os dados que guardas. Pagamentos reais exigem integração (ex. Stripe) e
        faturação.
      </p>

      <Link href="/app" className="inline-block text-sm text-accent hover:underline">
        ← Voltar à app
      </Link>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        accent ? "border-emerald-500/25 bg-emerald-500/[0.06] ring-1 ring-emerald-500/15" : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatCardEuro({ title, amount, hint }: { title: string; amount: number; hint?: string }) {
  const formatted = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold text-amber-200/95">{formatted}</p>
      </CardContent>
    </Card>
  );
}
