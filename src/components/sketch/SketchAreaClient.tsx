"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  FolderOpen,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PenLine,
  Pin,
  Plus,
  Trash2,
  Users,
  Sparkles,
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import type {
  Player,
  SketchBoardDraft,
  SketchCalendarEvent,
  SketchCalendarEventCategory,
  SketchFileEntry,
  SketchFileFolder,
  SketchFileVisibility,
  SketchPitchTemplate,
  SketchStaffNote,
  SketchStaffNoteCategory,
  SketchTask,
  SketchTaskCategory,
  SketchTaskPriority,
  SketchTaskRecurring,
  SketchStrokeTool,
  SketchWatchlistEntry,
} from "@/types";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import {
  EVENT_CATEGORY_LABELS,
  FILE_FOLDER_LABELS,
  MAX_SKETCH_FILE_BYTES,
  NOTE_CATEGORY_LABELS,
  TASK_CATEGORY_LABELS,
} from "./constants";
import { cn } from "@/lib/utils";
import {
  BOARD_COLORS,
  NUMBERED_DISK_COLORS,
  numberedDiskLabelTextColor,
  SketchBoardCanvas,
} from "./SketchBoardCanvas";
import { SketchOpponentAnalysisPanel } from "./SketchOpponentAnalysisPanel";

type TabId = "calendar" | "notes" | "tasks" | "files" | "board" | "watchlist" | "opponentAi";

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "notes", label: "Notes", icon: PenLine },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "watchlist", label: "Watchlist", icon: Users },
  { id: "opponentAi", label: "Análise Adversário AI", icon: Sparkles },
];

const SKETCH_BOARD_TOOLS: { id: SketchStrokeTool; label: string }[] = [
  { id: "draw", label: "Draw" },
  { id: "arrow", label: "Arrow" },
  { id: "circle", label: "Circle" },
  { id: "cone", label: "Cone" },
  { id: "player", label: "Player" },
  { id: "numbered", label: "Nº" },
];

function sketchUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayDay(): string {
  return calendarDayLisbon(Date.now());
}

function parseDay(iso: string): string {
  if (!iso) return todayDay();
  if (iso.length >= 10) return iso.slice(0, 10);
  return calendarDayLisbon(iso);
}

export function SketchAreaClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabId =
    tabParam === "notes" ||
    tabParam === "tasks" ||
    tabParam === "files" ||
    tabParam === "board" ||
    tabParam === "watchlist" ||
    tabParam === "opponent-ai"
      ? tabParam === "opponent-ai"
        ? "opponentAi"
        : tabParam
      : "calendar";

  const {
    players,
    trainingSessions,
    fixtures,
    sketchArea,
    setSketchArea,
  } = useAppData();

  const [tab, setTab] = useState<TabId>(initialTab);
  const [calDay, setCalDay] = useState(() => todayDay());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"event" | "note" | "task" | "watch" | "file_players" | null>(null);

  const [evtForm, setEvtForm] = useState({
    title: "",
    category: "training" as SketchCalendarEventCategory,
    timeStart: "",
    timeEnd: "",
    location: "",
    notes: "",
    teamScope: false,
    linkedPlayerId: "" as string,
    linkedTrainingSessionId: "" as string,
    linkedFixtureId: "" as string,
  });

  const [noteForm, setNoteForm] = useState({
    category: "training" as SketchStaffNoteCategory,
    title: "",
    body: "",
    tags: "",
    pinned: false,
    linkedPlayerId: "",
    linkedTrainingSessionId: "",
    linkedFixtureId: "",
    attachmentHint: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    category: "personal" as SketchTaskCategory,
    dueDate: "",
    priority: "medium" as SketchTaskPriority,
    recurring: "none" as SketchTaskRecurring,
    reminderEnabled: false,
    linkedPlayerId: "",
    linkedCalendarEventId: "",
  });

  const [fileUrl, setFileUrl] = useState("");
  const [fileFolder, setFileFolder] = useState<SketchFileFolder>("training");
  const [fileVis, setFileVis] = useState<SketchFileVisibility>("private");
  const [fileReviewLater, setFileReviewLater] = useState(false);
  const [filePlayerIds, setFilePlayerIds] = useState<string[]>([]);

  const [boardDraftId, setBoardDraftId] = useState<string | null>(null);
  const [boardTool, setBoardTool] = useState<SketchStrokeTool>("draw");
  const [boardColor, setBoardColor] = useState(BOARD_COLORS[0]!);
  const [boardLine, setBoardLine] = useState(3);
  const [boardPitch, setBoardPitch] = useState<SketchPitchTemplate>("half");
  const [boardNote, setBoardNote] = useState("");
  const [externalWatchForm, setExternalWatchForm] = useState({
    name: "",
    club: "",
    position: "",
  });
  const [boardExpanded, setBoardExpanded] = useState(false);

  const activeDraft = useMemo(() => {
    if (sketchArea.boardDrafts.length === 0) return null;
    const id = boardDraftId ?? sketchArea.boardDrafts[0]!.id;
    return sketchArea.boardDrafts.find((d) => d.id === id) ?? sketchArea.boardDrafts[0]!;
  }, [sketchArea.boardDrafts, boardDraftId]);

  const numberedNextByColor = useMemo(() => {
    if (!activeDraft) return new Map<string, number | null>();
    const m = new Map<string, number | null>();
    for (const c of NUMBERED_DISK_COLORS) {
      const labels = activeDraft.strokes
        .filter((s) => s.tool === "numbered" && s.color === c && s.label != null)
        .map((s) => s.label!);
      const max = labels.length ? Math.max(...labels) : 0;
      m.set(c, max >= 24 ? null : max + 1);
    }
    return m;
  }, [activeDraft]);

  const nextNumberedLabel = useMemo(() => {
    if (!activeDraft || boardTool !== "numbered") return undefined;
    const n = numberedNextByColor.get(boardColor);
    return n ?? undefined;
  }, [activeDraft, boardTool, boardColor, numberedNextByColor]);

  const canPlaceNumberedDisk = boardTool !== "numbered" || nextNumberedLabel != null;

  useEffect(() => {
    if (boardTool === "numbered") {
      setBoardColor((c) => (NUMBERED_DISK_COLORS.includes(c) ? c : NUMBERED_DISK_COLORS[0]!));
    } else {
      setBoardColor((c) => (BOARD_COLORS.includes(c) ? c : BOARD_COLORS[0]!));
    }
  }, [boardTool]);

  const eventsForDay = useMemo(
    () =>
      [...sketchArea.calendarEvents]
        .filter((e) => e.date === calDay)
        .sort((a, b) => (a.timeStart ?? "").localeCompare(b.timeStart ?? "")),
    [sketchArea.calendarEvents, calDay]
  );

  const addEvent = useCallback(() => {
    const title = evtForm.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const row: SketchCalendarEvent = {
      id: sketchUid("evt"),
      title,
      category: evtForm.category,
      date: calDay,
      timeStart: evtForm.timeStart || undefined,
      timeEnd: evtForm.timeEnd || undefined,
      location: evtForm.location.trim() || undefined,
      notes: evtForm.notes.trim() || undefined,
      teamScope: evtForm.teamScope || undefined,
      linkedPlayerId: evtForm.linkedPlayerId || undefined,
      linkedTrainingSessionId: evtForm.linkedTrainingSessionId || undefined,
      linkedFixtureId: evtForm.linkedFixtureId || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, calendarEvents: [row, ...s.calendarEvents] }));
    setEvtForm((f) => ({
      ...f,
      title: "",
      timeStart: "",
      timeEnd: "",
      location: "",
      notes: "",
      teamScope: false,
      linkedPlayerId: "",
      linkedTrainingSessionId: "",
      linkedFixtureId: "",
    }));
  }, [calDay, evtForm, setSketchArea]);

  const addNote = useCallback(() => {
    const title = noteForm.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const tags = noteForm.tags
      .split(/[,#]/g)
      .map((t) => t.trim())
      .filter(Boolean);
    const row: SketchStaffNote = {
      id: sketchUid("note"),
      category: noteForm.category,
      title,
      body: noteForm.body.trim(),
      tags,
      pinned: noteForm.pinned,
      date: todayDay(),
      linkedPlayerId: noteForm.linkedPlayerId || undefined,
      linkedTrainingSessionId: noteForm.linkedTrainingSessionId || undefined,
      linkedFixtureId: noteForm.linkedFixtureId || undefined,
      attachmentHint: noteForm.attachmentHint.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, notes: [row, ...s.notes] }));
    setNoteForm((f) => ({
      ...f,
      title: "",
      body: "",
      tags: "",
      pinned: false,
      linkedPlayerId: "",
      linkedTrainingSessionId: "",
      linkedFixtureId: "",
      attachmentHint: "",
    }));
  }, [noteForm, setSketchArea]);

  const addTask = useCallback(() => {
    const title = taskForm.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const row: SketchTask = {
      id: sketchUid("task"),
      title,
      category: taskForm.category,
      dueDate: taskForm.dueDate || undefined,
      priority: taskForm.priority,
      completed: false,
      linkedPlayerId: taskForm.linkedPlayerId || undefined,
      linkedCalendarEventId: taskForm.linkedCalendarEventId || undefined,
      recurring: taskForm.recurring,
      reminderEnabled: taskForm.reminderEnabled,
      createdAt: now,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, tasks: [row, ...s.tasks] }));
    setTaskForm((f) => ({
      ...f,
      title: "",
      dueDate: "",
      linkedPlayerId: "",
      linkedCalendarEventId: "",
    }));
  }, [taskForm, setSketchArea]);

  const toggleTask = useCallback(
    (id: string, done: boolean) => {
      const now = new Date().toISOString();
      setSketchArea((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: done,
                completedAt: done ? now : undefined,
                updatedAt: now,
              }
            : t
        ),
      }));
    },
    [setSketchArea]
  );

  const taskBuckets = useMemo(() => {
    const t0 = todayDay();
    const open = sketchArea.tasks.filter((t) => !t.completed);
    const done = sketchArea.tasks.filter((t) => t.completed);
    const overdue = open.filter((t) => t.dueDate && t.dueDate < t0);
    const today = open.filter((t) => !t.dueDate || t.dueDate === t0);
    const upcoming = open.filter((t) => t.dueDate && t.dueDate > t0);
    return { overdue, today, upcoming, done };
  }, [sketchArea.tasks]);

  const onDropFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const now = new Date().toISOString();
      for (const file of Array.from(files)) {
        let dataUrl: string | undefined;
        if (file.size <= MAX_SKETCH_FILE_BYTES) {
          dataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = () => rej(new Error("read"));
            r.readAsDataURL(file);
          }).catch(() => undefined);
        }
        const row: SketchFileEntry = {
          id: sketchUid("file"),
          name: file.name,
          folder: fileFolder,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          dataUrl,
          externalUrl: fileUrl.trim() || undefined,
          reviewLater: fileReviewLater,
          visibility: fileVis,
          selectedPlayerIds: fileVis === "selected_players" ? [...filePlayerIds] : undefined,
          createdAt: now,
        };
        setSketchArea((s) => ({ ...s, files: [row, ...s.files] }));
      }
      setFileUrl("");
    },
    [fileFolder, filePlayerIds, fileReviewLater, fileUrl, fileVis, setSketchArea]
  );

  const addExternalFile = useCallback(() => {
    const name = fileUrl.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const row: SketchFileEntry = {
      id: sketchUid("file"),
      name: name.includes("/") ? name.split("/").pop()! : "Link",
      folder: fileFolder,
      mimeType: "text/uri-list",
      sizeBytes: 0,
      externalUrl: name.startsWith("http") ? name : `https://${name}`,
      reviewLater: fileReviewLater,
      visibility: fileVis,
      selectedPlayerIds: fileVis === "selected_players" ? [...filePlayerIds] : undefined,
      createdAt: now,
    };
    setSketchArea((s) => ({ ...s, files: [row, ...s.files] }));
    setFileUrl("");
  }, [fileFolder, filePlayerIds, fileReviewLater, fileUrl, fileVis, setSketchArea]);

  const openPrintSketchTemplate = useCallback(() => {
    const pdfUrl = `${window.location.origin}/images/sketch/printsketch.pdf`;
    const w = window.open(pdfUrl, "_blank");
    if (!w) return;
    w.focus();
    window.setTimeout(() => w.print(), 650);
  }, []);

  const ensureDraft = useCallback(() => {
    if (sketchArea.boardDrafts.length > 0) return;
    const now = new Date().toISOString();
    const d: SketchBoardDraft = {
      id: sketchUid("draft"),
      title: "Session sketch 1",
      pitchTemplate: boardPitch,
      strokes: [],
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, boardDrafts: [d] }));
    setBoardDraftId(d.id);
  }, [boardPitch, setSketchArea, sketchArea.boardDrafts.length]);

  const saveBoardStrokes = useCallback(
    (strokes: SketchBoardDraft["strokes"]) => {
      if (!activeDraft) return;
      const now = new Date().toISOString();
      setSketchArea((s) => ({
        ...s,
        boardDrafts: s.boardDrafts.map((d) =>
          d.id === activeDraft.id ? { ...d, strokes, pitchTemplate: boardPitch, noteAttached: boardNote || undefined, updatedAt: now } : d
        ),
      }));
    },
    [activeDraft, boardNote, boardPitch, setSketchArea]
  );

  const newDraft = useCallback(() => {
    const now = new Date().toISOString();
    const d: SketchBoardDraft = {
      id: sketchUid("draft"),
      title: `Sketch ${sketchArea.boardDrafts.length + 1}`,
      pitchTemplate: boardPitch,
      strokes: [],
      noteAttached: boardNote || undefined,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, boardDrafts: [d, ...s.boardDrafts] }));
    setBoardDraftId(d.id);
  }, [boardNote, boardPitch, setSketchArea, sketchArea.boardDrafts.length]);

  const printBoard = useCallback(() => {
    window.print();
  }, []);

  const addWatch = useCallback(
    (player: Player) => {
      if (sketchArea.watchlist.some((w) => w.playerId === player.id)) return;
      const now = new Date().toISOString();
      const row: SketchWatchlistEntry = {
        id: sketchUid("watch"),
        playerId: player.id,
        focusTags: [],
        latestNote: "",
        nextAction: "",
        clipLinks: [],
        createdAt: now,
        updatedAt: now,
      };
      setSketchArea((s) => ({ ...s, watchlist: [row, ...s.watchlist] }));
    },
    [setSketchArea, sketchArea.watchlist]
  );

  const addExternalWatch = useCallback(() => {
    const name = externalWatchForm.name.trim();
    if (!name) return;
    const nameKey = name.toLowerCase();
    const duplicate = sketchArea.watchlist.some(
      (w) => !w.playerId && (w.externalPlayerName ?? "").trim().toLowerCase() === nameKey
    );
    if (duplicate) return;
    const now = new Date().toISOString();
    const row: SketchWatchlistEntry = {
      id: sketchUid("watch"),
      externalPlayerName: name,
      externalClub: externalWatchForm.club.trim() || undefined,
      externalPosition: externalWatchForm.position.trim() || undefined,
      focusTags: [],
      latestNote: "",
      nextAction: "",
      clipLinks: [],
      createdAt: now,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, watchlist: [row, ...s.watchlist] }));
    setExternalWatchForm({ name: "", club: "", position: "" });
  }, [externalWatchForm, setSketchArea, sketchArea.watchlist]);

  const openPicker = (mode: typeof pickerMode) => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const onPickPlayer = (p: Player) => {
    if (pickerMode === "event") setEvtForm((f) => ({ ...f, linkedPlayerId: p.id }));
    else if (pickerMode === "note") setNoteForm((f) => ({ ...f, linkedPlayerId: p.id }));
    else if (pickerMode === "task") setTaskForm((f) => ({ ...f, linkedPlayerId: p.id }));
    else if (pickerMode === "watch") addWatch(p);
    else if (pickerMode === "file_players") {
      setFilePlayerIds((ids) => (ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id]));
    }
    setPickerOpen(false);
    setPickerMode(null);
  };

  const playerName = (id: string) => players.find((x) => x.id === id)?.name ?? id.slice(0, 6);

  useEffect(() => {
    if (!activeDraft) return;
    setBoardPitch(activeDraft.pitchTemplate);
    setBoardNote(activeDraft.noteAttached ?? "");
  }, [activeDraft?.id]);

  useEffect(() => {
    if (tab !== "board") setBoardExpanded(false);
  }, [tab]);

  useEffect(() => {
    if (!boardExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [boardExpanded]);

  return (
    <div
      className={cn(
        "mx-auto max-w-6xl space-y-6 print:max-w-none",
        boardExpanded &&
          tab === "board" &&
          "fixed inset-0 z-[100] m-0 flex max-h-[100dvh] max-w-none flex-col overflow-hidden bg-[#0a0d10] p-3 sm:p-4"
      )}
    >
      <div className={cn("no-print", boardExpanded && tab === "board" && "hidden")}>
        <h2 className="font-display text-xl font-semibold text-white">Sketch Area</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Daily planning, quick notes, tasks, files, tactical sketches, and player watchlist — your private staff
          workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-surface-border pb-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                tab === id ? "bg-accent/15 text-accent" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <PlayerPickerModal
        open={pickerOpen}
        title="Select player"
        players={players}
        onClose={() => {
          setPickerOpen(false);
          setPickerMode(null);
        }}
        onSelect={onPickPlayer}
      />

      {tab === "calendar" ? (
        <div className="no-print grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>New event</CardTitle>
              <p className="text-xs text-zinc-500">Category, time, location, links to team / player / session / match.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={evtForm.title} onChange={(e) => setEvtForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" />
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-200"
                value={evtForm.category}
                onChange={(e) => setEvtForm((f) => ({ ...f, category: e.target.value as SketchCalendarEventCategory }))}
              >
                {(Object.keys(EVENT_CATEGORY_LABELS) as SketchCalendarEventCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {EVENT_CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="date" value={calDay} onChange={(e) => setCalDay(e.target.value)} />
                <Input
                  type="time"
                  value={evtForm.timeStart}
                  onChange={(e) => setEvtForm((f) => ({ ...f, timeStart: e.target.value }))}
                />
              </div>
              <Input
                type="time"
                value={evtForm.timeEnd}
                onChange={(e) => setEvtForm((f) => ({ ...f, timeEnd: e.target.value }))}
                placeholder="End (optional)"
              />
              <Input value={evtForm.location} onChange={(e) => setEvtForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
              <textarea
                className="min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm text-zinc-200"
                value={evtForm.notes}
                onChange={(e) => setEvtForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={evtForm.teamScope}
                  onChange={(e) => setEvtForm((f) => ({ ...f, teamScope: e.target.checked }))}
                />
                Whole team
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-xs" onClick={() => openPicker("event")}>
                  Link player
                </Button>
                {evtForm.linkedPlayerId ? (
                  <Badge variant="muted">{playerName(evtForm.linkedPlayerId)}</Badge>
                ) : null}
              </div>
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-200"
                value={evtForm.linkedTrainingSessionId}
                onChange={(e) => setEvtForm((f) => ({ ...f, linkedTrainingSessionId: e.target.value }))}
              >
                <option value="">Training session…</option>
                {trainingSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {parseDay(s.date)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-200"
                value={evtForm.linkedFixtureId}
                onChange={(e) => setEvtForm((f) => ({ ...f, linkedFixtureId: e.target.value }))}
              >
                <option value="">Match (fixture)…</option>
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    vs {f.opponent} · {calendarDayLisbon(f.kickoff)}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={addEvent} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add to calendar
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2">
              <div>
                <CardTitle>Day view</CardTitle>
                <p className="text-xs text-zinc-500">{calDay}</p>
              </div>
              <Input type="date" className="max-w-[200px]" value={calDay} onChange={(e) => setCalDay(e.target.value)} />
            </CardHeader>
            <CardContent className="space-y-3">
              {eventsForDay.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No events this day.</p>
              ) : (
                <ul className="space-y-2">
                  {eventsForDay.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised/30 p-3"
                    >
                      <div>
                        <p className="font-medium text-white">{e.title}</p>
                        <p className="text-xs text-zinc-500">
                          {EVENT_CATEGORY_LABELS[e.category]}
                          {e.timeStart ? ` · ${e.timeStart}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                        {e.notes ? <p className="mt-1 text-sm text-zinc-400">{e.notes}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.teamScope ? <Badge variant="accent">Team</Badge> : null}
                          {e.linkedPlayerId ? <Badge variant="muted">{playerName(e.linkedPlayerId)}</Badge> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-red-400"
                        aria-label="Remove"
                        onClick={() =>
                          setSketchArea((s) => ({ ...s, calendarEvents: s.calendarEvents.filter((x) => x.id !== e.id) }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="no-print grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={noteForm.category}
                onChange={(e) => setNoteForm((f) => ({ ...f, category: e.target.value as SketchStaffNoteCategory }))}
              >
                {(Object.keys(NOTE_CATEGORY_LABELS) as SketchStaffNoteCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {NOTE_CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
              <Input value={noteForm.title} onChange={(e) => setNoteForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" />
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                value={noteForm.body}
                onChange={(e) => setNoteForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Body"
              />
              <Input
                value={noteForm.tags}
                onChange={(e) => setNoteForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="Tags (comma-separated)"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={noteForm.pinned}
                  onChange={(e) => setNoteForm((f) => ({ ...f, pinned: e.target.checked }))}
                />
                Pinned
              </label>
              <Button type="button" variant="secondary" className="w-full text-xs" onClick={() => openPicker("note")}>
                Link player
              </Button>
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={noteForm.linkedTrainingSessionId}
                onChange={(e) => setNoteForm((f) => ({ ...f, linkedTrainingSessionId: e.target.value }))}
              >
                <option value="">Link training…</option>
                {trainingSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={noteForm.linkedFixtureId}
                onChange={(e) => setNoteForm((f) => ({ ...f, linkedFixtureId: e.target.value }))}
              >
                <option value="">Link match…</option>
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    vs {f.opponent}
                  </option>
                ))}
              </select>
              <Input
                value={noteForm.attachmentHint}
                onChange={(e) => setNoteForm((f) => ({ ...f, attachmentHint: e.target.value }))}
                placeholder="Attachment hint / link"
              />
              <Button type="button" onClick={addNote} className="w-full">
                Save note
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Library</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[560px] space-y-2 overflow-y-auto">
              {[...sketchArea.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((n) => (
                <div key={n.id} className="rounded-xl border border-surface-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-white">
                        {n.pinned ? <Pin className="h-3.5 w-3.5 text-amber-400" /> : null}
                        {n.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">{NOTE_CATEGORY_LABELS[n.category]} · {n.date}</p>
                    </div>
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-red-400"
                      onClick={() => setSketchArea((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== n.id) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {n.body ? <p className="mt-2 text-sm text-zinc-400">{n.body}</p> : null}
                  {n.tags.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.tags.map((t) => (
                        <Badge key={t} variant="muted">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {sketchArea.notes.length === 0 ? <p className="text-sm text-zinc-500">No notes yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="no-print space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New task</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="What to do" />
              <select
                className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={taskForm.category}
                onChange={(e) => setTaskForm((f) => ({ ...f, category: e.target.value as SketchTaskCategory }))}
              >
                {(Object.keys(TASK_CATEGORY_LABELS) as SketchTaskCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {TASK_CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
              <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
              <select
                className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={taskForm.priority}
                onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as SketchTaskPriority }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                value={taskForm.recurring}
                onChange={(e) => setTaskForm((f) => ({ ...f, recurring: e.target.value as SketchTaskRecurring }))}
              >
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={taskForm.reminderEnabled}
                  onChange={(e) => setTaskForm((f) => ({ ...f, reminderEnabled: e.target.checked }))}
                />
                Reminder flag
              </label>
              <Button type="button" variant="secondary" className="text-xs" onClick={() => openPicker("task")}>
                Link player
              </Button>
              <select
                className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm sm:col-span-2"
                value={taskForm.linkedCalendarEventId}
                onChange={(e) => setTaskForm((f) => ({ ...f, linkedCalendarEventId: e.target.value }))}
              >
                <option value="">Link calendar event…</option>
                {sketchArea.calendarEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {ev.date}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={addTask} className="sm:col-span-2 lg:col-span-3">
                Add task
              </Button>
            </CardContent>
          </Card>

          {(
            [
              ["Overdue", taskBuckets.overdue],
              ["Today / no date", taskBuckets.today],
              ["Upcoming", taskBuckets.upcoming],
              ["Completed", taskBuckets.done],
            ] as const
          ).map(([label, list]) => (
            <Card key={label}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 ? <p className="text-sm text-zinc-500">—</p> : null}
                {list.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border p-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id, !t.completed)}
                        className="mt-0.5 text-zinc-500 hover:text-accent"
                        aria-label={t.completed ? "Mark incomplete" : "Complete"}
                      >
                        {t.completed ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${t.completed ? "text-zinc-500 line-through" : "text-white"}`}>{t.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {TASK_CATEGORY_LABELS[t.category]}
                          {t.dueDate ? ` · due ${t.dueDate}` : ""} · {t.priority}
                          {t.recurring !== "none" ? ` · ${t.recurring}` : ""}
                          {t.reminderEnabled ? " · reminder" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {t.recurring !== "none" && t.completed ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => {
                            const base = sketchArea.tasks.find((x) => x.id === t.id);
                            if (!base?.dueDate) return;
                            const d = new Date(base.dueDate + "T12:00:00");
                            d.setDate(d.getDate() + (base.recurring === "weekly" ? 7 : 1));
                            const next = d.toISOString().slice(0, 10);
                            const now = new Date().toISOString();
                            const row: SketchTask = {
                              ...base,
                              id: sketchUid("task"),
                              completed: false,
                              completedAt: undefined,
                              dueDate: next,
                              createdAt: now,
                              updatedAt: now,
                            };
                            setSketchArea((s) => ({ ...s, tasks: [row, ...s.tasks] }));
                          }}
                        >
                          Next
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-red-400"
                        onClick={() => setSketchArea((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="no-print space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Print and Design your Sketch</CardTitle>
              <p className="text-sm text-zinc-500">
                Open and print `printsketch.pdf` instantly. Replace this file anytime with your own template.
              </p>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={openPrintSketchTemplate}>
                Open and print template
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drop zone & links</CardTitle>
              <p className="text-sm text-zinc-500">Small files store in-browser; large files — paste a cloud link.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-raised/30 px-6 py-12"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void onDropFiles(e.dataTransfer.files);
                }}
              >
                <p className="text-sm text-zinc-400">Drop files here or choose</p>
                <input
                  type="file"
                  multiple
                  className="mt-4 max-w-xs text-xs text-zinc-500"
                  onChange={(e) => void onDropFiles(e.target.files)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                  value={fileFolder}
                  onChange={(e) => setFileFolder(e.target.value as SketchFileFolder)}
                >
                  {(Object.keys(FILE_FOLDER_LABELS) as SketchFileFolder[]).map((k) => (
                    <option key={k} value={k}>
                      {FILE_FOLDER_LABELS[k]}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"
                  value={fileVis}
                  onChange={(e) => setFileVis(e.target.value as SketchFileVisibility)}
                >
                  <option value="private">Private</option>
                  <option value="team">Send to team (flag)</option>
                  <option value="selected_players">Selected players</option>
                  <option value="assistants">Assistant coaches (flag)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={fileReviewLater} onChange={(e) => setFileReviewLater(e.target.checked)} />
                Review later
              </label>
              {fileVis === "selected_players" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openPicker("file_players")}
                  >
                    Toggle players ({filePlayerIds.length})
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Or paste URL (Drive, Dropbox…)" />
                <Button type="button" variant="secondary" onClick={addExternalFile}>
                  Add link
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sketchArea.files.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border p-3">
                  <div>
                    <p className="font-medium text-white">{f.name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {FILE_FOLDER_LABELS[f.folder]} · {f.visibility}
                      {f.reviewLater ? " · review later" : ""}
                    </p>
                    {f.externalUrl ? (
                      <a href={f.externalUrl} className="text-xs text-accent hover:underline" target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-red-400"
                    onClick={() => setSketchArea((s) => ({ ...s, files: s.files.filter((x) => x.id !== f.id) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {sketchArea.files.length === 0 ? <p className="text-sm text-zinc-500">No files yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "board" ? (
        <Card
          className={cn(
            "print:border-0",
            boardExpanded &&
              "flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-transparent shadow-none ring-0"
          )}
        >
          {boardExpanded ? (
            <div className="no-print mb-3 flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-border pb-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
                Back to app
              </Link>
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => setBoardExpanded(false)}
              >
                <Minimize2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                Exit fullscreen
              </Button>
              <p className="ml-auto hidden text-[11px] text-zinc-500 sm:block">
                Touch-friendly drawing · pinch outside to scroll the page when not fullscreen
              </p>
            </div>
          ) : null}
          <CardHeader className="no-print flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Sketch board</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="text-xs" onClick={() => ensureDraft()}>
                Start draft
              </Button>
              <Button type="button" variant="secondary" className="text-xs" onClick={newDraft}>
                New board
              </Button>
              <Button type="button" className="text-xs" onClick={printBoard}>
                Print / PDF
              </Button>
              {sketchArea.boardDrafts.length > 0 && activeDraft ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setBoardExpanded((v) => !v)}
                >
                  {boardExpanded ? (
                    <>
                      <Minimize2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                      Minimize
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                      Fullscreen
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent
            className={cn("space-y-4", boardExpanded && "flex min-h-0 flex-1 flex-col overflow-hidden")}
          >
            {sketchArea.boardDrafts.length > 0 && activeDraft ? (
              <>
                <div className="no-print flex flex-wrap gap-2">
                  <select
                    className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-sm"
                    value={activeDraft.id}
                    onChange={(e) => setBoardDraftId(e.target.value)}
                  >
                    {sketchArea.boardDrafts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-sm"
                    value={boardPitch}
                    onChange={(e) => {
                      const v = e.target.value as SketchPitchTemplate;
                      setBoardPitch(v);
                      setSketchArea((s) => ({
                        ...s,
                        boardDrafts: s.boardDrafts.map((d) => (d.id === activeDraft.id ? { ...d, pitchTemplate: v } : d)),
                      }));
                    }}
                  >
                    <option value="blank">Blank</option>
                    <option value="half">Half pitch</option>
                    <option value="full">Full pitch</option>
                  </select>
                  {SKETCH_BOARD_TOOLS.map(({ id: t, label }) => (
                    <Button
                      key={t}
                      type="button"
                      variant={boardTool === t ? "primary" : "secondary"}
                      className={cn("text-xs", t !== "numbered" && "capitalize")}
                      onClick={() => setBoardTool(t)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {boardTool === "numbered" ? (
                  <div className="no-print space-y-2">
                    <p className="text-xs text-zinc-500">
                      Cada cor tem números 1–24; ao colocar um disco, o próximo valor para essa cor aparece na fila.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {NUMBERED_DISK_COLORS.map((c) => {
                        const next = numberedNextByColor.get(c);
                        const sel = boardColor === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            className={cn(
                              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums shadow-sm transition",
                              sel ? "border-white ring-2 ring-white/40" : "border-zinc-600"
                            )}
                            style={{
                              backgroundColor: c,
                              color: next == null ? "rgba(161,161,170,0.95)" : numberedDiskLabelTextColor(c),
                              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                            }}
                            onClick={() => setBoardColor(c)}
                            aria-label={
                              next == null
                                ? `Cor numerada: já usou os 24 números nesta cor`
                                : `Cor numerada, próximo número ${next}`
                            }
                          >
                            {next == null ? "—" : next}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="no-print flex flex-wrap items-center gap-1">
                    {BOARD_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-7 w-7 rounded-full border border-zinc-600"
                        style={{ backgroundColor: c, boxShadow: boardColor === c ? "0 0 0 2px white" : undefined }}
                        onClick={() => setBoardColor(c)}
                        aria-label={`colour ${c}`}
                      />
                    ))}
                    <Input
                      type="range"
                      min={1}
                      max={8}
                      value={boardLine}
                      onChange={(e) => setBoardLine(Number(e.target.value))}
                      className="w-28"
                    />
                  </div>
                )}
                <textarea
                  className="no-print min-h-[64px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                  placeholder="Note beside sketch (saved with this board)"
                  value={boardNote}
                  onChange={(e) => setBoardNote(e.target.value)}
                  onBlur={() => {
                    if (!activeDraft) return;
                    const now = new Date().toISOString();
                    setSketchArea((s) => ({
                      ...s,
                      boardDrafts: s.boardDrafts.map((d) =>
                        d.id === activeDraft.id ? { ...d, noteAttached: boardNote || undefined, updatedAt: now } : d
                      ),
                    }));
                  }}
                />
                <div
                  id="sketch-print-area"
                  className={cn(boardExpanded && "flex min-h-0 flex-1 flex-col")}
                >
                  <SketchBoardCanvas
                    pitchTemplate={boardPitch}
                    strokes={activeDraft.strokes}
                    onStrokesChange={saveBoardStrokes}
                    tool={boardTool}
                    color={boardColor}
                    lineWidth={boardLine}
                    expanded={boardExpanded}
                    nextNumberLabel={nextNumberedLabel}
                    canPlaceNumbered={canPlaceNumberedDisk}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="no-print text-xs"
                  onClick={() => saveBoardStrokes([])}
                >
                  Clear strokes
                </Button>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Press “Start draft” to open the canvas.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "watchlist" ? (
        <div className="no-print space-y-4">
          <div className="grid gap-4 rounded-2xl border border-surface-border bg-surface-raised/20 p-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-200">Add from your team</p>
              <Button type="button" onClick={() => openPicker("watch")}>
                <Plus className="mr-2 h-4 w-4" />
                Add team player
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-200">Add external player (other teams)</p>
              <div className="grid gap-2">
                <Input
                  value={externalWatchForm.name}
                  onChange={(e) => setExternalWatchForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Player name"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={externalWatchForm.club}
                    onChange={(e) => setExternalWatchForm((f) => ({ ...f, club: e.target.value }))}
                    placeholder="Club (optional)"
                  />
                  <Input
                    value={externalWatchForm.position}
                    onChange={(e) => setExternalWatchForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="Position (optional)"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addExternalWatch}>
                  Add external player
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sketchArea.watchlist.map((w) => {
              const pl = players.find((p) => p.id === w.playerId);
              return (
                <Card key={w.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{pl?.name ?? w.externalPlayerName ?? "Player"}</CardTitle>
                      {!pl && (w.externalClub || w.externalPosition) ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {[w.externalClub, w.externalPosition].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {!pl ? <Badge variant="muted">External</Badge> : null}
                    </div>
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-red-400"
                      onClick={() => setSketchArea((s) => ({ ...s, watchlist: s.watchlist.filter((x) => x.id !== w.id) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <label className="block text-xs text-zinc-500">Focus tags (comma)</label>
                    <Input
                      value={w.focusTags.join(", ")}
                      onChange={(e) => {
                        const tags = e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) => (x.id === w.id ? { ...x, focusTags: tags } : x)),
                        }));
                      }}
                    />
                    <label className="block text-xs text-zinc-500">Latest note</label>
                    <textarea
                      className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                      value={w.latestNote}
                      onChange={(e) =>
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) =>
                            x.id === w.id ? { ...x, latestNote: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <label className="block text-xs text-zinc-500">Next action</label>
                    <Input
                      value={w.nextAction}
                      onChange={(e) =>
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) =>
                            x.id === w.id ? { ...x, nextAction: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <label className="block text-xs text-zinc-500">Reminder</label>
                    <Input
                      value={w.reminderText ?? ""}
                      onChange={(e) =>
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) =>
                            x.id === w.id ? { ...x, reminderText: e.target.value || undefined } : x
                          ),
                        }))
                      }
                    />
                    <label className="block text-xs text-zinc-500">Attendance note</label>
                    <Input
                      value={w.attendanceNote ?? ""}
                      onChange={(e) =>
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) =>
                            x.id === w.id ? { ...x, attendanceNote: e.target.value || undefined } : x
                          ),
                        }))
                      }
                    />
                    <label className="block text-xs text-zinc-500">Clip links (one per line)</label>
                    <textarea
                      className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                      value={w.clipLinks.join("\n")}
                      onChange={(e) =>
                        setSketchArea((s) => ({
                          ...s,
                          watchlist: s.watchlist.map((x) =>
                            x.id === w.id
                              ? {
                                  ...x,
                                  clipLinks: e.target.value
                                    .split("\n")
                                    .map((l) => l.trim())
                                    .filter(Boolean),
                                }
                              : x
                          ),
                        }))
                      }
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {sketchArea.watchlist.length === 0 ? <p className="text-center text-sm text-zinc-500">No players on the watchlist.</p> : null}
        </div>
      ) : null}

      {tab === "opponentAi" ? <SketchOpponentAnalysisPanel /> : null}
    </div>
  );
}
