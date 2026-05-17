import type { SketchBoardDraft, SketchBoardFrame, SketchBoardText, SketchStroke } from "@/types";

export const SKETCH_BOARD_CATEGORIES_PT = [
  "Organização ofensiva",
  "Organização defensiva",
  "Transição ofensiva",
  "Transição defensiva",
  "Finalização",
  "Posse",
  "Pressão",
  "Construção",
  "Bola parada",
  "Aquecimento",
] as const;

export type SketchBoardPlaybackSpeed = "slow" | "normal" | "fast";

export const PLAYBACK_SPEED_MS: Record<SketchBoardPlaybackSpeed, number> = {
  slow: 1800,
  normal: 1200,
  fast: 700,
};

export const PITCH_COLOR_PRESETS: { id: string; label: string; grassA: string; grassB: string }[] = [
  { id: "app", label: "App (escuro)", grassA: "#1a3d2e", grassB: "#0f2419" },
  { id: "classic", label: "Clássico", grassA: "#1e6b3d", grassB: "#143d26" },
  { id: "night", label: "Noite", grassA: "#0f2a1f", grassB: "#081810" },
];

export function boardUid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newElementId(): string {
  return boardUid("el");
}

export function emptyFrame(index: number): SketchBoardFrame {
  return {
    id: boardUid("frm"),
    label: `Frame ${index}`,
    strokes: [],
    texts: [],
    durationMs: PLAYBACK_SPEED_MS.normal,
  };
}

/** Garante `frames[]` e espelha `strokes` no frame activo. */
export function normalizeBoardDraft(d: SketchBoardDraft): SketchBoardDraft {
  if (d.frames && d.frames.length > 0) {
    const frames = d.frames.map((f, i) => ({
      ...f,
      label: f.label || `Frame ${i + 1}`,
      texts: f.texts ?? [],
      durationMs: f.durationMs > 0 ? f.durationMs : PLAYBACK_SPEED_MS.normal,
    }));
    const active = frames[0]!;
    return { ...d, frames, strokes: active.strokes };
  }
  const frame: SketchBoardFrame = {
    id: boardUid("frm"),
    label: "Frame 1",
    strokes: d.strokes ?? [],
    texts: [],
    durationMs: PLAYBACK_SPEED_MS.normal,
  };
  return { ...d, frames: [frame], strokes: frame.strokes };
}

export function getActiveFrame(draft: SketchBoardDraft, frameId: string | null): SketchBoardFrame {
  const d = normalizeBoardDraft(draft);
  const id = frameId ?? d.frames![0]!.id;
  return d.frames!.find((f) => f.id === id) ?? d.frames![0]!;
}

export function updateDraftFrame(
  draft: SketchBoardDraft,
  frameId: string,
  patch: Partial<Pick<SketchBoardFrame, "strokes" | "texts" | "label" | "durationMs">>
): SketchBoardDraft {
  const d = normalizeBoardDraft(draft);
  const now = new Date().toISOString();
  const frames = d.frames!.map((f) => {
    if (f.id !== frameId) return f;
    const next = { ...f, ...patch };
    return next;
  });
  const active = frames.find((f) => f.id === frameId) ?? frames[0]!;
  return { ...d, frames, strokes: active.strokes, updatedAt: now };
}

export function duplicateFrame(draft: SketchBoardDraft, frameId: string): SketchBoardDraft {
  const d = normalizeBoardDraft(draft);
  const src = d.frames!.find((f) => f.id === frameId);
  if (!src) return d;
  const clone: SketchBoardFrame = {
    id: boardUid("frm"),
    label: `${src.label} (cópia)`,
    strokes: structuredClone(src.strokes),
    texts: structuredClone(src.texts),
    durationMs: src.durationMs,
  };
  const idx = d.frames!.findIndex((f) => f.id === frameId);
  const frames = [...d.frames!.slice(0, idx + 1), clone, ...d.frames!.slice(idx + 1)];
  return { ...d, frames, strokes: clone.strokes, updatedAt: new Date().toISOString() };
}

export function addFrameAfter(draft: SketchBoardDraft, frameId: string): SketchBoardDraft {
  return duplicateFrame(draft, frameId);
}

export function deleteFrame(draft: SketchBoardDraft, frameId: string): SketchBoardDraft | null {
  const d = normalizeBoardDraft(draft);
  if (d.frames!.length <= 1) return null;
  const frames = d.frames!.filter((f) => f.id !== frameId);
  const active = frames[0]!;
  return { ...d, frames, strokes: active.strokes, updatedAt: new Date().toISOString() };
}

const ANIMATABLE_TOOLS = new Set<SketchStroke["tool"]>(["playerToken", "ball", "numbered", "player"]);

function strokeAnchor(stroke: SketchStroke): [number, number] | null {
  if (stroke.points.length < 1) return null;
  return stroke.points[stroke.points.length - 1]!;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function isAnimatable(s: SketchStroke): boolean {
  return !!s.elementId && ANIMATABLE_TOOLS.has(s.tool);
}

/** Interpola posições de elementos com o mesmo `elementId` entre dois frames. */
export function interpolateFrameStrokes(from: SketchStroke[], to: SketchStroke[], t: number): SketchStroke[] {
  const staticPart = (t < 0.5 ? from : to).filter((s) => !isAnimatable(s));
  const animFrom = from.filter(isAnimatable);
  const animTo = to.filter(isAnimatable);
  const toById = new Map(animTo.map((s) => [s.elementId!, s]));
  const animated: SketchStroke[] = [];

  for (const sf of animFrom) {
    const tt = toById.get(sf.elementId!);
    if (!tt) {
      if (t < 0.5) animated.push(sf);
      continue;
    }
    toById.delete(sf.elementId!);
    const a = strokeAnchor(sf);
    const b = strokeAnchor(tt);
    if (!a || !b) {
      animated.push(t < 0.5 ? sf : tt);
      continue;
    }
    animated.push({
      ...sf,
      points: [[lerp(a[0], b[0], t), lerp(a[1], b[1], t)]],
    });
  }
  for (const tt of toById.values()) {
    if (t >= 0.5) animated.push(tt);
  }
  return [...staticPart, ...animated];
}

export type BoardHistorySnapshot = {
  strokes: SketchStroke[];
  texts: SketchBoardText[];
};

export function cloneBoardSnapshot(strokes: SketchStroke[], texts: SketchBoardText[]): BoardHistorySnapshot {
  return { strokes: structuredClone(strokes), texts: structuredClone(texts) };
}

export function ensureStrokeIds(strokes: SketchStroke[]): SketchStroke[] {
  return strokes.map((s) => (s.elementId ? s : { ...s, elementId: newElementId() }));
}

export function nextGenericNumber(strokes: SketchStroke[]): number {
  let max = 0;
  for (const s of strokes) {
    if (s.tool === "numbered" && s.label != null) max = Math.max(max, s.label);
    if (s.tool === "playerToken" && s.playerNumber != null) max = Math.max(max, s.playerNumber);
  }
  return Math.min(24, max + 1);
}
