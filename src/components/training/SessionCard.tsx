import type { TrainingSession } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const intensityStyles = {
  low: "bg-zinc-700/50 text-zinc-300",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionCard({
  session,
  selected,
  onClick,
}: {
  session: TrainingSession;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-accent/45 bg-accent/5"
          : "border-surface-border bg-surface-raised/40 hover:border-zinc-600"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-lg px-2 py-0.5 text-xs font-medium capitalize", intensityStyles[session.intensity])}>
          {session.intensity} intensity
        </span>
        <span className="text-xs text-zinc-500">{session.durationMin} min</span>
      </div>
      <p className="mt-2 font-display font-semibold text-white">{session.title}</p>
      <p className="mt-1 text-xs text-zinc-500">{formatSessionDate(session.date)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.categories.map((c) => (
          <Badge key={c} variant="muted">
            {c}
          </Badge>
        ))}
      </div>
    </button>
  );
}
