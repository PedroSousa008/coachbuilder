"use client";

import { useMemo, useState } from "react";
import type { Conversation, Message } from "@/types";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mockCoach } from "@/data/mock";

export function MessagesClient({
  conversations,
  messagesByConv,
}: {
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
}) {
  const [tab, setTab] = useState<"group" | "dm">("group");
  const filtered = useMemo(
    () => conversations.filter((c) => (tab === "group" ? c.type === "group" : c.type === "dm")),
    [conversations, tab]
  );
  const [activeId, setActiveId] = useState(
    () => conversations.find((c) => c.type === "group")?.id ?? conversations[0]?.id ?? ""
  );
  const activeConv = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const thread = [...(messagesByConv[activeId] ?? [])].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim() || !activeId) return;
    setDraft("");
    // MVP: local-only; structure ready for mutation
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:flex-row lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-surface-border lg:bg-surface-raised/20">
      <div className="flex w-full flex-col border-surface-border lg:w-[320px] lg:border-r">
        <div className="flex gap-1 border-b border-surface-border p-3">
          <button
            type="button"
            onClick={() => {
              setTab("group");
              const first = conversations.find((c) => c.type === "group");
              if (first) setActiveId(first.id);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "group" ? "bg-accent/15 text-accent" : "text-zinc-500 hover:bg-white/5"
            }`}
          >
            Group chat
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("dm");
              const first = conversations.find((c) => c.type === "dm");
              if (first) setActiveId(first.id);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "dm" ? "bg-accent/15 text-accent" : "text-zinc-500 hover:bg-white/5"
            }`}
          >
            Direct
          </button>
        </div>
        <div className="max-h-48 space-y-0.5 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
          {filtered.map((c) => (
            <ChatConversationItem
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              onClick={() => setActiveId(c.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
        {activeConv && (
          <div className="border-b border-surface-border px-4 py-4 lg:px-6">
            <p className="font-display font-semibold text-white">{activeConv.title}</p>
            {activeConv.subtitle && <p className="text-xs text-zinc-500">{activeConv.subtitle}</p>}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6">
          {thread.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">No messages yet. Say hello to the group.</p>
          ) : (
            thread.map((m) => (
              <MessageBubble
                key={m.id}
                body={m.body}
                authorName={m.authorName}
                sentAt={m.sentAt}
                mine={m.authorId === mockCoach.id}
              />
            ))
          )}
        </div>
        <div className="border-t border-surface-border p-4 lg:p-6">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Write a message…"
              className="flex-1"
            />
            <Button type="button" onClick={send}>
              Send
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            Demo UI — sends are not persisted. Wire to your messaging API later.
          </p>
        </div>
      </div>
    </div>
  );
}
