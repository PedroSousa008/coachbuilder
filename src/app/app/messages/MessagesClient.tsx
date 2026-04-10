"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mockCoach } from "@/data/mock";
import { useAppData, SQUAD_GROUP_ID } from "@/contexts/AppDataContext";

export function MessagesClient() {
  const {
    conversations,
    messagesByConv,
    players,
    createDmWithPlayer,
    addPlayerToGroupChat,
    sendChatMessage,
    hydrated,
  } = useAppData();

  const [tab, setTab] = useState<"group" | "dm">("group");
  const filtered = useMemo(
    () => conversations.filter((c) => (tab === "group" ? c.type === "group" : c.type === "dm")),
    [conversations, tab]
  );

  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (conversations.length === 0) return;
    if (activeId && conversations.some((c) => c.id === activeId)) return;
    const firstGroup = conversations.find((c) => c.type === "group");
    setActiveId(firstGroup?.id ?? conversations[0]?.id ?? "");
  }, [hydrated, conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId);
  const thread = [...(messagesByConv[activeId] ?? [])].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  );

  const send = () => {
    if (!draft.trim() || !activeId) return;
    sendChatMessage(activeId, draft);
    setDraft("");
  };

  const hasConversations = conversations.length > 0;
  const squadGroup = conversations.find((c) => c.type === "group" && c.id === SQUAD_GROUP_ID) ?? conversations.find((c) => c.type === "group");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PlayerPickerModal
        open={dmPickerOpen}
        title="Message a player"
        players={players}
        onClose={() => setDmPickerOpen(false)}
        onSelect={(p) => {
          const id = createDmWithPlayer(p);
          setActiveId(id);
          setTab("dm");
        }}
        emptyHint="Add players from Team to start a direct message."
      />
      <PlayerPickerModal
        open={groupPickerOpen}
        title="Add player to squad chat"
        players={players.filter((p) => squadGroup && !squadGroup.participantIds.includes(p.id))}
        onClose={() => setGroupPickerOpen(false)}
        onSelect={(p) => {
          if (squadGroup) addPlayerToGroupChat(squadGroup.id, p);
        }}
        emptyHint="Everyone on the roster is already in this channel, or you have no players yet."
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setDmPickerOpen(true)}>
          New direct message
        </Button>
        {squadGroup && (
          <Button type="button" variant="outline" size="sm" onClick={() => setGroupPickerOpen(true)}>
            Add to squad chat
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:h-[calc(100vh-10rem)] lg:flex-row lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-surface-border lg:bg-surface-raised/20">
        <div className="flex w-full flex-col border-surface-border lg:w-[320px] lg:border-r">
          <div className="flex gap-1 border-b border-surface-border p-3">
            <button
              type="button"
              onClick={() => {
                setTab("group");
                const first = conversations.find((c) => c.type === "group");
                if (first) setActiveId(first.id);
                else setActiveId("");
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
                else setActiveId("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "dm" ? "bg-accent/15 text-accent" : "text-zinc-500 hover:bg-white/5"
              }`}
            >
              Direct
            </button>
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
            {!hydrated ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">
                {tab === "group"
                  ? "No group chat. This should not happen — try refreshing."
                  : "No direct messages yet. Use New direct message."}
              </p>
            ) : (
              filtered.map((c) => (
                <ChatConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
          {activeConv ? (
            <div className="border-b border-surface-border px-4 py-4 lg:px-6">
              <p className="font-display font-semibold text-white">{activeConv.title}</p>
              {activeConv.subtitle && <p className="text-xs text-zinc-500">{activeConv.subtitle}</p>}
            </div>
          ) : (
            <div className="border-b border-surface-border px-4 py-4 lg:px-6">
              <p className="font-display font-semibold text-white">Messages</p>
              <p className="text-xs text-zinc-500">Pick a conversation</p>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6">
            {!activeConv ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-zinc-500">No conversation open.</p>
              </div>
            ) : thread.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">No messages yet. Say hello.</p>
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
            {hasConversations && activeConv ? (
              <>
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
                  Stored in this browser until you connect a real inbox.
                </p>
              </>
            ) : (
              <p className="text-center text-xs text-zinc-600">Open a thread to send a message.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
