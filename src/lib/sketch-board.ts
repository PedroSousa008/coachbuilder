import type { SketchBoardDraft, SketchBoardFrame, SketchBoardText, SketchStroke, SketchStrokeTool } from "@/types";

/** Dimensões lógicas do quadro tático (proporção do campo). */
export const BOARD_CANVAS_WIDTH = 2240;
export const BOARD_CANVAS_HEIGHT = 1348;
export const BOARD_CANVAS_ASPECT = BOARD_CANVAS_WIDTH / BOARD_CANVAS_HEIGHT;

/** Dimensões típicas do canvas antes do quadro fixo 2240×1348. */
export const BOARD_REFERENCE_WIDTH = 1790;
export const BOARD_REFERENCE_HEIGHT = 770;

/** Escala uniforme para ícones/jogadores vs. o campo anterior. */
export const BOARD_ELEMENT_SCALE = Math.sqrt(
  (BOARD_CANVAS_WIDTH / BOARD_REFERENCE_WIDTH) * (BOARD_CANVAS_HEIGHT / BOARD_REFERENCE_HEIGHT)
);

export function boardSc(value: number): number {
  return value * BOARD_ELEMENT_SCALE;
}

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

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const lx = x1 + t * dx;
  const ly = y1 + t * dy;
  return Math.hypot(px - lx, py - ly);
}

const LINE_LIKE_TOOLS = new Set<SketchStrokeTool>([
  "line",
  "lineDashed",
  "lineArrow",
  "curve",
  "curveArrow",
  "draw",
  "arrow",
]);

function hitRadiusForTool(tool: SketchStrokeTool): number {
  if (tool === "goal") return boardSc(28);
  if (tool === "miniGoal") return boardSc(18);
  if (tool === "ladder" || tool === "leader") return boardSc(28);
  if (tool === "mannequin") return boardSc(24);
  if (tool === "playerToken") return boardSc(20);
  if (tool === "cone" || tool === "coneTall" || tool === "ball") return boardSc(16);
  if (LINE_LIKE_TOOLS.has(tool)) return boardSc(14);
  return boardSc(14);
}

/** Devolve o índice do elemento clicado (de cima para baixo), ou null. */
export function hitTestStrokeIndex(strokes: SketchStroke[], x: number, y: number): number | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]!;
    const pts = s.points;
    if (pts.length < 1) continue;
    const tol = hitRadiusForTool(s.tool);

    if (LINE_LIKE_TOOLS.has(s.tool) && pts.length >= 2) {
      for (let j = 0; j < pts.length - 1; j++) {
        const [x1, y1] = pts[j]!;
        const [x2, y2] = pts[j + 1]!;
        if (distPointToSegment(x, y, x1, y1, x2, y2) <= tol) return i;
      }
      continue;
    }

    const [px, py] = pts[pts.length - 1]!;
    if (Math.hypot(px - x, py - y) <= tol) return i;
  }
  return null;
}

export function strokeAnchorPoint(stroke: SketchStroke): { x: number; y: number } {
  const pts = stroke.points;
  if (pts.length < 1) return { x: 0, y: 0 };
  if (LINE_LIKE_TOOLS.has(stroke.tool) && pts.length >= 2) {
    const [a, b] = [pts[0]!, pts[pts.length - 1]!];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
  }
  const [x, y] = pts[pts.length - 1]!;
  return { x, y };
}

export function nextGenericNumber(strokes: SketchStroke[]): number {
  let max = 0;
  for (const s of strokes) {
    if (s.tool === "numbered" && s.label != null) max = Math.max(max, s.label);
    if (s.tool === "playerToken" && s.playerNumber != null) max = Math.max(max, s.playerNumber);
  }
  return Math.min(24, max + 1);
}
