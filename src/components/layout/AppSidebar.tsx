"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  CalendarDays,
  MessageSquare,
  Video,
  Users,
  UserCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/tactics", label: "Tactics", icon: GitBranch },
  { href: "/app/training", label: "Training Plans", icon: CalendarDays },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/video", label: "Video Analysis", icon: Video },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/profile", label: "Profile", icon: UserCircle },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-surface-border bg-[#0c1014]/95 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-sm font-display font-bold text-accent">
          CB
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-white">CoachBuilder</p>
          <p className="text-[11px] text-zinc-500">Operating system</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map((item) => {
          const active =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-border p-4">
        <p className="text-xs text-zinc-500">Pro unlocks tactics, training, video &amp; team tools.</p>
        <Link
          href="/app/settings"
          className="mt-2 inline-flex text-xs font-medium text-accent hover:underline"
        >
          Plans &amp; team colour
        </Link>
      </div>
    </aside>
  );
}
