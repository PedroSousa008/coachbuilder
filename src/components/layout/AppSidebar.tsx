"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  CalendarDays,
  Calendar,
  MessageSquare,
  PenSquare,
  Users,
  UserCircle,
  Trophy,
  Settings,
  Shield,
  Database,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";
import { useLanguage } from "@/contexts/LanguageContext";
import { canUseOwnerCoachTools } from "@/lib/owner-coach-tools-client";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { coachProfile, unreadMessagesCount } = useAppData();
  const { t } = useLanguage();
  const ownerCoachTools = canUseOwnerCoachTools(user?.email);
  const nav = [
    { href: "/app", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/app/tactics", label: t("nav.tactics"), icon: GitBranch },
    { href: "/app/training", label: t("shell.trainingPlans"), icon: CalendarDays },
    { href: "/app/messages", label: t("nav.messages"), icon: MessageSquare },
    { href: "/app/sketch", label: t("shell.sketchArea"), icon: PenSquare },
    { href: "/app/team", label: t("nav.team"), icon: Users },
    { href: "/app/calendar", label: t("nav.calendar"), icon: Calendar },
    { href: "/app/profile", label: t("nav.profile"), icon: UserCircle },
    { href: "/app/treinador-do-mes", label: t("nav.coachOfMonth"), icon: Trophy },
    ...(ownerCoachTools
      ? [{ href: "/app/treinadores" as const, label: t("nav.coaches"), icon: ClipboardList }]
      : []),
    { href: "/app/settings", label: t("nav.settings"), icon: Settings },
  ];

  const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
  const fullWorkspace = hasFullWorkspaceAccess(user, ownerListed);
  const showAdmin =
    user?.role === "admin" || (user?.email ? clientEmailShowsAdminNav(user.email) : false);
  const adminNav = showAdmin
    ? ([
        { href: "/app/admin", label: t("nav.admin"), icon: Shield },
        { href: "/app/admin/database", label: t("nav.database"), icon: Database },
      ] as const)
    : [];

  const displayName =
    coachProfile.name.trim() || user?.name.trim() || user?.email || "";
  const showEmailUnderName = Boolean(user?.email && displayName !== user.email);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-surface-border bg-[#0c1014]/95 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-border/70 bg-white">
          <img src="/icon.png" alt="CoachBuilder logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-white">CoachBuilder</p>
          <p className="text-[11px] text-zinc-500">{t("sidebar.operatingSystem")}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {adminNav.map((item) => {
          const active =
            item.href === "/app/admin"
              ? pathname === "/app/admin" || pathname === "/app/admin/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
        {(fullWorkspace
          ? nav
          : nav.filter(
              (item) =>
                item.href === "/app/messages" ||
                item.href === "/app/settings" ||
                (ownerCoachTools &&
                  (item.href === "/app/treinador-do-mes" || item.href === "/app/treinadores"))
            )
        ).map((item) => {
          const active =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showUnreadBadge = item.href === "/app/messages" && unreadMessagesCount > 0;
          const unreadLabel = unreadMessagesCount > 9 ? "+9" : String(unreadMessagesCount);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              {showUnreadBadge ? (
                <span
                  className="ml-auto shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-zinc-950"
                  aria-label={`${unreadMessagesCount} não lidas`}
                >
                  {unreadLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-border p-4">
        {user ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-200" title={displayName}>
              {displayName}
            </p>
            {showEmailUnderName ? (
              <p className="truncate text-[11px] text-zinc-500" title={user.email}>
                {user.email}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
            router.refresh();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-surface-border py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
          {t("sidebar.logout")}
        </button>
        <p className="mt-3 text-xs text-zinc-500">
          {fullWorkspace
            ? t("sidebar.proBlurb")
            : t("sidebar.freeBlurb")}
        </p>
        <Link
          href="/app/settings"
          className="mt-2 inline-flex text-xs font-medium text-accent hover:underline"
        >
          {t("sidebar.plansAndColor")}
        </Link>
      </div>
    </aside>
  );
}
