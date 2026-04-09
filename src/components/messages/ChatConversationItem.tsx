import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function ChatConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 rounded-xl p-3 text-left transition-colors",
        active ? "bg-accent/10" : "hover:bg-white/5"
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
        {conversation.avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm font-medium", active ? "text-accent" : "text-zinc-200")}>
            {conversation.title}
          </p>
          <span className="shrink-0 text-[10px] text-zinc-500">{formatTime(conversation.lastMessageAt)}</span>
        </div>
        {conversation.subtitle && <p className="truncate text-xs text-zinc-500">{conversation.subtitle}</p>}
        <p className="mt-0.5 truncate text-xs text-zinc-500">{conversation.lastMessagePreview}</p>
      </div>
      {conversation.unread ? (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-zinc-950">
          {conversation.unread}
        </span>
      ) : null}
    </button>
  );
}
