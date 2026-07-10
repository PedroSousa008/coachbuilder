"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export function DashboardInboxPreview() {
  const { conversations, messagesByConv, hydrated } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const group = conversations.find((c) => c.type === "group");
  const preview =
    group && messagesByConv[group.id]?.length
      ? [...messagesByConv[group.id]!]
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
          .slice(0, 2)
      : [];

  return (
    <section className="flex h-full flex-col rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/[0.08]">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">
            {isPt ? "Mensagens recentes" : "Recent messages"}
          </h2>
          {group ? (
            <p className="mt-1 truncate text-[13px] text-zinc-500">{group.title}</p>
          ) : (
            <p className="mt-1 text-[13px] text-zinc-500">{isPt ? "Chat do plantel" : "Squad chat"}</p>
          )}
        </div>
        <Link
          href="/app/messages"
          className="shrink-0 text-[13px] font-medium text-zinc-500 transition-colors duration-200 hover:text-accent"
        >
          {isPt ? "Inbox" : "Inbox"}
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {!hydrated ? (
          <p className="text-[13px] text-zinc-500">{isPt ? "A carregar…" : "Loading…"}</p>
        ) : preview.length === 0 ? (
          <DashboardEmptyState
            icon={MessageSquare}
            title={isPt ? "Sem mensagens" : "No messages yet"}
            description={
              isPt
                ? "Ainda não há mensagens no chat do plantel. Abre Mensagens para começar a conversa."
                : "No messages in squad chat yet. Open Messages to start the conversation."
            }
            actionLabel={isPt ? "Abrir mensagens" : "Open messages"}
            actionHref="/app/messages"
            className="flex-1"
          />
        ) : (
          <div className="space-y-3">
            {preview.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-colors duration-200 hover:border-white/[0.08]"
              >
                <p className="text-[13px] font-medium text-zinc-400">{m.authorName}</p>
                <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-zinc-300">{m.body}</p>
              </div>
            ))}
            {group?.lastMessagePreview ? (
              <p className="pt-1 text-[12px] text-zinc-600">{group.lastMessagePreview}</p>
            ) : null}
            <Link
              href="/app/messages"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:border-white/[0.12] hover:text-white"
            >
              {isPt ? "Ver conversa" : "View conversation"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
