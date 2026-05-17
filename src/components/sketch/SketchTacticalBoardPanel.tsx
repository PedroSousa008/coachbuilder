"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/contexts/AppDataContext";
import type { SketchBoardDraft, SketchBoardText, SketchStroke, SketchStrokeTool } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  SketchBoardCanvas,
  BOARD_COLORS,
  NUMBERED_DISK_COLORS,
  boardFrameToDataUrl,
  type SketchBoardCanvasHandle,
} from "./SketchBoardCanvas";
import {
  downloadBlob,
  downloadDataUrl,
  exportBoardAnimationVideo,
} from "@/lib/sketch-board-export";
import { SketchBoardTextLayer } from "./SketchBoardTextLayer";
import { SaveBoardTrainingModal } from "./SaveBoardTrainingModal";
import { buildSavedExerciseFromBoardDraft } from "@/lib/save-board-as-training";
import type { SaveBoardTrainingFormInput } from "@/lib/save-board-as-training";
import { cn } from "@/lib/utils";
import {
  boardUid,
  cloneBoardSnapshot,
  deleteFrame,
  duplicateFrame,
  ensureStrokeIds,
  getActiveFrame,
  interpolateFrameStrokes,
  normalizeBoardDraft,
  nextGenericNumber,
  PITCH_COLOR_PRESETS,
  PLAYBACK_SPEED_MS,
  SKETCH_BOARD_CATEGORIES_PT,
  updateDraftFrame,
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  boardSc,
  strokeAnchorPoint,
  type BoardHistorySnapshot,
  type SketchBoardPlaybackSpeed,
} from "@/lib/sketch-board";

type BoardTool =
  | "select"
  | SketchStrokeTool
  | "text";

const LINE_TOOLS: { id: SketchStrokeTool; label: string }[] = [
  { id: "line", label: "Linha" },
  { id: "lineDashed", label: "Tracejada" },
  { id: "lineArrow", label: "Seta" },
  { id: "curve", label: "Curva" },
  { id: "curveArrow", label: "Curva c/ seta" },
  { id: "draw", label: "Livre" },
];

const EQUIP_TOOLS: { id: SketchStrokeTool; label: string }[] = [
  { id: "ball", label: "Bola" },
  { id: "cone", label: "Cone" },
  { id: "coneTall", label: "Cone alto" },
  { id: "goal", label: "Baliza" },
  { id: "miniGoal", label: "Mini baliza" },
  { id: "ladder", label: "Escada" },
  { id: "poleBase", label: "Estaca" },
  { id: "mannequin", label: "Manequim" },
  { id: "circle", label: "Círculo" },
];

type BoardSelection =
  | { kind: "stroke"; index: number; x: number; y: number }
  | { kind: "text"; id: string; x: number; y: number };

export function SketchTacticalBoardPanel() {
  const { players, sketchArea, setSketchArea, addSavedTrainingExercise } = useAppData();
  const canvasRef = useRef<SketchBoardCanvasHandle>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [frameId, setFrameId] = useState<string | null>(null);
  const [tool, setTool] = useState<BoardTool>("select");
  const [color, setColor] = useState(BOARD_COLORS[0]!);
  const [lineWidth, setLineWidth] = useState(() => Math.round(boardSc(3)));
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pitchPreset, setPitchPreset] = useState("app");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [numberedColor, setNumberedColor] = useState(NUMBERED_DISK_COLORS[0]!);
  const [expanded, setExpanded] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const [showDeleteOption, setShowDeleteOption] = useState(false);
  const lastSelectRef = useRef<{ key: string; at: number } | null>(null);

  const SELECT_DOUBLE_MS = 1000;

  const [undoStack, setUndoStack] = useState<BoardHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BoardHistorySnapshot[]>([]);

  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<SketchBoardPlaybackSpeed>("normal");
  const [playStrokes, setPlayStrokes] = useState<SketchStroke[] | null>(null);
  const [mediaExporting, setMediaExporting] = useState(false);
  const [saveTrainingOpen, setSaveTrainingOpen] = useState(false);
  const [saveTrainingBusy, setSaveTrainingBusy] = useState(false);
  const [saveTrainingNotice, setSaveTrainingNotice] = useState<string | null>(null);

  const activeDraftRaw = useMemo(() => {
    if (sketchArea.boardDrafts.length === 0) return null;
    const id = draftId ?? sketchArea.boardDrafts[0]!.id;
    return sketchArea.boardDrafts.find((d) => d.id === id) ?? sketchArea.boardDrafts[0]!;
  }, [sketchArea.boardDrafts, draftId]);

  const activeDraft = useMemo(
    () => (activeDraftRaw ? normalizeBoardDraft(activeDraftRaw) : null),
    [activeDraftRaw]
  );

  const activeFrame = useMemo(() => {
    if (!activeDraft) return null;
    return getActiveFrame(activeDraft, frameId);
  }, [activeDraft, frameId]);

  useEffect(() => {
    if (activeDraft?.frames?.[0] && !frameId) setFrameId(activeDraft.frames[0].id);
  }, [activeDraft, frameId]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const pushHistory = useCallback(() => {
    if (!activeFrame) return;
    setUndoStack((u) => [...u.slice(-49), cloneBoardSnapshot(activeFrame.strokes, activeFrame.texts)]);
    setRedoStack([]);
  }, [activeFrame]);

  const applyFrame = useCallback(
    (strokes: SketchStroke[], texts: SketchBoardText[]) => {
      if (!activeDraft || !activeFrame) return;
      const next = updateDraftFrame(activeDraft, activeFrame.id, { strokes, texts });
      setSketchArea((s) => ({
        ...s,
        boardDrafts: s.boardDrafts.map((d) => (d.id === next.id ? next : d)),
      }));
    },
    [activeDraft, activeFrame, setSketchArea]
  );

  const saveStrokes = useCallback(
    (strokes: SketchStroke[]) => {
      if (!activeFrame) return;
      pushHistory();
      applyFrame(ensureStrokeIds(strokes), activeFrame.texts);
    },
    [activeFrame, applyFrame, pushHistory]
  );

  const saveTexts = useCallback(
    (texts: SketchBoardText[]) => {
      if (!activeFrame) return;
      pushHistory();
      applyFrame(activeFrame.strokes, texts);
    },
    [activeFrame, applyFrame, pushHistory]
  );

  const undo = () => {
    if (!activeFrame || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, cloneBoardSnapshot(activeFrame.strokes, activeFrame.texts)]);
    applyFrame(prev.strokes, prev.texts);
  };

  const redo = () => {
    if (!activeFrame || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, cloneBoardSnapshot(activeFrame.strokes, activeFrame.texts)]);
    applyFrame(next.strokes, next.texts);
  };

  const ensureDraft = () => {
    if (sketchArea.boardDrafts.length > 0) return;
    const now = new Date().toISOString();
    const d: SketchBoardDraft = normalizeBoardDraft({
      id: boardUid("board"),
      title: "Novo exercício",
      pitchTemplate: "full",
      strokes: [],
      updatedAt: now,
    });
    setSketchArea((s) => ({ ...s, boardDrafts: [d] }));
    setDraftId(d.id);
    setFrameId(d.frames![0]!.id);
  };

  const newDraft = () => {
    const now = new Date().toISOString();
    const d: SketchBoardDraft = normalizeBoardDraft({
      id: boardUid("board"),
      title: `Exercício ${sketchArea.boardDrafts.length + 1}`,
      pitchTemplate: "full",
      strokes: [],
      updatedAt: now,
    });
    setSketchArea((s) => ({ ...s, boardDrafts: [d, ...s.boardDrafts] }));
    setDraftId(d.id);
    setFrameId(d.frames![0]!.id);
    setUndoStack([]);
    setRedoStack([]);
  };

  const updateDraftMeta = (patch: Partial<SketchBoardDraft>) => {
    if (!activeDraft) return;
    const now = new Date().toISOString();
    setSketchArea((s) => ({
      ...s,
      boardDrafts: s.boardDrafts.map((d) =>
        d.id === activeDraft.id ? normalizeBoardDraft({ ...normalizeBoardDraft(d), ...patch, updatedAt: now }) : d
      ),
    }));
  };

  const numberedCountForColor = useMemo(() => {
    if (!activeFrame) return 0;
    return activeFrame.strokes.filter((s) => s.tool === "numbered" && s.color === numberedColor).length;
  }, [activeFrame, numberedColor]);

  const nextNumber = nextGenericNumber(activeFrame?.strokes ?? []);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  const boardRenderOpts = useMemo(() => {
    const p = PITCH_COLOR_PRESETS.find((x) => x.id === pitchPreset) ?? PITCH_COLOR_PRESETS[0]!;
    return {
      pitchTemplate: activeDraft?.pitchTemplate ?? ("full" as const),
      grassA: p.grassA,
      grassB: p.grassB,
    };
  }, [pitchPreset, activeDraft?.pitchTemplate]);

  const frameCount = activeDraft?.frames?.length ?? 1;
  const isMultiFrame = frameCount > 1;

  const framePrintImages = useMemo(() => {
    const frames = activeDraft?.frames ?? (activeFrame ? [activeFrame] : []);
    return frames.map((f, i) => ({
      id: f.id,
      label: f.label || `Frame ${i + 1}`,
      src: boardFrameToDataUrl(f.strokes, f.texts, boardRenderOpts),
    }));
  }, [activeDraft?.frames, activeFrame, boardRenderOpts]);

  const selectionMode = tool === "select" && !playing;

  const applyBoardSelection = useCallback((next: BoardSelection | null) => {
    if (!next) {
      setSelection(null);
      setShowDeleteOption(false);
      lastSelectRef.current = null;
      return;
    }
    const key = next.kind === "stroke" ? `stroke:${next.index}` : `text:${next.id}`;
    const now = Date.now();
    const last = lastSelectRef.current;
    const isDoubleTap = last?.key === key && now - last.at < SELECT_DOUBLE_MS;
    lastSelectRef.current = { key, at: now };
    setSelection(next);
    setShowDeleteOption(isDoubleTap);
  }, []);

  const deleteSelection = useCallback(() => {
    if (!selection || !activeFrame) return;
    pushHistory();
    if (selection.kind === "stroke") {
      const next = activeFrame.strokes.filter((_, i) => i !== selection.index);
      applyFrame(next, activeFrame.texts);
    } else {
      const next = activeFrame.texts.filter((t) => t.id !== selection.id);
      applyFrame(activeFrame.strokes, next);
    }
    setSelection(null);
    setShowDeleteOption(false);
    lastSelectRef.current = null;
  }, [selection, activeFrame, pushHistory, applyFrame]);

  const displayStrokes = playStrokes ?? activeFrame?.strokes ?? [];

  const playbackRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !activeDraft?.frames || activeDraft.frames.length < 2) {
      setPlayStrokes(null);
      return;
    }
    const frames = activeDraft.frames;
    let frameIdx = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const dur = PLAYBACK_SPEED_MS[playSpeed];
      const elapsed = now - start;
      const t = Math.min(1, elapsed / dur);
      const from = frames[frameIdx]!.strokes;
      const to = frames[Math.min(frameIdx + 1, frames.length - 1)]!.strokes;
      setPlayStrokes(interpolateFrameStrokes(from, to, t));
      if (t >= 1) {
        frameIdx += 1;
        if (frameIdx >= frames.length - 1) {
          setPlaying(false);
          setPlayStrokes(null);
          return;
        }
        start = now;
      }
      playbackRef.current = requestAnimationFrame(tick);
    };
    playbackRef.current = requestAnimationFrame(tick);
    return () => {
      if (playbackRef.current != null) cancelAnimationFrame(playbackRef.current);
    };
  }, [playing, activeDraft, playSpeed]);

  const downloadBoardMedia = async () => {
    if (!activeDraft) return;
    const frames = activeDraft.frames ?? (activeFrame ? [activeFrame] : []);
    if (frames.length === 0) return;
    const base =
      (activeDraft.title ?? "quadro")
        .replace(/[^\w\s\-áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/gi, "")
        .trim() || "quadro";

    if (frames.length === 1) {
      const f = frames[0]!;
      const url = boardFrameToDataUrl(f.strokes, f.texts, boardRenderOpts);
      if (url) downloadDataUrl(url, `${base}.png`);
      return;
    }

    setMediaExporting(true);
    try {
      const blob = await exportBoardAnimationVideo(frames, boardRenderOpts, playSpeed);
      downloadBlob(blob, `${base}.webm`);
    } catch {
      alert("Não foi possível exportar o vídeo neste browser. Tenta Chrome ou Edge.");
    } finally {
      setMediaExporting(false);
    }
  };

  const handlePlaceText = useCallback(
    (x: number, y: number) => {
      if (!activeFrame || playing) return;
      const id = boardUid("txt");
      const row: SketchBoardText = {
        id,
        x,
        y,
        text: "",
        color,
        fontSize: Math.round(boardSc(13)),
      };
      pushHistory();
      saveTexts([...activeFrame.texts, row]);
      setEditingTextId(id);
      applyBoardSelection(null);
    },
    [activeFrame, playing, color, pushHistory, saveTexts, applyBoardSelection]
  );

  const finishEditingText = useCallback(() => {
    if (!editingTextId || !activeFrame) {
      setEditingTextId(null);
      return;
    }
    const row = activeFrame.texts.find((t) => t.id === editingTextId);
    if (row && !row.text.trim()) {
      saveTexts(activeFrame.texts.filter((t) => t.id !== editingTextId));
    }
    setEditingTextId(null);
  }, [editingTextId, activeFrame, saveTexts]);

  const printBoard = () => window.print();

  const handleSaveTraining = useCallback(
    async (form: SaveBoardTrainingFormInput) => {
      if (!activeDraft) return;
      setSaveTrainingBusy(true);
      setSaveTrainingNotice(null);
      try {
        const payload = await buildSavedExerciseFromBoardDraft(
          activeDraft,
          form,
          boardRenderOpts,
          playSpeed
        );
        addSavedTrainingExercise(payload);
        setSaveTrainingOpen(false);
        setSaveTrainingNotice(`«${payload.title}» foi adicionado a Treinos → Todos os exercícios.`);
      } catch {
        alert("Não foi possível guardar o exercício. Tenta outro browser ou reduz o número de frames.");
      } finally {
        setSaveTrainingBusy(false);
      }
    },
    [activeDraft, boardRenderOpts, playSpeed, addSavedTrainingExercise]
  );

  if (!activeDraft || !activeFrame) {
    return (
      <Card className="border-surface-border bg-surface-raised/25">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <p className="text-sm text-zinc-500">Cria um quadro tático para desenhar exercícios, táticas e animações.</p>
          <Button type="button" onClick={ensureDraft}>
            <Plus className="h-4 w-4" />
            Novo quadro
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 print:space-y-2",
        expanded && "fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#080b0e] p-4"
      )}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sketch-tactical-print, #sketch-tactical-print * { visibility: visible; }
          #sketch-tactical-print { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; }
          .no-print { display: none !important; }
          .print-board-frames { display: block !important; }
          .print-frame-page { break-after: page; page-break-after: always; }
          .print-frame-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center gap-2">
        {expanded ? (
          <Link href="/app" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        ) : null}
        <Input
          className="max-w-xs font-medium"
          value={activeDraft.title}
          onChange={(e) => updateDraftMeta({ title: e.target.value })}
          aria-label="Nome do exercício"
        />
        <select
          className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-sm"
          value={activeDraft.id}
          onChange={(e) => {
            setDraftId(e.target.value);
            setFrameId(null);
            setUndoStack([]);
            setRedoStack([]);
          }}
        >
          {sketchArea.boardDrafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" className="text-xs" onClick={() => setMetaOpen((v) => !v)}>
          Detalhes
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => void downloadBoardMedia()}
          disabled={mediaExporting}
        >
          <Download className="h-3.5 w-3.5" />
          {mediaExporting ? "A exportar…" : isMultiFrame ? "Vídeo" : "Imagem"}
        </Button>
        <Button type="button" variant="secondary" className="text-xs" onClick={printBoard}>
          PDF
        </Button>
        <Button
          type="button"
          variant="primary"
          className="text-xs"
          onClick={() => setSaveTrainingOpen(true)}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Guardar Treino
        </Button>
        <Button type="button" variant="secondary" className="text-xs" onClick={newDraft}>
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
        <Button type="button" variant="secondary" className="text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {expanded ? "Sair" : "Ecrã inteiro"}
        </Button>
      </div>

      {saveTrainingNotice ? (
        <p className="no-print rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {saveTrainingNotice}
        </p>
      ) : null}

      <SaveBoardTrainingModal
        open={saveTrainingOpen}
        defaultTitle={activeDraft.title}
        saving={saveTrainingBusy}
        onClose={() => !saveTrainingBusy && setSaveTrainingOpen(false)}
        onSubmit={(form) => void handleSaveTraining(form)}
      />

      {metaOpen ? (
        <Card className="no-print border-surface-border bg-surface-raised/20">
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs text-zinc-500">
              Categoria
              <select
                className="h-9 w-full rounded-lg border border-surface-border bg-zinc-900 px-2 text-sm text-white"
                value={activeDraft.category ?? ""}
                onChange={(e) => updateDraftMeta({ category: e.target.value || undefined })}
              >
                <option value="">—</option>
                {SKETCH_BOARD_CATEGORIES_PT.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-zinc-500">
              Objectivo
              <Input value={activeDraft.objective ?? ""} onChange={(e) => updateDraftMeta({ objective: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs text-zinc-500">
              Escalão
              <Input value={activeDraft.ageGroup ?? ""} onChange={(e) => updateDraftMeta({ ageGroup: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs text-zinc-500">
              N.º jogadores
              <Input
                type="number"
                min={0}
                value={activeDraft.playerCount ?? ""}
                onChange={(e) => updateDraftMeta({ playerCount: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="space-y-1 text-xs text-zinc-500">
              Duração
              <Input value={activeDraft.duration ?? ""} onChange={(e) => updateDraftMeta({ duration: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs text-zinc-500 md:col-span-2 lg:col-span-3">
              Notas do treinador
              <textarea
                className="min-h-[56px] w-full rounded-xl border border-surface-border bg-zinc-900/80 px-3 py-2 text-sm text-white"
                value={activeDraft.coachNotes ?? ""}
                onChange={(e) => updateDraftMeta({ coachNotes: e.target.value })}
              />
            </label>
          </CardContent>
        </Card>
      ) : null}

      <div
        id="sketch-tactical-print"
        className={cn("grid min-h-0 gap-4 lg:grid-cols-[220px_1fr_200px]", expanded && "flex-1")}
      >
        {/* Esquerda — jogadores */}
        <Card className="no-print border-surface-border bg-surface-raised/15 lg:max-h-[min(72vh,640px)] lg:overflow-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Jogadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[11px] text-zinc-500">Escolhe e clica no campo. Modo mover para arrastar.</p>
            <div className="max-h-40 space-y-1 overflow-auto">
              {players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm",
                    selectedPlayerId === p.id ? "bg-accent/15 text-accent" : "text-zinc-300 hover:bg-white/5"
                  )}
                  onClick={() => {
                    setSelectedPlayerId(p.id);
                    setTool("playerToken");
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  <Badge variant="muted">#{p.number}</Badge>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs"
              onClick={() => setTool("numbered")}
            >
              Jogador genérico (#{nextNumber})
            </Button>
            <div className="flex flex-wrap gap-1">
              {NUMBERED_DISK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-6 w-6 rounded-full border border-zinc-600"
                  style={{ backgroundColor: c, boxShadow: numberedColor === c ? "0 0 0 2px #ef4444" : undefined }}
                  onClick={() => setNumberedColor(c)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Centro — campo */}
        <div className={cn("relative min-h-[280px] no-print", expanded && "flex min-h-0 flex-1 flex-col")}>
          <div
            data-board-wrap
            className={cn("relative", expanded && "flex min-h-0 flex-1 flex-col")}
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (selectionMode) applyBoardSelection(null);
            }}
          >
            <SketchBoardCanvas
              ref={canvasRef}
              pitchTemplate="full"
              strokes={displayStrokes}
              onStrokesChange={saveStrokes}
              tool={
                tool === "select" || tool === "text"
                  ? "ball"
                  : tool === "playerToken"
                    ? "playerToken"
                    : (tool as SketchStrokeTool)
              }
              color={tool === "numbered" || tool === "playerToken" ? numberedColor : color}
              lineWidth={lineWidth}
              expanded={expanded}
              selectionMode={selectionMode}
              textPlaceMode={tool === "text" && !playing}
              onPlaceText={handlePlaceText}
              onSelectStroke={(index) => {
                if (index == null) {
                  applyBoardSelection(null);
                  return;
                }
                const s = activeFrame.strokes[index];
                if (!s) return;
                const pt = strokeAnchorPoint(s);
                applyBoardSelection({ kind: "stroke", index, x: pt.x, y: pt.y });
              }}
              readOnly={playing}
              pitchColorPresetId={pitchPreset}
              nextNumberLabel={tool === "numbered" ? nextNumber : undefined}
              canPlaceNumbered={numberedCountForColor < 24}
              playerTokenDraft={
                tool === "playerToken" && selectedPlayer
                  ? { playerId: selectedPlayer.id, number: selectedPlayer.number, name: selectedPlayer.name }
                  : null
              }
            />
            <SketchBoardTextLayer
              texts={activeFrame.texts}
              readOnly={playing}
              onChange={saveTexts}
              selectMode={selectionMode}
              selectedTextId={selection?.kind === "text" ? selection.id : null}
              editingTextId={editingTextId}
              onEditingDone={finishEditingText}
              onSelectText={(id, anchor) => {
                if (id == null) {
                  applyBoardSelection(null);
                  return;
                }
                applyBoardSelection({ kind: "text", id, x: anchor.x, y: anchor.y });
              }}
            />
            {showDeleteOption && selection && !playing ? (
              <button
                type="button"
                className="absolute z-30 rounded-md border border-red-500/50 bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow-lg hover:bg-red-500"
                style={{
                  left: `${(selection.x / BOARD_CANVAS_WIDTH) * 100}%`,
                  top: `${(selection.y / BOARD_CANVAS_HEIGHT) * 100}%`,
                  transform: "translate(-50%, calc(-100% - 8px))",
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSelection();
                }}
              >
                Excluir
              </button>
            ) : null}
          </div>
        </div>

        {/* Direita — ferramentas */}
        <Card className="no-print border-surface-border bg-surface-raised/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Ferramentas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-1">
              <ToolBtn
                active={tool === "select"}
                onClick={() => {
                  setTool("select");
                  applyBoardSelection(null);
                }}
                label="Seleccionar"
              />
              <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label="T" icon={<Type className="h-3.5 w-3.5" />} />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Linhas</p>
            <div className="flex flex-wrap gap-1">
              {LINE_TOOLS.map((t) => (
                <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} label={t.label} small />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Elementos</p>
            <div className="flex flex-wrap gap-1">
              {EQUIP_TOOLS.map((t) => (
                <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} label={t.label} small />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Cor</p>
            <div className="flex flex-wrap gap-1">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border border-zinc-600"
                  style={{ backgroundColor: c, boxShadow: color === c ? "0 0 0 2px #ef4444" : undefined }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">Relvado</p>
            <select
              className="h-8 w-full rounded-lg border border-surface-border bg-zinc-900 px-2 text-xs text-white"
              value={pitchPreset}
              onChange={(e) => setPitchPreset(e.target.value)}
            >
              {PITCH_COLOR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              Espessura
              <input type="range" min={1} max={8} value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="flex-1" />
            </label>
            <div className="flex gap-1">
              <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={undo} disabled={undoStack.length === 0}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={redo} disabled={redoStack.length === 0}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs text-red-300"
              onClick={() => {
                if (!confirm("Limpar todo o frame?")) return;
                pushHistory();
                applyFrame([], []);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar frame
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="no-print border-surface-border bg-surface-raised/15">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm text-zinc-300">Frames</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-lg border border-surface-border bg-zinc-900 px-2 text-xs text-white"
              value={playSpeed}
              onChange={(e) => setPlaySpeed(e.target.value as SketchBoardPlaybackSpeed)}
            >
              <option value="slow">Lenta</option>
              <option value="normal">Normal</option>
              <option value="fast">Rápida</option>
            </select>
            <Button
              type="button"
              variant="primary"
              className="text-xs"
              onClick={() => setPlaying((p) => !p)}
              disabled={(activeDraft.frames?.length ?? 0) < 2}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pausar" : "Reproduzir"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setPlaying(false);
                setPlayStrokes(null);
              }}
            >
              <Square className="h-3.5 w-3.5" />
              Parar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeDraft.frames!.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFrameId(f.id);
                  setPlaying(false);
                  setPlayStrokes(null);
                }}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-3 text-left transition-colors",
                  f.id === activeFrame.id
                    ? "border-accent/60 bg-accent/10 text-white"
                    : "border-surface-border bg-zinc-900/50 text-zinc-400 hover:border-zinc-600"
                )}
              >
                <span className="block text-xs font-medium">{f.label || `Frame ${i + 1}`}</span>
                <span className="text-[10px] text-zinc-500">{f.strokes.length} elem.</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                const next = duplicateFrame(activeDraft, activeFrame.id);
                setSketchArea((s) => ({
                  ...s,
                  boardDrafts: s.boardDrafts.map((d) => (d.id === next.id ? next : d)),
                }));
                const newFrame = next.frames!.find((f, i) => next.frames![i - 1]?.id === activeFrame.id) ?? next.frames!.slice(-1)[0]!;
                setFrameId(newFrame.id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar frame
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                const next = duplicateFrame(activeDraft, activeFrame.id);
                setSketchArea((s) => ({
                  ...s,
                  boardDrafts: s.boardDrafts.map((d) => (d.id === next.id ? next : d)),
                }));
                const idx = next.frames!.findIndex((f) => f.id === activeFrame.id);
                const dup = next.frames![idx + 1];
                if (dup) setFrameId(dup.id);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicar frame
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs text-red-300"
              disabled={(activeDraft.frames?.length ?? 0) <= 1}
              onClick={() => {
                const next = deleteFrame(activeDraft, activeFrame.id);
                if (!next) return;
                setSketchArea((s) => ({
                  ...s,
                  boardDrafts: s.boardDrafts.map((d) => (d.id === next.id ? next : d)),
                }));
                setFrameId(next.frames![0]!.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar frame
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="print-board-frames hidden">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-bold text-black">{activeDraft.title}</h1>
          {activeDraft.objective ? <p className="text-sm text-zinc-700">{activeDraft.objective}</p> : null}
          <p className="text-xs text-zinc-500">
            {framePrintImages.length} frame{framePrintImages.length === 1 ? "" : "s"}
          </p>
        </div>
        {framePrintImages.map((f) => (
          <section key={f.id} className="print-frame-page mb-8">
            <h2 className="mb-2 text-sm font-semibold text-black">{f.label}</h2>
            <img src={f.src} alt={f.label} className="w-full rounded-lg border border-zinc-200" />
          </section>
        ))}
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  label,
  small,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  small?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border text-center font-medium transition-colors",
        small ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs",
        active ? "border-accent/50 bg-accent/15 text-white" : "border-surface-border text-zinc-400 hover:border-zinc-600"
      )}
    >
      {icon ?? label}
    </button>
  );
}
