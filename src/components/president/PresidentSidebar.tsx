"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";
import { PRESIDENT_NAV } from "@/lib/president-nav";
import { presidentSeats } from "@/data/president-mock";

export function PresidentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { coachProfile } = useAppData();

  const displayName = coachProfile.name.trim() || user?.name.trim() || user?.email || "";
  const showEmailUnderName = Boolean(user?.email && displayName !== user.email);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-surface-border bg-[#0c1014]/95 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-border/70 bg-white">
          <img src="/icon.png" alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">CoachBuilder</p>
          <p className="truncate text-[11px] text-amber-400/90">Modo clube · Presidente</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {PRESIDENT_NAV.map((item) => {
          const active =
            item.href === "/app/president"
              ? pathname === "/app/president" || pathname === "/app/president/"
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
              <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-border p-4">
        <div className="rounded-xl border border-surface-border bg-surface-raised/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Lugares de treinador</p>
          <p className="mt-1 text-sm font-medium text-white">
            {presidentSeats.used} / {presidentSeats.included} em uso
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Cada lugar extra: {presidentSeats.extraSeatPriceEUR}€ (pagamento único, sem mensalidade adicional por
            treinador).
          </p>
        </div>
        {user ? (
          <div className="mt-3 min-w-0">
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
          Terminar sessão
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Área premium para direção do clube. Os treinadores com lugares ativos usam a app de treino normalmente, sem
          custo extra por treinador.
        </p>
      </div>
    </aside>
  );
}
