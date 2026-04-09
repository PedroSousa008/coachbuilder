import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "accent" | "warning" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-zinc-800 text-zinc-300",
        variant === "accent" && "bg-accent/15 text-accent",
        variant === "warning" && "bg-amber-500/15 text-amber-400",
        variant === "muted" && "bg-white/5 text-zinc-500",
        className
      )}
    >
      {children}
    </span>
  );
}
