import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  body,
  authorName,
  sentAt,
  mine,
}: {
  body: string;
  authorName: string;
  sentAt: string;
  mine: boolean;
}) {
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%]",
          mine ? "rounded-br-md bg-accent text-zinc-950" : "rounded-bl-md bg-zinc-800/90 text-zinc-100"
        )}
      >
        {!mine && <p className="text-[11px] font-medium text-accent/90">{authorName}</p>}
        <p className={cn("text-sm leading-relaxed", !mine && "mt-0.5")}>{body}</p>
        <p
          className={cn(
            "mt-1 text-[10px] tabular-nums",
            mine ? "text-zinc-800/80" : "text-zinc-500"
          )}
        >
          {formatTime(sentAt)}
        </p>
      </div>
    </div>
  );
}
