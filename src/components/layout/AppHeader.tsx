"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";
import { useLanguage } from "@/contexts/LanguageContext";

export function AppHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const mobileLinks = useMemo(() => {
    const mobileLinksBase = [
      { href: "/app", label: t("nav.home") },
      { href: "/app/tactics", label: t("nav.tactics") },
      { href: "/app/training", label: t("nav.training") },
      { href: "/app/messages", label: t("nav.messages") },
      { href: "/app/sketch", label: t("nav.sketch") },
      { href: "/app/team", label: t("nav.team") },
      { href: "/app/calendar", label: t("nav.calendar") },
      { href: "/app/profile", label: t("nav.profile") },
      { href: "/app/settings", label: t("nav.settings") },
    ] as const;
    const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
    const full = hasFullWorkspaceAccess(user, ownerListed);
    const baseList = full
      ? mobileLinksBase
      : mobileLinksBase.filter((l) => l.href === "/app/messages" || l.href === "/app/settings");
    const base = baseList.map((l) => ({ href: l.href, label: l.label }));
    const showAdmin =
      user?.role === "admin" || (user?.email ? clientEmailShowsAdminNav(user.email) : false);
    if (showAdmin) {
      return [
        { href: "/app/admin", label: t("nav.admin") },
        { href: "/app/admin/database", label: t("nav.database") },
        ...base,
      ];
    }
    return base;
  }, [user?.role, user?.email, user, t]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-surface-border bg-[#0a0d10]/85 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-300 lg:hidden"
          aria-label={t("header.openMenu")}
          onClick={() => setOpen((o) => !o)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight text-white">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-400 transition-colors hover:text-white sm:flex"
          aria-label={t("header.notifications")}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <Link
          href="/app/messages"
          className={cn(
            "hidden h-9 items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 sm:inline-flex"
          )}
        >
          {t("header.openChat")}
        </Link>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-50 border-b border-surface-border bg-[#0c1014] p-4 shadow-xl lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1">
          {mobileLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-medium",
                l.href === "/app/admin"
                  ? pathname === "/app/admin" || pathname === "/app/admin/"
                  : pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                  ? "bg-accent/10 text-accent"
                  : "text-zinc-400 hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
