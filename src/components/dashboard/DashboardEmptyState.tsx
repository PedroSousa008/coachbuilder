import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-zinc-500">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-[15px] font-medium text-zinc-300">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">{description}</p>
      <Link
        href={actionHref}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-accent-muted"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
