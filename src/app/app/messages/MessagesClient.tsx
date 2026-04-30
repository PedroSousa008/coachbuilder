"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Paperclip } from "lucide-react";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { GroupEditorModal } from "@/components/messages/GroupEditorModal";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mockCoach } from "@/data/mock";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { parseCloudDmConversationId } from "@/lib/dm-conversation-id";
import { normalizeNametagInput } from "@/lib/user-nametag";
import type { ChatAttachment, Message } from "@/types";
import { isChannelSystemMessage } from "@/lib/message-display";
import {
  buildChatAttachmentFromFile,
  parseChatAttachmentsFromApi,
  uidAttachment,
  validateAttachmentPayload,
} from "@/lib/chat-attachments";
import { getTrainingCatalogItems } from "@/lib/training-session-local";

type DirectoryUser = {
  userId: string;
  name: string;
  subtitle: string;
};

function mapApiMessage(
  convId: string,
  m: {
    id: string;
    authorUserId: string;
    authorName: string;
    body: string;
    sentAt: string;
    attachments?: unknown;
  }
): Message {
  return {
    id: m.id,
    conversationId: convId,
    authorId: m.authorUserId,
    authorName: m.authorName,
    body: m.body,
    sentAt: m.sentAt,
    attachments: parseChatAttachmentsFromApi(m.attachments),
  };
}

function mapWorkspaceMessage(msg: {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  body: string;
  sentAt: string;
  attachments?: unknown;
  system?: boolean;
}): Message {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    authorId: msg.authorId,
    authorName: msg.authorName,
    body: msg.body,
    sentAt: msg.sentAt,
    attachments: parseChatAttachmentsFromApi(msg.attachments),
    ...(msg.system ? { system: true } : {}),
  };
}

export function MessagesClient({ enableGlobalUserSearch = false }: { enableGlobalUserSearch?: boolean }) {
  const {
    conversations,
    messagesByConv,
    players,
    staff,
    createDmWithPlayer,
    createDmWithStaff,
    createDmWithAccount,
    createGroupConversation,
    updateGroupConversation,
    addParticipantsToGroupChat,
    removeParticipantFromGroupChat,
    setGroupAdmin,
    sendChatMessage,
    mergeRemoteDmMessages,
    hydrateDmThreadsFromCloud,
    markConversationRead,
    hydrated,
    trainingSessions,
    savedTrainingExercises,
    sketchArea,
  } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const { user } = useAuth();

  const catalogItemsWithVideo = useMemo(
    () => getTrainingCatalogItems(players).filter((i) => Boolean(i.videoUrl?.trim())),
    [players]
  );

  const sketchNotesPicker = useMemo(
    () =>
      [...sketchArea.notes].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      ),
    [sketchArea.notes]
  );
  const sketchFilesPicker = useMemo(
    () => [...sketchArea.files].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [sketchArea.files]
  );
  const sketchBoardsPicker = useMemo(
    () => [...sketchArea.boardDrafts].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
    [sketchArea.boardDrafts]
  );
  const sketchTasksPicker = useMemo(
    () => [...sketchArea.tasks].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
    [sketchArea.tasks]
  );
  const sketchEventsPicker = useMemo(
    () =>
      [...sketchArea.calendarEvents].sort(
        (a, b) => `${b.date ?? ""}${b.timeStart ?? ""}`.localeCompare(`${a.date ?? ""}${a.timeStart ?? ""}`)
      ),
    [sketchArea.calendarEvents]
  );

  const [tab, setTab] = useState<"group" | "dm">("group");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileScreen, setMobileScreen] = useState<"list" | "chat">("list");
  const filtered = useMemo(
    () => conversations.filter((c) => (tab === "group" ? c.type === "group" : c.type === "dm")),
    [conversations, tab]
  );

  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const fileAttachRef = useRef<HTMLInputElement>(null);
  /** Anchor for fixed attach menu (escapes parent `overflow:hidden` on large layouts). */
  const attachWrapRef = useRef<HTMLDivElement>(null);
  const attachMenuPortalRef = useRef<HTMLDivElement>(null);
  const [attachMenuCoords, setAttachMenuCoords] = useState<{ left: number; bottom: number } | null>(null);
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [manageGroupOpen, setManageGroupOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [manageGroupNameDraft, setManageGroupNameDraft] = useState("");
  const [selectedCreatePlayerIds, setSelectedCreatePlayerIds] = useState<string[]>([]);
  const [selectedCreateStaffIds, setSelectedCreateStaffIds] = useState<string[]>([]);
  const [selectedManagePlayerIds, setSelectedManagePlayerIds] = useState<string[]>([]);
  const [selectedManageStaffIds, setSelectedManageStaffIds] = useState<string[]>([]);
  const [selectedMemberCloudId, setSelectedMemberCloudId] = useState<string | null>(null);
  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [playerCloudUserId, setPlayerCloudUserId] = useState<Record<string, string>>({});
  const [staffCloudUserId, setStaffCloudUserId] = useState<Record<string, string>>({});
  const streamSinceRef = useRef<Record<string, string>>({});
  const draftInputRef = useRef<HTMLInputElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  /** After opening a DM, focus the composer once that conversation is active. */
  const focusDraftAfterConvIdRef = useRef<string | null>(null);
  /** Scroll to first unread (or bottom) once per conversa aberta — não em cada poll. */
  const scrollThreadPendingRef = useRef(false);

  const coachUserId = user?.id ?? mockCoach.id;

  useEffect(() => {
    if (!enableGlobalUserSearch || !directoryOpen) return;
    const q = directoryQuery.trim();
    if (q.length < 2) {
      setDirectoryUsers([]);
      setDirectoryLoading(false);
      return;
    }
    let cancelled = false;
    setDirectoryLoading(true);
    const id = window.setTimeout(() => {
      fetch(`/api/cloud/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: { ok?: boolean; users?: DirectoryUser[] }) => {
          if (cancelled) return;
          if (data.ok && Array.isArray(data.users)) {
            setDirectoryUsers(data.users);
          } else {
            setDirectoryUsers([]);
          }
        })
        .catch(() => {
          if (!cancelled) setDirectoryUsers([]);
        })
        .finally(() => {
          if (!cancelled) setDirectoryLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [directoryOpen, directoryQuery, enableGlobalUserSearch]);

  useLayoutEffect(() => {
    if (!attachMenuOpen) {
      setAttachMenuCoords(null);
      return;
    }
    const el = attachWrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const menuW = 256;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuW - 8));
      setAttachMenuCoords({ left, bottom: window.innerHeight - r.top + 4 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (attachWrapRef.current?.contains(n)) return;
      if (attachMenuPortalRef.current?.contains(n)) return;
      setAttachMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [attachMenuOpen]);

  const openThreadLastId =
    activeId && (messagesByConv[activeId]?.length ?? 0) > 0
      ? messagesByConv[activeId]![messagesByConv[activeId]!.length - 1]!.id
      : "";

  useEffect(() => {
    if (!activeId) return;
    markConversationRead(activeId);
  }, [activeId, openThreadLastId, markConversationRead]);

  /** Open DM composer ready to type (after tab + conversation switch from group or picker). */
  useEffect(() => {
    const want = focusDraftAfterConvIdRef.current;
    if (!want || activeId !== want || tab !== "dm") return;
    const conv = conversations.find((c) => c.id === want);
    if (!conv || conv.type !== "dm") return;
    focusDraftAfterConvIdRef.current = null;
    let innerRaf = 0;
    const outerRaf = window.requestAnimationFrame(() => {
      innerRaf = window.requestAnimationFrame(() => {
        draftInputRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      window.cancelAnimationFrame(outerRaf);
      if (innerRaf) window.cancelAnimationFrame(innerRaf);
    };
  }, [activeId, tab, conversations]);

  useEffect(() => {
    if (!hydrated || !shouldUseCloudClientApis(user)) {
      setPlayerCloudUserId({});
      setStaffCloudUserId({});
      return;
    }
    const tags = [
      ...new Set([
        ...players.map((p) => normalizeNametagInput(p.linkedNametag ?? "")),
        ...staff.map((s) => normalizeNametagInput(s.linkedNametag ?? "")),
      ].filter(Boolean)),
    ];
    if (tags.length === 0) {
      setPlayerCloudUserId({});
      setStaffCloudUserId({});
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
          const nextPlayers: Record<string, string> = {};
          for (const p of players) {
            const t = normalizeNametagInput(p.linkedNametag ?? "");
            if (!t) continue;
            const row = data.byTag[t];
            if (row?.exists && row.userId) nextPlayers[p.id] = row.userId;
          }
          const nextStaff: Record<string, string> = {};
          for (const s of staff) {
            const t = normalizeNametagInput(s.linkedNametag ?? "");
            if (!t) continue;
            const row = data.byTag[t];
            if (row?.exists && row.userId) nextStaff[s.id] = row.userId;
          }
          setPlayerCloudUserId(nextPlayers);
          setStaffCloudUserId(nextStaff);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setPlayerCloudUserId({});
          setStaffCloudUserId({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, players, staff, user]);

  /** Qualquer utilizador com sessão cloud: lista DMs a partir do servidor (o outro lado passa a ver o fio). */
  useEffect(() => {
    if (!hydrated || !user?.id || !shouldUseCloudClientApis(user)) return;
    let cancelled = false;
    fetch("/api/cloud/chat/dm/threads", { credentials: "include" })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          threads?: Array<{ peerUserId: string; peerName: string; lastBody: string; lastAt: string }>;
        }) => {
          if (cancelled || !data.ok || !data.threads?.length) return;
          hydrateDmThreadsFromCloud(data.threads);
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id, hydrateDmThreadsFromCloud]);

  const playerHasAppAccount = useCallback(
    (playerId: string) => Boolean(playerCloudUserId[playerId]),
    [playerCloudUserId]
  );
  const staffHasAppAccount = useCallback(
    (staffId: string) => Boolean(staffCloudUserId[staffId]),
    [staffCloudUserId]
  );
  const rosterIdHasCloudAccount = useCallback(
    (rosterId: string) =>
      Boolean(playerCloudUserId[rosterId] ?? staffCloudUserId[rosterId]),
    [playerCloudUserId, staffCloudUserId]
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileScreen("chat");
    else setMobileScreen("list");
  }, [isMobile]);

  useEffect(() => {
    if (!hydrated) return;
    if (conversations.length === 0) return;
    if (activeId && conversations.some((c) => c.id === activeId)) return;
    const firstGroup = conversations.find((c) => c.type === "group");
    setActiveId(firstGroup?.id ?? conversations[0]?.id ?? "");
  }, [hydrated, conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId);
  const thread = useMemo(
    () =>
      [...(messagesByConv[activeId] ?? [])].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      ),
    [messagesByConv, activeId]
  );

  useLayoutEffect(() => {
    scrollThreadPendingRef.current = true;
    stickToBottomRef.current = true;
  }, [activeId]);

  useLayoutEffect(() => {
    if (!activeId || !scrollThreadPendingRef.current) return;
    if (thread.length === 0) return;
    const el = threadScrollRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
      scrollThreadPendingRef.current = false;
    };
    run();
    requestAnimationFrame(run);
  }, [activeId, thread]);

  useLayoutEffect(() => {
    const el = threadScrollRef.current;
    if (!el || thread.length === 0) return;
    if (!scrollThreadPendingRef.current && !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
    if (scrollThreadPendingRef.current) scrollThreadPendingRef.current = false;
  }, [thread]);

  const activeDmPeerCloudId = useMemo(() => {
    if (!activeConv || activeConv.type !== "dm" || !user?.id) return null;
    const parsed = parseCloudDmConversationId(activeConv.id);
    if (parsed) {
      return parsed.userIdA === user.id ? parsed.userIdB : parsed.userIdA;
    }
    const legacyRosterId = activeConv.id.startsWith("conv-dm-") ? activeConv.id.slice("conv-dm-".length) : "";
    if (legacyRosterId && !legacyRosterId.includes("__")) {
      return playerCloudUserId[legacyRosterId] ?? staffCloudUserId[legacyRosterId] ?? null;
    }
    return null;
  }, [activeConv, user?.id, playerCloudUserId, staffCloudUserId]);

  const activeDmLegacyRosterId =
    activeConv?.type === "dm" && !parseCloudDmConversationId(activeConv.id)
      ? activeConv.id.replace(/^conv-dm-/, "")
      : null;

  /** Histórico completo ao abrir DM cloud (ambos os lados usam o mesmo id de conversa). */
  useEffect(() => {
    if (!activeConv || activeConv.type !== "dm" || !activeDmPeerCloudId) return;
    if (!parseCloudDmConversationId(activeConv.id)) return;
    if (!shouldUseCloudClientApis(user)) return;

    const convId = activeConv.id;
    let cancelled = false;
    fetch(
      `/api/cloud/chat/dm?peerUserId=${encodeURIComponent(activeDmPeerCloudId)}&since=${encodeURIComponent(new Date(0).toISOString())}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          messages?: Array<{
            id: string;
            authorUserId: string;
            authorName: string;
            body: string;
            sentAt: string;
            attachments?: unknown;
          }>;
        }) => {
          if (cancelled) return;
          if (!data.ok || !data.messages?.length) return;
          const mapped = data.messages.map((m) => mapApiMessage(convId, m));
          mergeRemoteDmMessages(convId, mapped, { viewerActiveConversationId: activeId });
          const last = mapped[mapped.length - 1]!;
          streamSinceRef.current[convId] = last.sentAt;
        }
      )
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeConv?.id, activeDmPeerCloudId, mergeRemoteDmMessages, user, activeId]);

  /**
   * Polling curto (~550 ms): no serverless o mesmo URL SSE não renova o `since` ao reconectar;
   * aqui o `since` vem sempre do ref — o destinatário vê mensagens novas quase de imediato.
   */
  useEffect(() => {
    if (!activeConv || activeConv.type !== "dm" || !activeDmPeerCloudId || !user?.id) return;
    if (!shouldUseCloudClientApis(user)) return;

    const convId = activeConv.id;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const since = streamSinceRef.current[convId] ?? new Date(0).toISOString();
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
            attachments?: unknown;
          }>;
        };
        if (!res.ok || !data.ok || !data.messages?.length) return;
        const mapped = data.messages.map((m) => mapApiMessage(convId, m));
        mergeRemoteDmMessages(convId, mapped, { viewerActiveConversationId: activeId });
        streamSinceRef.current[convId] = mapped[mapped.length - 1]!.sentAt;
      } catch {
        /* offline */
      }
    };

    const id = window.setInterval(() => void poll(), 400);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeConv?.id, activeDmPeerCloudId, mergeRemoteDmMessages, user?.id, activeId]);

  /** Mantém `since` alinhado ao último turno local para não voltar a pedir todo o histórico no 1.º poll. */
  useEffect(() => {
    if (!activeConv || activeConv.type !== "group") return;
    const msgs = messagesByConv[activeConv.id] ?? [];
    if (msgs.length === 0) return;
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
    const last = sorted[sorted.length - 1]!;
    const cur = streamSinceRef.current[activeConv.id];
    if (!cur || new Date(last.sentAt).getTime() > new Date(cur).getTime()) {
      streamSinceRef.current[activeConv.id] = last.sentAt;
    }
  }, [activeConv?.id, activeConv?.type, messagesByConv]);

  /**
   * Grupos na cloud: mensagens chegam ao workspace do destinatário via `group/sync`;
   * polling lê o workspace do utilizador e funde mensagens novas (sem refresh da página).
   */
  useEffect(() => {
    if (!activeConv || activeConv.type !== "group") return;
    if (!shouldUseCloudClientApis(user)) return;

    const convId = activeConv.id;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const since = streamSinceRef.current[convId] ?? new Date(0).toISOString();
      try {
        const res = await fetch(
          `/api/cloud/chat/group/messages?conversationId=${encodeURIComponent(convId)}&since=${encodeURIComponent(since)}`,
          { credentials: "include" }
        );
        const data = (await res.json()) as {
          ok?: boolean;
          messages?: Array<{
            id: string;
            conversationId: string;
            authorId: string;
            authorName: string;
            body: string;
            sentAt: string;
            attachments?: unknown;
            system?: boolean;
          }>;
        };
        if (!res.ok || !data.ok || !data.messages?.length) return;
        const mapped = data.messages.map(mapWorkspaceMessage);
        mergeRemoteDmMessages(convId, mapped, { viewerActiveConversationId: activeId });
        streamSinceRef.current[convId] = mapped[mapped.length - 1]!.sentAt;
      } catch {
        /* offline */
      }
    };

    const id = window.setInterval(() => void poll(), 450);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeConv?.id, activeConv?.type, mergeRemoteDmMessages, user, activeId]);

  const canSendDm = useMemo(() => {
    if (!activeConv || activeConv.type !== "dm") return true;
    if (parseCloudDmConversationId(activeConv.id)) return Boolean(activeDmPeerCloudId);
    return activeDmLegacyRosterId ? rosterIdHasCloudAccount(activeDmLegacyRosterId) : false;
  }, [activeConv, activeDmPeerCloudId, activeDmLegacyRosterId, rosterIdHasCloudAccount]);

  const pushPendingAttachment = useCallback(
    (att: ChatAttachment) => {
      const next = [...pendingAttachments, att];
      const err = validateAttachmentPayload(next);
      if (err) {
        alert(err);
        return;
      }
      setPendingAttachments(next);
      setAttachMenuOpen(false);
    },
    [pendingAttachments]
  );

  const onAttachFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const att = await buildChatAttachmentFromFile(file);
      if (!att) return;
      const next = [...pendingAttachments, att];
      const err = validateAttachmentPayload(next);
      if (err) {
        alert(err);
        return;
      }
      setPendingAttachments(next);
    },
    [pendingAttachments]
  );

  const addTrainingAttachment = useCallback(
    (sessionId: string) => {
      const s = trainingSessions.find((x) => x.id === sessionId);
      if (!s) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "training_session",
        name: s.title,
        payloadJson: JSON.stringify({
          sessionId: s.id,
          title: s.title,
          date: s.date,
          durationMin: s.durationMin,
        }),
      });
    },
    [pushPendingAttachment, trainingSessions]
  );

  const addExerciseAttachment = useCallback(
    (exerciseId: string) => {
      const ex = savedTrainingExercises.find((x) => x.id === exerciseId);
      if (!ex) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "saved_exercise",
        name: ex.title,
        ...(ex.videoUrl?.trim() ? { videoUrl: ex.videoUrl.trim() } : {}),
        payloadJson: JSON.stringify({
          exerciseId: ex.id,
          title: ex.title,
          category: ex.category,
          ...(ex.videoUrl?.trim() ? { videoUrl: ex.videoUrl.trim() } : {}),
        }),
      });
    },
    [pushPendingAttachment, savedTrainingExercises]
  );

  const addCatalogVideoAttachment = useCallback(
    (catalogId: string) => {
      const item = catalogItemsWithVideo.find((x) => x.catalogId === catalogId);
      if (!item?.videoUrl?.trim()) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "training_catalog",
        name: item.title,
        videoUrl: item.videoUrl.trim(),
        payloadJson: JSON.stringify({
          catalogId: item.catalogId,
          title: item.title,
          videoUrl: item.videoUrl.trim(),
          phase: item.phase,
          durationMin: item.durationMin,
        }),
      });
    },
    [pushPendingAttachment, catalogItemsWithVideo]
  );

  const addSketchFullWorkspaceAttachment = useCallback(() => {
    pushPendingAttachment({
      id: uidAttachment(),
      kind: "sketch_board",
      name: isPt ? "Sketch Area (completo)" : "Sketch Area (full)",
      payloadJson: JSON.stringify(sketchArea),
    });
  }, [pushPendingAttachment, sketchArea, isPt]);

  const addSketchNoteToChat = useCallback(
    (noteId: string) => {
      const n = sketchArea.notes.find((x) => x.id === noteId);
      if (!n) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "sketch_note",
        name: n.title.trim() || (isPt ? "Nota" : "Note"),
        payloadJson: JSON.stringify(n),
      });
    },
    [sketchArea.notes, pushPendingAttachment, isPt]
  );

  const addSketchFileToChat = useCallback(
    (fileId: string) => {
      const f = sketchArea.files.find((x) => x.id === fileId);
      if (!f) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "sketch_saved_file",
        name: f.name.trim() || (isPt ? "Ficheiro" : "File"),
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        payloadJson: JSON.stringify(f),
      });
    },
    [sketchArea.files, pushPendingAttachment, isPt]
  );

  const addSketchBoardDraftToChat = useCallback(
    (draftId: string) => {
      const d = sketchArea.boardDrafts.find((x) => x.id === draftId);
      if (!d) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "sketch_board_draft",
        name: d.title.trim() || (isPt ? "Quadro" : "Board"),
        payloadJson: JSON.stringify(d),
      });
    },
    [sketchArea.boardDrafts, pushPendingAttachment, isPt]
  );

  const addSketchTaskToChat = useCallback(
    (taskId: string) => {
      const t = sketchArea.tasks.find((x) => x.id === taskId);
      if (!t) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "sketch_task",
        name: t.title.trim() || (isPt ? "Tarefa" : "Task"),
        payloadJson: JSON.stringify(t),
      });
    },
    [sketchArea.tasks, pushPendingAttachment, isPt]
  );

  const addSketchCalendarEventToChat = useCallback(
    (eventId: string) => {
      const ev = sketchArea.calendarEvents.find((x) => x.id === eventId);
      if (!ev) return;
      pushPendingAttachment({
        id: uidAttachment(),
        kind: "sketch_calendar_event",
        name: ev.title.trim() || (isPt ? "Evento" : "Event"),
        payloadJson: JSON.stringify(ev),
      });
    },
    [sketchArea.calendarEvents, pushPendingAttachment, isPt]
  );

  const send = async () => {
    const trimmed = draft.trim();
    if ((!trimmed && pendingAttachments.length === 0) || !activeId || !activeConv) return;

    if (activeConv.type === "dm" && !canSendDm) return;

    if (activeConv.type === "dm" && activeDmLegacyRosterId && !rosterIdHasCloudAccount(activeDmLegacyRosterId)) return;

    const attachPayload = pendingAttachments.length ? pendingAttachments : undefined;
    const attErr = validateAttachmentPayload(attachPayload);
    if (attErr) return;

    stickToBottomRef.current = true;
    if (activeConv.type === "dm" && activeDmPeerCloudId && user?.id && shouldUseCloudClientApis(user)) {
      try {
        const res = await fetch("/api/cloud/chat/dm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            peerUserId: activeDmPeerCloudId,
            body: trimmed,
            attachments: attachPayload,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: {
            id: string;
            authorUserId: string;
            authorName: string;
            body: string;
            sentAt: string;
            attachments?: unknown;
          };
        };
        if (res.ok && data.ok && data.message) {
          mergeRemoteDmMessages(activeConv.id, [mapApiMessage(activeConv.id, data.message)], {
            viewerActiveConversationId: activeId,
          });
          streamSinceRef.current[activeConv.id] = data.message.sentAt;
          setDraft("");
          setPendingAttachments([]);
          return;
        }
      } catch {
        /* local fallback */
      }
    }

    sendChatMessage(activeId, trimmed, attachPayload);
    setDraft("");
    setPendingAttachments([]);
  };

  const hasConversations = conversations.length > 0;
  const accountPlayers = useMemo(
    () => players.filter((p) => playerHasAppAccount(p.id)),
    [playerHasAppAccount, players]
  );
  const accountStaff = useMemo(
    () => staff.filter((s) => staffHasAppAccount(s.id)),
    [staff, staffHasAppAccount]
  );
  const playerIdByCloudUserId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [playerId, cloudId] of Object.entries(playerCloudUserId)) out[cloudId] = playerId;
    return out;
  }, [playerCloudUserId]);
  const staffIdByCloudUserId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [sid, cloudId] of Object.entries(staffCloudUserId)) out[cloudId] = sid;
    return out;
  }, [staffCloudUserId]);

  const activeGroupPlayers = useMemo(() => {
    if (!activeConv || activeConv.type !== "group") return [];
    return accountPlayers.filter((p) => {
      const peerId = playerCloudUserId[p.id];
      if (!peerId) return false;
      return !activeConv.participantIds.includes(peerId);
    });
  }, [accountPlayers, activeConv, playerCloudUserId]);
  const activeGroupStaff = useMemo(() => {
    if (!activeConv || activeConv.type !== "group") return [];
    return accountStaff.filter((s) => {
      const peerId = staffCloudUserId[s.id];
      if (!peerId) return false;
      return !activeConv.participantIds.includes(peerId);
    });
  }, [accountStaff, activeConv, staffCloudUserId]);
  const activeGroupMembers = useMemo(() => {
    if (!activeConv || activeConv.type !== "group") return [];
    return activeConv.participantIds.map((participantCloudId) => {
      const playerId = playerIdByCloudUserId[participantCloudId];
      const staffId = staffIdByCloudUserId[participantCloudId];
      const player = playerId ? players.find((p) => p.id === playerId) : null;
      const staffMember = staffId ? staff.find((s) => s.id === staffId) : null;
      return {
        participantCloudId,
        player,
        staffMember,
      };
    });
  }, [activeConv, playerIdByCloudUserId, staffIdByCloudUserId, players, staff]);

  useEffect(() => {
    if (activeConv?.type === "group") setManageGroupNameDraft(activeConv.title);
  }, [activeConv?.id, activeConv?.title, activeConv?.type]);

  const toggleCreatePlayer = (playerId: string) => {
    setSelectedCreatePlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleManagePlayer = (playerId: string) => {
    setSelectedManagePlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleCreateStaff = (staffId: string) => {
    setSelectedCreateStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const toggleManageStaff = (staffId: string) => {
    setSelectedManageStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PlayerPickerModal
        open={dmPickerOpen}
        title={isPt ? "Mensagem direta" : "Direct message"}
        players={players}
        staff={staff}
        playerDisabled={(p) => !playerHasAppAccount(p.id)}
        staffDisabled={(s) => !staffHasAppAccount(s.id)}
        disabledHint={isPt ? "Sem conta na app (associa o nametag em Equipa)" : "No app account yet (link nametag in Team)"}
        onClose={() => setDmPickerOpen(false)}
        onSelect={(p) => {
          const peer = playerCloudUserId[p.id];
          const id = createDmWithPlayer(p, { peerCloudUserId: peer ?? null });
          if (id) {
            focusDraftAfterConvIdRef.current = id;
            setActiveId(id);
            setTab("dm");
            setDmPickerOpen(false);
          }
        }}
        onSelectStaff={(s) => {
          const peer = staffCloudUserId[s.id];
          const id = createDmWithStaff(s, { peerCloudUserId: peer ?? null });
          if (id) {
            focusDraftAfterConvIdRef.current = id;
            setActiveId(id);
            setTab("dm");
            setDmPickerOpen(false);
          }
        }}
        emptyHint={
          isPt
            ? "Adiciona jogadores ou staff em Equipa e associa o nametag de conta."
            : "Add players or staff in Team and link their account nametag."
        }
      />
      <GroupEditorModal
        open={createGroupOpen}
        mode="create"
        title={isPt ? "Criar novo grupo" : "Create new group"}
        players={accountPlayers}
        staff={accountStaff}
        selectedIds={selectedCreatePlayerIds}
        selectedStaffIds={selectedCreateStaffIds}
        groupName={groupNameDraft}
        onGroupNameChange={setGroupNameDraft}
        onTogglePlayer={toggleCreatePlayer}
        onToggleStaff={toggleCreateStaff}
        onClose={() => {
          setCreateGroupOpen(false);
          setGroupNameDraft("");
          setSelectedCreatePlayerIds([]);
          setSelectedCreateStaffIds([]);
        }}
        onSubmit={() => {
          const fromPlayers = selectedCreatePlayerIds
            .map((id) => {
              const player = players.find((p) => p.id === id);
              const peerId = playerCloudUserId[id];
              if (!player || !peerId) return null;
              return { participantId: peerId, name: player.name };
            })
            .filter((m): m is { participantId: string; name: string } => Boolean(m));
          const fromStaff = selectedCreateStaffIds
            .map((id) => {
              const sm = staff.find((s) => s.id === id);
              const peerId = staffCloudUserId[id];
              if (!sm || !peerId) return null;
              return { participantId: peerId, name: sm.name };
            })
            .filter((m): m is { participantId: string; name: string } => Boolean(m));
          const members = [...fromPlayers, ...fromStaff];
          const id = createGroupConversation(groupNameDraft, members);
          setActiveId(id);
          setTab("group");
          setCreateGroupOpen(false);
          setGroupNameDraft("");
          setSelectedCreatePlayerIds([]);
          setSelectedCreateStaffIds([]);
        }}
        emptyHint={
          isPt
            ? "Ainda não tens jogadores nem staff com conta na app para grupos."
            : "No players or staff with app accounts to add to a group yet."
        }
        canEditName
      />
      {enableGlobalUserSearch && directoryOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-surface-border bg-surface p-4">
            <p className="font-display text-lg font-semibold text-white">{isPt ? "Mensagem para qualquer conta" : "Message any app account"}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {isPt ? "Pesquisa por nome, email ou @nametag." : "Search by name, email, or @nametag."}
            </p>
            <Input
              className="mt-3"
              value={directoryQuery}
              onChange={(e) => setDirectoryQuery(e.target.value)}
              placeholder={isPt ? "Ex.: João, joao@email.com, @joao" : "E.g. John, john@email.com, @john"}
            />
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {directoryLoading ? (
                <p className="text-sm text-zinc-500">{isPt ? "A pesquisar..." : "Searching..."}</p>
              ) : directoryQuery.trim().length < 2 ? (
                <p className="text-sm text-zinc-500">{isPt ? "Escreve pelo menos 2 caracteres." : "Type at least 2 characters."}</p>
              ) : directoryUsers.length === 0 ? (
                <p className="text-sm text-zinc-500">{isPt ? "Sem resultados." : "No results."}</p>
              ) : (
                directoryUsers.map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-left hover:bg-white/5"
                    onClick={() => {
                      const id = createDmWithAccount({
                        userId: u.userId,
                        name: u.name,
                        subtitle: u.subtitle,
                      });
                      if (id) {
                        focusDraftAfterConvIdRef.current = id;
                        setActiveId(id);
                        setTab("dm");
                        setDirectoryOpen(false);
                        setDirectoryQuery("");
                        setDirectoryUsers([]);
                      }
                    }}
                  >
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.subtitle}</p>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setDirectoryOpen(false)}>
                {isPt ? "Fechar" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {manageGroupOpen && activeConv?.type === "group" ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-surface-border bg-surface p-4">
            <p className="font-display text-lg font-semibold text-white">
              {isPt ? "Membros do grupo" : "Group members"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {activeConv.participantIds.length} {isPt ? "membros" : "members"}
            </p>
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
              {activeGroupMembers.map(({ participantCloudId, player, staffMember }) => {
                const isPrimaryAdmin = activeConv.groupPrimaryAdminId === participantCloudId;
                const isSecondaryAdmin = Boolean(activeConv.groupAdminIds?.includes(participantCloudId));
                const displayName =
                  player?.name ??
                  staffMember?.name ??
                  (participantCloudId === coachUserId ? (isPt ? "Tu" : "You") : "Unknown user");
                return (
                  <button
                    key={participantCloudId}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-surface-border px-3 py-2 text-left hover:bg-white/5"
                    onClick={() =>
                      setSelectedMemberCloudId((prev) => (prev === participantCloudId ? null : participantCloudId))
                    }
                  >
                    <span className="text-sm text-white">{displayName}</span>
                    <span className="text-[11px] text-zinc-400">
                      {isPrimaryAdmin ? (isPt ? "Admin principal" : "Primary admin") : isSecondaryAdmin ? "Admin" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-surface-border p-3">
              <p className="text-sm font-semibold text-white">{isPt ? "Nome do grupo" : "Group name"}</p>
              <Input
                className="mt-2"
                value={manageGroupNameDraft}
                onChange={(e) => setManageGroupNameDraft(e.target.value)}
                placeholder={isPt ? "Ex.: Dumiense 2025/26" : "E.g. Dumiense 2025/26"}
              />
              <p className="mt-3 text-sm font-semibold text-white">{isPt ? "Adicionar pessoas" : "Add people"}</p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {activeGroupPlayers.length === 0 && activeGroupStaff.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    {isPt
                      ? "Todas as pessoas com conta já estão neste grupo."
                      : "Everyone with an app account is already in this group."}
                  </p>
                ) : (
                  <>
                    {activeGroupPlayers.length > 0 ? (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        {isPt ? "Jogadores" : "Players"}
                      </p>
                    ) : null}
                    {activeGroupPlayers.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={selectedManagePlayerIds.includes(p.id)}
                          onChange={() => toggleManagePlayer(p.id)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                    {activeGroupStaff.length > 0 ? (
                      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Staff
                      </p>
                    ) : null}
                    {activeGroupStaff.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={selectedManageStaffIds.includes(s.id)}
                          onChange={() => toggleManageStaff(s.id)}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
            {selectedMemberCloudId ? (
              <div className="mt-3 rounded-xl border border-surface-border p-3">
                {(() => {
                  const memberPlayerId = playerIdByCloudUserId[selectedMemberCloudId];
                  const memberStaffId = staffIdByCloudUserId[selectedMemberCloudId];
                  const memberPlayer = memberPlayerId ? players.find((p) => p.id === memberPlayerId) : null;
                  const memberStaff = memberStaffId ? staff.find((s) => s.id === memberStaffId) : null;
                  const isMe = selectedMemberCloudId === coachUserId;
                  const actorIsAdmin =
                    activeConv.groupPrimaryAdminId === coachUserId ||
                    Boolean(activeConv.groupAdminIds?.includes(coachUserId));
                  const addedByActor = activeConv.groupMemberMeta?.[selectedMemberCloudId]?.addedById === coachUserId;
                  const canExpel = !isMe && (actorIsAdmin || addedByActor);
                  const selectedIsAdmin =
                    activeConv.groupPrimaryAdminId === selectedMemberCloudId ||
                    Boolean(activeConv.groupAdminIds?.includes(selectedMemberCloudId));
                  const memberLabel = memberPlayer?.name ?? memberStaff?.name ?? "Member";
                  return (
                    <>
                      <p className="text-sm font-semibold text-white">{memberLabel}</p>
                      {memberPlayer ? (
                        <p className="mt-1 text-xs text-zinc-400">
                          #{memberPlayer.number} - {memberPlayer.position}
                        </p>
                      ) : null}
                      {memberStaff && !memberPlayer ? (
                        <p className="mt-1 text-xs text-zinc-400">{memberStaff.role}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {memberPlayer ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const id = createDmWithPlayer(memberPlayer, {
                                peerCloudUserId: selectedMemberCloudId,
                              });
                              if (id) {
                                focusDraftAfterConvIdRef.current = id;
                                setActiveId(id);
                                setTab("dm");
                                setManageGroupOpen(false);
                                setSelectedMemberCloudId(null);
                              }
                            }}
                          >
                            {isPt ? "Mensagem Direta" : "Direct Message"}
                          </Button>
                        ) : null}
                        {memberStaff && !memberPlayer ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const id = createDmWithStaff(memberStaff, {
                                peerCloudUserId: selectedMemberCloudId,
                              });
                              if (id) {
                                focusDraftAfterConvIdRef.current = id;
                                setActiveId(id);
                                setTab("dm");
                                setManageGroupOpen(false);
                                setSelectedMemberCloudId(null);
                              }
                            }}
                          >
                            {isPt ? "Mensagem Direta" : "Direct Message"}
                          </Button>
                        ) : null}
                        {actorIsAdmin && !isMe ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setGroupAdmin(activeConv.id, selectedMemberCloudId, !selectedIsAdmin)
                            }
                          >
                            {selectedIsAdmin
                              ? isPt
                                ? "Remover admin"
                                : "Remove admin"
                              : isPt
                                ? "Tornar admin"
                                : "Make admin"}
                          </Button>
                        ) : null}
                        {canExpel ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              removeParticipantFromGroupChat(activeConv.id, selectedMemberCloudId);
                              setSelectedMemberCloudId(null);
                            }}
                          >
                            {isPt ? "Expulsar do Grupo" : "Remove from group"}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={async () => {
                  if (!activeConv || activeConv.type !== "group") return;
                  setSavingGroupSettings(true);
                  if (manageGroupNameDraft.trim() && manageGroupNameDraft.trim() !== activeConv.title) {
                    await updateGroupConversation(activeConv.id, { title: manageGroupNameDraft });
                  }
                  const fromPlayers = selectedManagePlayerIds
                    .map((id) => {
                      const player = players.find((p) => p.id === id);
                      const peerId = playerCloudUserId[id];
                      if (!player || !peerId) return null;
                      return { participantId: peerId, name: player.name };
                    })
                    .filter((m): m is { participantId: string; name: string } => Boolean(m));
                  const fromStaff = selectedManageStaffIds
                    .map((id) => {
                      const sm = staff.find((s) => s.id === id);
                      const peerId = staffCloudUserId[id];
                      if (!sm || !peerId) return null;
                      return { participantId: peerId, name: sm.name };
                    })
                    .filter((m): m is { participantId: string; name: string } => Boolean(m));
                  addParticipantsToGroupChat(activeConv.id, [...fromPlayers, ...fromStaff]);
                  setSavingGroupSettings(false);
                  setManageGroupOpen(false);
                  setSelectedManagePlayerIds([]);
                  setSelectedManageStaffIds([]);
                  setSelectedMemberCloudId(null);
                }}
              >
                {isPt ? "Guardar alterações" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setManageGroupOpen(false);
                  setSelectedManagePlayerIds([]);
                  setSelectedManageStaffIds([]);
                  setSelectedMemberCloudId(null);
                }}
              >
                {isPt ? "Fechar" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${isMobile && mobileScreen === "chat" ? "hidden" : "flex flex-wrap gap-2"}`}>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDmPickerOpen(true)}>
          {isPt ? "Nova mensagem direta" : "New direct message"}
        </Button>
        {enableGlobalUserSearch ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setDirectoryOpen(true)}>
            {isPt ? "Nova mensagem (conta app)" : "New message (app account)"}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setCreateGroupOpen(true)}>
          {isPt ? "Criar novo grupo" : "Create new group"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:h-[calc(100vh-10rem)] lg:flex-row lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-surface-border lg:bg-surface-raised/20">
        <div className={`${isMobile && mobileScreen === "chat" ? "hidden" : "flex w-full flex-col border-surface-border lg:w-[320px] lg:border-r"}`}>
          <div className="flex gap-1 border-b border-surface-border p-3">
            <button
              type="button"
              onClick={() => {
                setTab("group");
                if (isMobile) setMobileScreen("list");
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
                if (isMobile) setMobileScreen("list");
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
                  onClick={() => {
                    setActiveId(c.id);
                    if (isMobile) setMobileScreen("chat");
                    stickToBottomRef.current = true;
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className={`${isMobile && mobileScreen === "list" ? "hidden" : "flex min-h-[420px] flex-1 flex-col lg:min-h-0"}`}>
          {activeConv ? (
            <div className="border-b border-surface-border px-4 py-4 lg:px-6">
              <div className="flex items-center gap-2">
                {isMobile ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-zinc-300 hover:bg-white/5"
                    onClick={() => setMobileScreen("list")}
                    aria-label={isPt ? "Voltar à lista" : "Back to list"}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                {activeConv.type === "group" ? (
                  <button
                    type="button"
                    className="font-display font-semibold text-white transition-colors hover:text-accent"
                    onClick={() => setManageGroupOpen(true)}
                  >
                    {activeConv.title}
                  </button>
                ) : (
                  <p className="font-display font-semibold text-white">{activeConv.title}</p>
                )}
              </div>
              {savingGroupSettings ? (
                <p className="text-xs text-amber-400">{isPt ? "A guardar..." : "Saving..."}</p>
              ) : activeConv.subtitle ? (
                <p className="text-xs text-zinc-500">{activeConv.subtitle}</p>
              ) : null}
            </div>
          ) : (
            <div className="border-b border-surface-border px-4 py-4 lg:px-6">
              <p className="font-display font-semibold text-white">{isPt ? "Mensagens" : "Messages"}</p>
              <p className="text-xs text-zinc-500">{isPt ? "Escolhe uma conversa" : "Pick a conversation"}</p>
            </div>
          )}
          <div
            ref={threadScrollRef}
            onScroll={() => {
              const el = threadScrollRef.current;
              if (!el) return;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              stickToBottomRef.current = distanceFromBottom <= 80;
            }}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6"
          >
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
                <div key={m.id} id={`chat-msg-${m.id}`} className="scroll-mt-4">
                  <MessageBubble
                    body={m.body}
                    authorName={m.authorName}
                    sentAt={m.sentAt}
                    mine={!isChannelSystemMessage(m) && m.authorId === coachUserId}
                    system={isChannelSystemMessage(m)}
                    attachments={m.attachments}
                  />
                </div>
              ))
            )}
          </div>
          <div className="border-t border-surface-border p-4 lg:p-6">
            {hasConversations && activeConv ? (
              <>
                {pendingAttachments.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {pendingAttachments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
                      >
                        {a.name ?? a.kind}
                        <button
                          type="button"
                          className="text-zinc-500 hover:text-white"
                          aria-label={isPt ? "Remover anexo" : "Remove attachment"}
                          onClick={() => setPendingAttachments((p) => p.filter((x) => x.id !== a.id))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <div ref={attachWrapRef} className="relative flex shrink-0">
                    <input
                      ref={fileAttachRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,application/pdf,.pdf,.doc,.docx"
                      onChange={(e) => void onAttachFiles(e)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="px-2.5"
                      disabled={activeConv.type === "dm" && !canSendDm}
                      aria-label={isPt ? "Anexar" : "Attach"}
                      aria-expanded={attachMenuOpen}
                      onClick={() => setAttachMenuOpen((o) => !o)}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    {attachMenuOpen && attachMenuCoords
                      ? createPortal(
                          <div
                            ref={attachMenuPortalRef}
                            role="menu"
                            className="max-h-[min(420px,72vh)] w-64 overflow-y-auto rounded-xl border border-surface-border bg-surface p-2 shadow-2xl"
                            style={{
                              position: "fixed",
                              left: attachMenuCoords.left,
                              bottom: attachMenuCoords.bottom,
                              zIndex: 220,
                            }}
                          >
                            <button
                              type="button"
                              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
                              onClick={() => {
                                fileAttachRef.current?.click();
                                setAttachMenuOpen(false);
                              }}
                            >
                              {isPt ? "Ficheiro do dispositivo" : "File from device"}
                            </button>
                            {trainingSessions.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addTrainingAttachment(v);
                                }}
                              >
                                <option value="">{isPt ? "Treino guardado…" : "Saved training…"}</option>
                                {trainingSessions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {savedTrainingExercises.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addExerciseAttachment(v);
                                }}
                              >
                                <option value="">{isPt ? "Exercício guardado…" : "Saved exercise…"}</option>
                                {savedTrainingExercises.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {catalogItemsWithVideo.length > 0 ? (
                              <select
                                className="mt-1 max-h-32 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addCatalogVideoAttachment(v);
                                }}
                              >
                                <option value="">
                                  {isPt ? "Vídeo do catálogo (MP4)…" : "Catalog video (MP4)…"}
                                </option>
                                {catalogItemsWithVideo.map((item) => (
                                  <option key={item.catalogId} value={item.catalogId}>
                                    {item.title}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <p className="mt-2 border-t border-surface-border pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              {isPt ? "Sketch Area" : "Sketch Area"}
                            </p>
                            {sketchNotesPicker.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addSketchNoteToChat(v);
                                }}
                              >
                                <option value="">{isPt ? "Nota…" : "Note…"}</option>
                                {sketchNotesPicker.map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.title || n.id}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {sketchFilesPicker.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addSketchFileToChat(v);
                                }}
                              >
                                <option value="">{isPt ? "Ficheiro / documento…" : "File / document…"}</option>
                                {sketchFilesPicker.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {sketchBoardsPicker.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addSketchBoardDraftToChat(v);
                                }}
                              >
                                <option value="">{isPt ? "Quadro táctico…" : "Tactics board…"}</option>
                                {sketchBoardsPicker.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.title}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {sketchTasksPicker.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addSketchTaskToChat(v);
                                }}
                              >
                                <option value="">{isPt ? "Tarefa…" : "Task…"}</option>
                                {sketchTasksPicker.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.completed ? `✓ ${t.title}` : t.title}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {sketchEventsPicker.length > 0 ? (
                              <select
                                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-white"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.currentTarget.value = "";
                                  if (v) addSketchCalendarEventToChat(v);
                                }}
                              >
                                <option value="">{isPt ? "Evento de calendário…" : "Calendar event…"}</option>
                                {sketchEventsPicker.map((ev) => (
                                  <option key={ev.id} value={ev.id}>
                                    {ev.title} · {ev.date}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <button
                              type="button"
                              className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
                              onClick={() => addSketchFullWorkspaceAttachment()}
                            >
                              {isPt ? "Toda a Sketch Area (snapshot)" : "Full Sketch Area (snapshot)"}
                            </button>
                          </div>,
                          document.body
                        )
                      : null}
                  </div>
                  <Input
                    ref={draftInputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send())}
                    placeholder={isPt ? "Escreve uma mensagem…" : "Write a message…"}
                    className="flex-1"
                    disabled={activeConv.type === "dm" && !canSendDm}
                  />
                  <Button
                    type="button"
                    onClick={() => void send()}
                    disabled={
                      (activeConv.type === "dm" && !canSendDm) ||
                      (!draft.trim() && pendingAttachments.length === 0)
                    }
                  >
                    {isPt ? "Enviar" : "Send"}
                  </Button>
                </div>
                {activeConv.type === "dm" && !canSendDm ? (
                  <p className="mt-2 text-[11px] text-amber-500/95">
                    {isPt
                      ? "Esta pessoa ainda não tem conta na app. Associa o nametag em Equipa (jogador ou staff) para enviar mensagens."
                      : "This person has no app account yet. Link their nametag in Team (player or staff) to send messages."}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-zinc-600">
                    {isPt
                      ? "DMs e grupos sincronizam entre contas na cloud com pequeno atraso."
                      : "DMs and groups sync through the cloud with a short delay."}
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
