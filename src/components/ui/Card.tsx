import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  hover = false,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-raised/80 shadow-card backdrop-blur-sm",
        hover && "transition-all duration-200 hover:border-zinc-600/80 hover:shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("border-b border-surface-border/80 px-5 py-4", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight text-white", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("mt-1 text-sm text-zinc-400", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
