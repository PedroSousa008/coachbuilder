"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mockCoach } from "@/data/mock";
import { useAppData, SQUAD_GROUP_ID } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { normalizeNametagInput } from "@/lib/user-nametag";
import type { Message } from "@/types";

const DM_POLL_MS = 6500;

export function MessagesClient() {
  const {
    conversations,
    messagesByConv,
    players,
    createDmWithPlayer,
    addPlayerToGroupChat,
    sendChatMessage,
    mergeRemoteDmMessages,
    hydrated,
  } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const { user } = useAuth();

  const [tab, setTab] = useState<"group" | "dm">("group");
  const filtered = useMemo(
    () => conversations.filter((c) => (tab === "group" ? c.type === "group" : c.type === "dm")),
    [conversations, tab]
  );

  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [playerCloudUserId, setPlayerCloudUserId] = useState<Record<string, string>>({});
  const pollSinceRef = useRef<Record<string, string>>({});

  const coachUserId = user?.id ?? mockCoach.id;

  useEffect(() => {
    if (!hydrated || !shouldUseCloudClientApis(user)) {
      setPlayerCloudUserId({});
      return;
    }
    const tags = [
      ...new Set(
        players.map((p) => normalizeNametagInput(p.linkedNametag ?? "")).filter(Boolean)
      ),
    ];
    if (tags.length === 0) {
      setPlayerCloudUserId({});
      return;
    }
    let cancelled = false;
    fetch("/api/cloud/nametag/resolve-batch", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          byTag?: Record<string, { exists: boolean; userId: string | null }>;
        }) => {
          if (cancelled || !data.ok || !data.byTag) return;
          const next: Record<string, string> = {};
          for (const p of players) {
            const t = normalizeNametagInput(p.linkedNametag ?? "");
            if (!t) continue;
            const row = data.byTag[t];
            if (row?.exists && row.userId) next[p.id] = row.userId;
          }
          setPlayerCloudUserId(next);
        }
      )
      .catch(() => {
        if (!cancelled) setPlayerCloudUserId({});
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, players, user]);

  const playerHasAppAccount = useCallback(
    (playerId: string) => Boolean(playerCloudUserId[playerId]),
    [playerCloudUserId]
  );

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

  const activeDmPlayerId =
    activeConv?.type === "dm" ? activeConv.id.replace(/^conv-dm-/, "") : null;
  const activeDmPeerCloudId = activeDmPlayerId ? playerCloudUserId[activeDmPlayerId] : null;

  /** Polling DM na cloud: novas mensagens (outro lado ou outro dispositivo). */
  useEffect(() => {
    if (!activeConv || activeConv.type !== "dm" || !activeDmPeerCloudId || !user?.id) return;
    if (!shouldUseCloudClientApis(user)) return;

    let cancelled = false;
    const convId = activeConv.id;
    const poll = async () => {
      const since = pollSinceRef.current[convId] ?? new Date(0).toISOString();
      try {
        const res = await fetch(
          `/api/cloud/chat/dm?peerUserId=${encodeURIComponent(activeDmPeerCloudId)}&since=${encodeURIComponent(since)}`,
          { credentials: "include" }
        );
        const data = (await res.json()) as {
          ok?: boolean;
          messages?: Array<{
            id: string;
            authorUserId: string;
            authorName: string;
            body: string;
            sentAt: string;
          }>;
        };
        if (cancelled || !res.ok || !data.ok || !data.messages?.length) return;
        const mapped: Message[] = data.messages.map((m) => ({
          id: m.id,
          conversationId: convId,
          authorId: m.authorUserId,
          authorName: m.authorName,
          body: m.body,
          sentAt: m.sentAt,
        }));
        mergeRemoteDmMessages(convId, mapped);
        const lastSent = mapped[mapped.length - 1]!.sentAt;
        pollSinceRef.current[convId] = lastSent;
      } catch {
        /* offline */
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), DM_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeConv, activeDmPeerCloudId, mergeRemoteDmMessages, user?.id]);

  const canSendDm =
    !activeConv ||
    activeConv.type !== "dm" ||
    (activeDmPlayerId ? playerHasAppAccount(activeDmPlayerId) : false);

  const send = async () => {
    if (!draft.trim() || !activeId || !activeConv) return;
    const trimmed = draft.trim();

    if (activeConv.type === "dm" && activeDmPlayerId && !playerHasAppAccount(activeDmPlayerId)) return;

    if (activeConv.type === "dm" && activeDmPlayerId) {
      const peerCloudId = playerCloudUserId[activeDmPlayerId];
      if (peerCloudId && user?.id && shouldUseCloudClientApis(user)) {
        try {
          const res = await fetch("/api/cloud/chat/dm", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerUserId: peerCloudId, body: trimmed }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            message?: {
              id: string;
              authorUserId: string;
              authorName: string;
              body: string;
              sentAt: string;
            };
          };
          if (res.ok && data.ok && data.message) {
            const m = data.message;
            mergeRemoteDmMessages(activeId, [
              {
                id: m.id,
                conversationId: activeId,
                authorId: m.authorUserId,
                authorName: m.authorName,
                body: m.body,
                sentAt: m.sentAt,
              },
            ]);
            pollSinceRef.current[activeId] = m.sentAt;
            setDraft("");
            return;
          }
        } catch {
          /* fallback abaixo */
        }
      }
      sendChatMessage(activeId, trimmed);
      setDraft("");
      return;
    }

    sendChatMessage(activeId, trimmed);
    setDraft("");
  };

  const hasConversations = conversations.length > 0;
  const squadGroup =
    conversations.find((c) => c.type === "group" && c.id === SQUAD_GROUP_ID) ??
    conversations.find((c) => c.type === "group");

  const groupPickerPlayers = useMemo(
    () =>
      squadGroup
        ? players.filter((p) => !squadGroup.participantIds.includes(p.id))
        : [],
    [players, squadGroup]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PlayerPickerModal
        open={dmPickerOpen}
        title={isPt ? "Mensagem a jogador" : "Message a player"}
        players={players}
        playerDisabled={(p) => !playerHasAppAccount(p.id)}
        disabledHint={isPt ? "Sem conta na app (associa o nametag em Equipa)" : "No app account yet (link nametag in Team)"}
        onClose={() => setDmPickerOpen(false)}
        onSelect={(p) => {
          const id = createDmWithPlayer(p);
          if (id) {
            setActiveId(id);
            setTab("dm");
          }
        }}
        emptyHint={
          isPt
            ? "Adiciona jogadores em Equipa e associa o nametag de conta para mensagens."
            : "Add players in Team and link their account nametag to message."
        }
      />
      <PlayerPickerModal
        open={groupPickerOpen}
        title={isPt ? "Adicionar jogador ao chat do plantel" : "Add player to squad chat"}
        players={groupPickerPlayers}
        playerDisabled={(p) => !playerHasAppAccount(p.id)}
        disabledHint={isPt ? "Sem conta na app (associa o nametag em Equipa)" : "No app account yet (link nametag in Team)"}
        onClose={() => setGroupPickerOpen(false)}
        onSelect={(p) => {
          if (squadGroup) addPlayerToGroupChat(squadGroup.id, p);
        }}
        emptyHint={
          isPt
            ? "Todos os jogadores já estão neste canal, ou ainda não tens jogadores."
            : "Everyone on the roster is already in this channel, or you have no players yet."
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setDmPickerOpen(true)}>
          {isPt ? "Nova mensagem direta" : "New direct message"}
        </Button>
        {squadGroup && (
          <Button type="button" variant="outline" size="sm" onClick={() => setGroupPickerOpen(true)}>
            {isPt ? "Adicionar ao chat do plantel" : "Add to squad chat"}
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
              {isPt ? "Chat de grupo" : "Group chat"}
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
              {isPt ? "Direto" : "Direct"}
            </button>
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
            {!hydrated ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">{isPt ? "A carregar…" : "Loading…"}</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">
                {tab === "group"
                  ? isPt
                    ? "Sem chat de grupo. Isto não devia acontecer — tenta atualizar."
                    : "No group chat. This should not happen — try refreshing."
                  : isPt
                    ? "Ainda sem mensagens diretas. Usa Nova mensagem direta."
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
              <p className="font-display font-semibold text-white">{isPt ? "Mensagens" : "Messages"}</p>
              <p className="text-xs text-zinc-500">{isPt ? "Escolhe uma conversa" : "Pick a conversation"}</p>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6">
            {!activeConv ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-zinc-500">{isPt ? "Nenhuma conversa aberta." : "No conversation open."}</p>
              </div>
            ) : thread.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">
                {isPt ? "Ainda sem mensagens. Diz olá." : "No messages yet. Say hello."}
              </p>
            ) : (
              thread.map((m) => (
                <MessageBubble
                  key={m.id}
                  body={m.body}
                  authorName={m.authorName}
                  sentAt={m.sentAt}
                  mine={m.authorId === coachUserId}
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
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send())}
                    placeholder={isPt ? "Escreve uma mensagem…" : "Write a message…"}
                    className="flex-1"
                    disabled={activeConv.type === "dm" && !canSendDm}
                  />
                  <Button type="button" onClick={() => void send()} disabled={activeConv.type === "dm" && !canSendDm}>
                    {isPt ? "Enviar" : "Send"}
                  </Button>
                </div>
                {activeConv.type === "dm" && !canSendDm ? (
                  <p className="mt-2 text-[11px] text-amber-500/95">
                    {isPt
                      ? "Este jogador ainda não tem conta na app. Associa o nametag em Equipa (conta verificada) para enviar mensagens."
                      : "This player has no app account yet. Link a verified nametag in Team to send messages."}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-zinc-600">
                    {isPt
                      ? "Mensagens directas com conta na cloud sincronizam entre dispositivos (polling). Chat de grupo continua local neste browser."
                      : "Direct messages with a cloud account sync across devices (polling). Squad group chat stays local in this browser."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-xs text-zinc-600">
                {isPt ? "Abre uma conversa para enviar mensagem." : "Open a thread to send a message."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
