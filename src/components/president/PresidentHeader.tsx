"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESIDENT_NAV } from "@/lib/president-nav";

export function PresidentHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const mobileLinks = useMemo(() => PRESIDENT_NAV.map((n) => ({ href: n.href, label: n.label })), []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-surface-border bg-[#0a0d10]/85 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-300 lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight text-white">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-400 transition-colors hover:text-white"
            aria-label="Alertas do clube"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-zinc-950">
              6
            </span>
          </button>
        </div>
        <Link
          href="/app/president/comunicacao"
          className="hidden h-9 items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 sm:inline-flex"
        >
          Comunicação
        </Link>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-50 max-h-[min(70vh,calc(100dvh-4rem))] overflow-y-auto border-b border-surface-border bg-[#0c1014] p-4 shadow-xl lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1">
          {mobileLinks.map((l) => {
            const active =
              l.href === "/app/president"
                ? pathname === "/app/president" || pathname === "/app/president/"
                : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-amber-500/15 text-amber-400" : "text-zinc-400 hover:bg-white/5"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
