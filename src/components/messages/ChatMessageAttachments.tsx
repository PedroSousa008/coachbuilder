"use client";

import type { ChatAttachment } from "@/types";
import { cn } from "@/lib/utils";

function labelFor(a: ChatAttachment): string {
  if (a.name?.trim()) return a.name.trim();
  switch (a.kind) {
    case "training_session":
      return "Treino";
    case "saved_exercise":
      return "Exercício";
    case "sketch_board":
      return "Sketch";
    default:
      return "Ficheiro";
  }
}

export function ChatMessageAttachments({
  attachments,
  mine,
}: {
  attachments: ChatAttachment[];
  mine: boolean;
}) {
  if (!attachments.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-xl border px-3 py-2 text-xs",
            mine ? "border-zinc-800/80 bg-zinc-950/25" : "border-zinc-600/50 bg-black/20"
          )}
        >
          <p className="font-medium text-zinc-200">{labelFor(a)}</p>
          {a.mimeType?.startsWith("image/") && a.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.dataUrl} alt="" className="mt-2 max-h-48 w-full rounded-lg object-contain" />
          ) : (
            <p className="mt-1 text-[11px] text-zinc-500">
              {a.kind === "file" ? "Ficheiro anexado" : "Conteúdo da app"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
