"use client";

import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function DashboardInboxPreview() {
  const { conversations, messagesByConv, hydrated } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const group = conversations.find((c) => c.type === "group");
  const preview =
    group && messagesByConv[group.id]?.length
      ? [...messagesByConv[group.id]!].sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        ).slice(0, 2)
      : [];

  return (
    <div className="space-y-4">
      {!hydrated ? (
        <p className="text-sm text-zinc-500">{isPt ? "A carregar…" : "Loading…"}</p>
      ) : preview.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {isPt ? "Ainda não há mensagens no chat do plantel. Diz olá em Mensagens." : "No messages in squad chat yet. Say hello from Messages."}
        </p>
      ) : (
        preview.map((m) => (
          <div key={m.id} className="rounded-xl border border-surface-border/80 bg-surface-raised/30 p-3">
            <p className="text-xs font-medium text-accent">{m.authorName}</p>
            <p className="mt-1 text-sm text-zinc-300">{m.body}</p>
          </div>
        ))
      )}
      {group && (
        <p className="text-xs text-zinc-600">
          {group.title}: {group.lastMessagePreview}
        </p>
      )}
    </div>
  );
}
