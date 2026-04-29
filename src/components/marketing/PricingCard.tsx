import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  ctaHref,
  ctaLabel,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-8",
        highlighted
          ? "border-accent/40 bg-surface-raised shadow-glow"
          : "border-surface-border bg-surface-raised/40"
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-zinc-950">
          Pro
        </span>
      )}
      <h3 className="font-display text-xl font-semibold text-white">{name}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-white">{price}</span>
        {price !== "€0" && <span className="text-sm text-zinc-500">/mês</span>}
      </p>
      <ul className="mt-8 flex flex-col gap-3 text-sm text-zinc-300">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex-1" />
      <Link
        href={ctaHref}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all",
          highlighted
            ? "bg-accent text-zinc-950 shadow-glow hover:bg-accent-muted"
            : "border border-surface-border bg-surface-raised text-zinc-100 hover:border-zinc-600"
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
