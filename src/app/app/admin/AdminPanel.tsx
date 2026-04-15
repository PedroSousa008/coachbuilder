"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

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
  gracePeriodUsers?: number;
  totalLoginEvents: number;
  loginsLast24h: number;
  loginsLastHour: number;
  signupsTotal: number;
};

type ListedUser = {
  id: string;
  email: string;
  name: string;
  nametag: string | null;
  coachingRole: string;
  role: string;
  subscriptionPlan: string;
  subscriptionRenewsAt: string | null;
  proTrialEndsAt?: string | null;
  paymentGraceEndsAt?: string | null;
  lastPaymentFailedAt?: string | null;
  customMonthlyPriceEur?: unknown;
  lastSeenAt: string | null;
  loginCount: number;
  createdAt: string;
};

type OnlineUserRow = {
  id: string;
  email: string;
  name: string;
  coachingRole: string;
  role: string;
  subscriptionPlan: string;
  lastSeenAt: string | null;
  lastRoute: string | null;
  clubTeamLabel: string | null;
};

type OnlinePayload = {
  ok?: boolean;
  onlineWindowSeconds?: number;
  generatedAt?: string;
  count?: number;
  users?: OnlineUserRow[];
  error?: string;
};

type RevenueSubscriber = {
  id: string;
  email: string;
  name: string;
  subscriptionPlan: string;
  subscriptionRenewsAt: string | null;
  createdAt: string;
  status: "ativo" | "gratuito" | "em_atraso";
  totalLifetimePaidEur: number | null;
};

type RevenuePayload = {
  ok?: boolean;
  error?: string;
  generatedAt?: string;
  cashRevenueTracked?: boolean;
  paymentsIntegrated?: boolean;
  overview?: {
    mrrEur: number;
    proPriceEur: number;
    revenueTodayEur: number | null;
    revenueWeekEur: number | null;
    revenueMonthEur: number | null;
    activeSubscriptionsCount: number;
    freeToPaidConversionPct: number;
    freeToPaidConversionNote?: string;
    newCoachesLast7d: number;
    newCoachesPrev7d: number;
    newCoachesGrowthVsPrevWeekPct: number;
    mrrGrowthVsPreviousTracked: boolean;
    mrrGrowthVsPreviousPct: number | null;
  };
  payments?: {
    receivedTodayEur: number;
    pendingCount: number;
    failedCount: number;
    atRiskEur: number;
  };
  subscribers?: RevenueSubscriber[];
};

type PersonalizationStatus = "requested" | "approved" | "declined";

type PersonalizationRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userSubscriptionPlan: string;
  status: PersonalizationStatus;
  requestedAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  scheduledFor: string | null;
  contactEmail: string;
  notesFromCoach: string | null;
  preferredDateNotes: string | null;
  adminNotes: string | null;
};

type PersonalizationPayload = {
  ok?: boolean;
  generatedAt?: string;
  rows?: PersonalizationRow[];
  error?: string;
};

type AdminTab = "overview" | "online" | "revenue" | "personalization";

const REFRESH_OVERVIEW_MS = 45_000;
const REFRESH_ONLINE_MS = 15_000;
const REFRESH_REVENUE_MS = 60_000;
const REFRESH_PERSONALIZATION_MS = 45_000;

function planLabel(plan: string): string {
  if (plan === "pro_monthly") return "Pro mensal";
  if (plan === "pro_trial") return "Pro trial";
  if (plan === "grace") return "Pagamento em falta";
  if (plan === "free") return "Grátis";
  return plan;
}

/** Rótulo legível para a zona da app (path reportado pelo heartbeat). */
function labelForAppPath(path: string | null | undefined): string {
  if (!path?.trim()) return "— (abre a app para atualizar)";
  const pairs: [string, string][] = [
    ["/app/admin/database", "Base de dados"],
    ["/app/admin", "Admin"],
    ["/app/calendar", "Calendário"],
    ["/app/profile", "Perfil"],
    ["/app/tactics", "Táticas"],
    ["/app/team", "Equipa"],
    ["/app/messages", "Mensagens"],
    ["/app/training", "Treinos"],
    ["/app/sketch", "Sketch Area"],
    ["/app/settings", "Definições"],
    ["/app", "Início"],
  ];
  for (const [prefix, label] of pairs) {
    if (path === prefix || path.startsWith(prefix + "/")) return label;
  }
  return path;
}

function formatEurValue(n: number | null | undefined, empty = "—"): string {
  if (n == null || Number.isNaN(n)) return empty;
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
}

function subscriberStatusLabel(s: RevenueSubscriber["status"]): string {
  if (s === "ativo") return "Ativo";
  if (s === "em_atraso") return "Em atraso";
  return "Gratuito";
}

function formatGrowthPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}%`;
}

function personalizationStatusLabel(s: PersonalizationStatus): string {
  if (s === "approved") return "Aprovado";
  if (s === "declined") return "Recusado";
  return "Pedido";
}

export function AdminPanel() {
  const { user, authReady, refreshUserFromCloud } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [online, setOnline] = useState<OnlinePayload | null>(null);
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null);
  const [personalization, setPersonalization] = useState<PersonalizationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});

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
        const pd: Record<string, string> = {};
        for (const u of uJson.users) {
          d[u.id] = u.subscriptionPlan;
          const raw = u.customMonthlyPriceEur;
          if (raw == null || raw === "") pd[u.id] = "";
          else pd[u.id] = typeof raw === "object" && raw !== null && "toString" in raw ? String(raw) : String(raw);
        }
        setPlanDraft(d);
        setPriceDraft(pd);
      }
    } catch {
      setError("Erro de rede ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOnline = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud/admin/online", { credentials: "include" });
      const j = (await res.json()) as OnlinePayload;
      if (res.ok && j.ok && j.count != null && j.users) {
        setOnline(j);
      }
    } catch {
      /* silencioso: separador online pode falhar sem bloquear resto */
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud/admin/revenue", { credentials: "include" });
      const j = (await res.json()) as RevenuePayload;
      if (res.ok && j.ok && j.subscribers && j.overview) {
        setRevenue(j);
        setPlanDraft((d) => {
          const next = { ...d };
          for (const s of j.subscribers!) {
            if (next[s.id] === undefined) next[s.id] = s.subscriptionPlan;
          }
          return next;
        });
      }
    } catch {
      /* ignorar */
    }
  }, []);

  const loadPersonalization = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud/admin/personalization", { credentials: "include" });
      const j = (await res.json()) as PersonalizationPayload;
      if (res.ok && j.ok && j.rows) {
        setPersonalization(j);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const patchPersonalization = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setError(null);
      const res = await fetch(`/api/cloud/admin/personalization/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error || "Não foi possível atualizar o pedido de personalização.");
        return false;
      }
      await loadPersonalization();
      return true;
    },
    [loadPersonalization]
  );

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
    if (tab !== "overview") return;
    const t = window.setInterval(() => void load(), REFRESH_OVERVIEW_MS);
    return () => window.clearInterval(t);
  }, [stats, tab, load]);

  useEffect(() => {
    if (tab !== "online") return;
    void loadOnline();
    const t = window.setInterval(() => void loadOnline(), REFRESH_ONLINE_MS);
    return () => window.clearInterval(t);
  }, [tab, loadOnline]);

  useEffect(() => {
    if (tab !== "revenue") return;
    void loadRevenue();
    const t = window.setInterval(() => void loadRevenue(), REFRESH_REVENUE_MS);
    return () => window.clearInterval(t);
  }, [tab, loadRevenue]);

  useEffect(() => {
    if (tab !== "personalization") return;
    void loadPersonalization();
    const t = window.setInterval(() => void loadPersonalization(), REFRESH_PERSONALIZATION_MS);
    return () => window.clearInterval(t);
  }, [tab, loadPersonalization]);

  const patchSubscription = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setError(null);
      const res = await fetch(`/api/cloud/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error || "Não foi possível atualizar a subscrição.");
        return false;
      }
      if (typeof body.subscriptionPlan === "string") {
        const plan = body.subscriptionPlan;
        setPlanDraft((d) => ({ ...d, [id]: plan }));
      }
      await Promise.all([load(), loadRevenue()]);
      return true;
    },
    [load, loadRevenue]
  );

  const savePlan = async (id: string) => {
    const subscriptionPlan = planDraft[id];
    if (!subscriptionPlan) return;
    await patchSubscription(id, { subscriptionPlan });
  };

  const saveCustomPrice = async (id: string) => {
    const raw = priceDraft[id]?.trim();
    const n = raw === "" ? null : Number.parseFloat(raw.replace(",", "."));
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      setError("Preço mensal inválido.");
      return;
    }
    await patchSubscription(id, { customMonthlyPriceEur: n });
  };

  if (!authReady || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">A carregar painel…</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Visão geral, pessoas online, receita (MRR MVP) e subscrições. “Pessoas online” ~15s; Revenue Center ~60s.
          </p>
          {user?.role !== "admin" && user?.email && clientEmailShowsAdminNav(user.email) ? (
            <p className="mt-2 text-xs text-amber-200/90">
              A sincronizar o teu perfil de administrador com o servidor… Se os dados não aparecerem, vai a Settings →
              &quot;Atualizar sessão com o servidor&quot;.
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 text-xs"
          onClick={() => {
            void load();
            if (tab === "online") void loadOnline();
            if (tab === "revenue") void loadRevenue();
            if (tab === "personalization") void loadPersonalization();
          }}
        >
          Atualizar agora
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-surface-border"
        role="tablist"
        aria-label="Secções do painel"
      >
        <TabButton id="overview" selected={tab === "overview"} onClick={() => setTab("overview")}>
          Visão geral
        </TabButton>
        <TabButton id="online" selected={tab === "online"} onClick={() => setTab("online")}>
          Pessoas online
        </TabButton>
        <TabButton id="revenue" selected={tab === "revenue"} onClick={() => setTab("revenue")}>
          Revenue Center
        </TabButton>
        <TabButton
          id="personalization"
          selected={tab === "personalization"}
          onClick={() => setTab("personalization")}
        >
          Full Personalization Process
        </TabButton>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      {tab === "overview" && stats ? (
        <OverviewTabContent
          stats={stats}
          users={users}
          planDraft={planDraft}
          setPlanDraft={setPlanDraft}
          savePlan={savePlan}
          priceDraft={priceDraft}
          setPriceDraft={setPriceDraft}
          saveCustomPrice={saveCustomPrice}
        />
      ) : null}

      {tab === "overview" && !stats ? (
        <p className="text-sm text-zinc-500">Sem dados de estatísticas (verifica permissões ou cloud).</p>
      ) : null}

      {tab === "online" ? <OnlineTabContent online={online} onRefresh={() => void loadOnline()} /> : null}

      {tab === "revenue" ? (
        <RevenueTabContent
          revenue={revenue}
          planDraft={planDraft}
          setPlanDraft={setPlanDraft}
          onApplyPlan={(id) => void savePlan(id)}
          onCancelSubscription={(id) =>
            void patchSubscription(id, {
              subscriptionPlan: "free",
              subscriptionRenewsAt: null,
              proTrialEndsAt: null,
              paymentGraceEndsAt: null,
              lastPaymentFailedAt: null,
            })
          }
          onGrantCompPro={(id) =>
            void patchSubscription(id, {
              subscriptionPlan: "pro_monthly",
              subscriptionRenewsAt: null,
              paymentGraceEndsAt: null,
              lastPaymentFailedAt: null,
            })
          }
          onRefresh={() => void loadRevenue()}
        />
      ) : null}

      {tab === "personalization" ? (
        <PersonalizationTabContent
          payload={personalization}
          onRefresh={() => void loadPersonalization()}
          onPatch={(id, body) => void patchPersonalization(id, body)}
        />
      ) : null}

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

function TabButton({
  id,
  selected,
  onClick,
  children,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      onClick={onClick}
      className={clsx(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        selected
          ? "border-accent text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function OverviewTabContent({
  stats,
  users,
  planDraft,
  setPlanDraft,
  savePlan,
  priceDraft,
  setPriceDraft,
  saveCustomPrice,
}: {
  stats: Stats;
  users: ListedUser[];
  planDraft: Record<string, string>;
  setPlanDraft: Dispatch<SetStateAction<Record<string, string>>>;
  savePlan: (id: string) => void | Promise<void>;
  priceDraft: Record<string, string>;
  setPriceDraft: Dispatch<SetStateAction<Record<string, string>>>;
  saveCustomPrice: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Visão geral do negócio</h2>
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
            hint={stats.trialsSupported ? "Pro trial (7 dias) ainda dentro do prazo" : "—"}
          />
          <StatCard
            title="Em período de graça"
            value={stats.gracePeriodUsers ?? 0}
            hint="Falha de pagamento: 3 dias para regularizar antes de passar a Free"
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

      {users.some(
        (u) =>
          u.role !== "admin" && (u.subscriptionPlan === "grace" || u.lastPaymentFailedAt)
      ) ? (
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos em falta / período de graça</CardTitle>
            <p className="text-sm text-zinc-500">
              Tens ~3 dias para contactar o coach por email antes de a conta passar a Free (dados mantidos, acesso
              bloqueado).
            </p>
          </CardHeader>
          <CardContent className="text-sm text-zinc-300">
            <ul className="space-y-2">
              {users
                .filter(
                  (u) =>
                    u.role !== "admin" && (u.subscriptionPlan === "grace" || u.lastPaymentFailedAt)
                )
                .map((u) => (
                  <li key={u.id}>
                    <span className="font-mono text-xs text-zinc-400">{u.email}</span>
                    {u.paymentGraceEndsAt ? (
                      <span className="ml-2 text-xs text-amber-200/90">
                        graça até {new Date(u.paymentGraceEndsAt).toLocaleString("pt-PT")}
                      </span>
                    ) : null}
                    {u.lastPaymentFailedAt ? (
                      <span className="ml-2 text-xs text-zinc-500">
                        falha: {new Date(u.lastPaymentFailedAt).toLocaleString("pt-PT")}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Utilizadores</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1080px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Nametag</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Preço € / mês</th>
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
                  <td className="px-4 py-3 font-mono text-xs text-emerald-200/90">
                    {u.nametag ?? "—"}
                  </td>
                  <td className="px-4 py-3">{u.role === "admin" ? "Admin" : "Utilizador"}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="text-zinc-500">—</span>
                    ) : (
                      <select
                        value={planDraft[u.id] ?? u.subscriptionPlan}
                        onChange={(e) => setPlanDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                        className="max-w-[140px] rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="free">Grátis</option>
                        <option value="pro_trial">Pro trial</option>
                        <option value="pro_monthly">Pro mensal</option>
                        <option value="grace">Pagamento em falta</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="text-zinc-500">—</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="padrão"
                          value={priceDraft[u.id] ?? ""}
                          onChange={(e) => setPriceDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                          className="w-20 rounded border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                        />
                        <Button type="button" variant="secondary" className="text-[10px] px-2 py-1" onClick={() => void saveCustomPrice(u.id)}>
                          Preço
                        </Button>
                      </div>
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
    </div>
  );
}

function RevenueTabContent({
  revenue,
  planDraft,
  setPlanDraft,
  onApplyPlan,
  onCancelSubscription,
  onGrantCompPro,
  onRefresh,
}: {
  revenue: RevenuePayload | null;
  planDraft: Record<string, string>;
  setPlanDraft: Dispatch<SetStateAction<Record<string, string>>>;
  onApplyPlan: (id: string) => void;
  onCancelSubscription: (id: string) => void;
  onGrantCompPro: (id: string) => void;
  onRefresh: () => void;
}) {
  const o = revenue?.overview;
  const p = revenue?.payments;
  const list = revenue?.subscribers ?? [];
  const cashTracked = revenue?.cashRevenueTracked === true;

  if (!revenue || !o || !p) {
    return (
      <section className="py-8 text-sm text-zinc-500" role="tabpanel" aria-labelledby="tab-revenue">
        A carregar Revenue Center…
      </section>
    );
  }

  const growthColor =
    o.newCoachesGrowthVsPrevWeekPct > 0
      ? "text-emerald-400"
      : o.newCoachesGrowthVsPrevWeekPct < 0
        ? "text-red-400"
        : "text-zinc-300";

  return (
    <section className="space-y-10" role="tabpanel" aria-labelledby="tab-revenue">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Revenue Center</h2>
          {revenue.generatedAt ? (
            <p className="mt-1 text-xs text-zinc-600">
              Actualizado: {new Date(revenue.generatedAt).toLocaleString("pt-PT")}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" className="text-xs" onClick={onRefresh}>
          Atualizar receita
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-200">
            <span className="mr-1.5" aria-hidden>
              🔹
            </span>
            Receita &amp; crescimento (o estado actual)
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Vê de relance se o negócio está a crescer. MRR abaixo é{" "}
            <span className="font-medium text-zinc-400">estimado</span> (ADMIN_PRO_MONTHLY_PRICE_EUR × subscrições Pro
            ativas), não extrato bancário.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCardEuro
            title="MRR (receita mensal recorrente)"
            amount={o.mrrEur}
            hint={`${o.activeSubscriptionsCount} subscrições ativas × ${o.proPriceEur} €`}
          />
          <StatCard
            title="Receita total — hoje"
            value={cashTracked && o.revenueTodayEur != null ? formatEurValue(o.revenueTodayEur) : "—"}
            hint={cashTracked ? "Cash recebido (Stripe)" : "Sem gateway — integra pagamentos"}
          />
          <StatCard
            title="Receita total — semana"
            value={cashTracked && o.revenueWeekEur != null ? formatEurValue(o.revenueWeekEur) : "—"}
            hint={cashTracked ? "Últimos 7 dias" : "Sem gateway"}
          />
          <StatCard
            title="Receita total — mês"
            value={cashTracked && o.revenueMonthEur != null ? formatEurValue(o.revenueMonthEur) : "—"}
            hint={cashTracked ? "Mês civil (UTC)" : "Sem gateway"}
          />
          <StatCard
            title="Subscrições ativas"
            value={o.activeSubscriptionsCount}
            hint="Pro mensal com renovação válida ou sem data de fim"
          />
          <StatCard
            title="Conversão free → paid"
            value={`${o.freeToPaidConversionPct}%`}
            hint={o.freeToPaidConversionNote ?? "Pro ativo / (Pro ativo + grátis)"}
          />
          <StatCard
            title="Crescimento vs período anterior"
            value={<span className={growthColor}>{formatGrowthPct(o.newCoachesGrowthVsPrevWeekPct)}</span>}
            hint={`Novos coaches: ${o.newCoachesLast7d} (últimos 7d) vs ${o.newCoachesPrev7d} (7d anteriores). Evolução de MRR: ainda não calculada (sem histórico na BD).`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-200">
            <span className="mr-1.5" aria-hidden>
              🔹
            </span>
            Dinheiro real (pagamentos)
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Quanto dinheiro está quase a escapar-te sem notares — preenchido automaticamente quando integrares Stripe (ou
            outro PSP).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pagamentos recebidos hoje"
            value={cashTracked ? formatEurValue(p.receivedTodayEur, "0,00 €") : "—"}
            hint={cashTracked ? undefined : "Sem integração"}
          />
          <StatCard
            title="Pagamentos pendentes"
            value={cashTracked ? p.pendingCount : "—"}
            hint={cashTracked ? "A processar" : "Sem integração"}
          />
          <StatCard
            title="Pagamentos falhados"
            value={cashTracked ? p.failedCount : "—"}
            hint={cashTracked ? "Última janela configurável" : "Sem integração"}
          />
          <StatCard
            title='Dinheiro "em risco"'
            value={cashTracked ? formatEurValue(p.atRiskEur, "0,00 €") : "—"}
            hint={cashTracked ? "Falhas + retries" : "Sem integração"}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-200">
            <span className="mr-1.5" aria-hidden>
              🔹
            </span>
            Subscrições (quem paga)
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Controlo por cliente: plano, datas, estado e acções rápidas. Total pago só com histórico de faturação.
          </p>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[1100px] text-left text-sm text-zinc-400">
              <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Coach</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Plano actual</th>
                  <th className="px-3 py-3">Início</th>
                  <th className="px-3 py-3">Próxima cobrança</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Total pago</th>
                  <th className="px-3 py-3">Acções</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const draft = planDraft[row.id] ?? row.subscriptionPlan;
                  const dirty = draft !== row.subscriptionPlan;
                  return (
                    <tr key={row.id} className="border-b border-surface-border/60">
                      <td className="px-3 py-3 font-medium text-zinc-200">{row.name}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-zinc-500">{row.email}</td>
                      <td className="px-3 py-3">
                        <select
                          value={draft}
                          onChange={(e) => setPlanDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                          className="max-w-[140px] rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                        >
                          <option value="free">Grátis</option>
                          <option value="pro_monthly">Pro mensal</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500">
                        {new Date(row.createdAt).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500">
                        {row.subscriptionRenewsAt
                          ? new Date(row.subscriptionRenewsAt).toLocaleString("pt-PT")
                          : draft === "pro_monthly"
                            ? "— (sem data)"
                            : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            row.status === "ativo"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : row.status === "em_atraso"
                                ? "bg-amber-500/15 text-amber-200"
                                : "bg-zinc-500/15 text-zinc-400"
                          )}
                        >
                          {subscriberStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500">
                        {row.totalLifetimePaidEur != null
                          ? formatEurValue(row.totalLifetimePaidEur)
                          : "— (Stripe)"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[280px] flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-[10px]"
                            disabled={!dirty}
                            onClick={() => onApplyPlan(row.id)}
                          >
                            Aplicar plano
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-[10px]"
                            onClick={() => onCancelSubscription(row.id)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-[10px]"
                            onClick={() => onGrantCompPro(row.id)}
                          >
                            Pro oferta
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-[10px] opacity-50"
                            disabled
                            title="Requer Stripe / registo de pagamentos"
                          >
                            Reembolsar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">Sem coaches (não-admin) na plataforma.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PersonalizationTabContent({
  payload,
  onRefresh,
  onPatch,
}: {
  payload: PersonalizationPayload | null;
  onRefresh: () => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
}) {
  const rows = payload?.rows ?? [];

  return (
    <section className="space-y-5" role="tabpanel" aria-labelledby="tab-personalization">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Full Personalization Process</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Pedidos para sessão premium de onboarding (50 € / 2 horas). Aprova/recusa, agenda data e deixa notas para
            acompanhamento por email.
          </p>
        </div>
        <Button type="button" variant="secondary" className="text-xs" onClick={onRefresh}>
          Atualizar pedidos
        </Button>
      </div>

      {payload?.generatedAt ? (
        <p className="text-xs text-zinc-600">Última atualização: {new Date(payload.generatedAt).toLocaleString("pt-PT")}</p>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1260px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-3">Coach</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Pedido</th>
                <th className="px-3 py-3">Data da sessão</th>
                <th className="px-3 py-3">Contacto</th>
                <th className="px-3 py-3">Preferência do coach</th>
                <th className="px-3 py-3">Objetivo do onboarding</th>
                <th className="px-3 py-3">Notas internas</th>
                <th className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-surface-border/60 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-zinc-200">{r.userName || "Coach"}</p>
                    <p className="font-mono text-[11px] text-zinc-500">{r.userEmail}</p>
                    <p className="text-[11px] text-zinc-600">{planLabel(r.userSubscriptionPlan)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      defaultValue={r.status}
                      onChange={(e) => onPatch(r.id, { status: e.target.value })}
                      className="w-[140px] rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                    >
                      <option value="requested">Requested</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                    <p className="mt-1 text-[11px] text-zinc-500">{personalizationStatusLabel(r.status)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-500">
                    {new Date(r.requestedAt).toLocaleString("pt-PT")}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="datetime-local"
                      defaultValue={r.scheduledFor ? r.scheduledFor.slice(0, 16) : ""}
                      className="w-[180px] rounded border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                      onBlur={(e) => onPatch(r.id, { scheduledFor: e.target.value || null })}
                    />
                    {r.scheduledFor ? (
                      <p className="mt-1 text-[11px] text-emerald-300">
                        {new Date(r.scheduledFor).toLocaleString("pt-PT")}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-zinc-600">Sem data definida</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-mono text-[11px] text-zinc-400">{r.contactEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-300">{r.preferredDateNotes || "—"}</td>
                  <td className="px-3 py-3 text-xs text-zinc-300">{r.notesFromCoach || "—"}</td>
                  <td className="px-3 py-3">
                    <textarea
                      rows={2}
                      defaultValue={r.adminNotes ?? ""}
                      className="w-[220px] rounded border border-surface-border bg-[#0c1014] px-2 py-1 text-xs text-zinc-200"
                      placeholder="Notas para follow-up por email"
                      onBlur={(e) => onPatch(r.id, { adminNotes: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-[10px]"
                        onClick={() => onPatch(r.id, { status: "approved" })}
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-[10px]"
                        onClick={() => onPatch(r.id, { status: "declined" })}
                      >
                        Recusar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Ainda não há pedidos de Full Personalization.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function OnlineTabContent({
  online,
  onRefresh,
}: {
  online: OnlinePayload | null;
  onRefresh: () => void;
}) {
  const count = online?.count ?? 0;
  const list = online?.users ?? [];
  const windowSec = online?.onlineWindowSeconds ?? 120;

  return (
    <section className="space-y-4" role="tabpanel" aria-labelledby="tab-online">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">Pessoas online</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Conta exacta de sessões com atividade nos últimos {windowSec}s (heartbeat + mudança de página). A coluna
            &quot;Página&quot; depende do cliente enviar o path — após deploy, os utilizadores precisam de ter a app
            aberta com cloud activo.
          </p>
          {online?.generatedAt ? (
            <p className="mt-1 text-xs text-zinc-600">
              Última amostra: {new Date(online.generatedAt).toLocaleString("pt-PT")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-5 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">Online agora</p>
            <p className="font-display text-4xl font-semibold text-white">{count}</p>
          </div>
          <Button type="button" variant="secondary" className="text-xs" onClick={onRefresh}>
            Atualizar lista
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm text-zinc-400">
            <thead className="border-b border-surface-border bg-surface-raised/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Nome (coach)</th>
                <th className="px-4 py-3">Clube / competição</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Página agora</th>
                <th className="px-4 py-3">Última atividade</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} className="border-b border-surface-border/60">
                  <td className="px-4 py-3 font-medium text-zinc-200">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.clubTeamLabel?.trim() ? row.clubTeamLabel : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.role === "admin" ? (
                      <span className="text-zinc-500">Admin</span>
                    ) : (
                      planLabel(row.subscriptionPlan)
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    <span className="font-medium">{labelForAppPath(row.lastRoute)}</span>
                    {row.lastRoute ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-zinc-600">{row.lastRoute}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString("pt-PT") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Ninguém online neste momento (janela de {windowSec}s). Abre a app noutro dispositivo para testar.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: ReactNode;
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
        <div className="font-display text-3xl font-semibold text-white">{value}</div>
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
