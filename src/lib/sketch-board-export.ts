import type { SketchBoardFrame, SketchBoardText } from "@/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  boardSc,
  interpolateFrameStrokes,
  PLAYBACK_SPEED_MS,
  type SketchBoardPlaybackSpeed,
} from "@/lib/sketch-board";
import {
  renderBoardFrame,
  type BoardRenderOptions,
} from "@/components/sketch/SketchBoardCanvas";

const EXPORT_FPS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pickVideoMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function segmentDurationMs(frame: SketchBoardFrame, speed: SketchBoardPlaybackSpeed): number {
  return frame.durationMs > 0 ? frame.durationMs : PLAYBACK_SPEED_MS[speed];
}

function textsForBlend(from: SketchBoardFrame, to: SketchBoardFrame, t: number): SketchBoardText[] {
  return t < 0.5 ? from.texts : to.texts;
}

/** Grava a animação completa (todos os frames) como WebM. */
export async function exportBoardAnimationVideo(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<Blob> {
  if (frames.length < 2) {
    throw new Error("exportBoardAnimationVideo requires at least 2 frames");
  }

  const canvas = document.createElement("canvas");
  canvas.width = BOARD_CANVAS_WIDTH;
  canvas.height = BOARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const mimeType = pickVideoMimeType();
  const stream = canvas.captureStream(EXPORT_FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const blobReady = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const base = mimeType.split(";")[0] ?? "video/webm";
      resolve(new Blob(chunks, { type: base }));
    };
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
  });

  recorder.start(100);
  const stepMs = 1000 / EXPORT_FPS;

  const first = frames[0]!;
  renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, first.strokes, first.texts, opts);
  await sleep(450);

  for (let i = 0; i < frames.length - 1; i++) {
    const from = frames[i]!;
    const to = frames[i + 1]!;
    const duration = segmentDurationMs(from, speed);
    const steps = Math.max(2, Math.ceil(duration / stepMs));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const strokes = interpolateFrameStrokes(from.strokes, to.strokes, t);
      const texts = textsForBlend(from, to, t);
      renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, strokes, texts, opts);
      await sleep(stepMs);
    }
  }

  const last = frames[frames.length - 1]!;
  renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, last.strokes, last.texts, opts);
  await sleep(600);

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return blobReady;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Grelha de frames lado a lado para impressão em sessões de treino. */
export function boardFramesCompositeDataUrl(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  maxW = 2200,
  maxH = 900
): string {
  if (frames.length === 0) return "";

  const n = frames.length;
  const cols = n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const pad = boardSc(12);
  const labelH = boardSc(28);

  const aspect = BOARD_CANVAS_WIDTH / BOARD_CANVAS_HEIGHT;
  let cellW = Math.floor((maxW - pad * (cols + 1)) / cols);
  let cellH = Math.floor((maxH - pad * (rows + 1) - labelH * rows) / rows);
  if (cellW / aspect > cellH) cellW = Math.floor(cellH * aspect);
  else cellH = Math.floor(cellW / aspect);

  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW + pad * (cols + 1);
  canvas.height = rows * (cellH + labelH) + pad * (rows + 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0a0f0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tmp = document.createElement("canvas");
  tmp.width = BOARD_CANVAS_WIDTH;
  tmp.height = BOARD_CANVAS_HEIGHT;
  const tctx = tmp.getContext("2d");
  if (!tctx) return "";

  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = pad + col * (cellW + pad);
    const y0 = pad + row * (cellH + labelH + pad);

    renderBoardFrame(tctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, frame.strokes, frame.texts, opts);
    ctx.drawImage(tmp, x0, y0, cellW, cellH);

    ctx.fillStyle = "rgba(248,250,252,0.92)";
    ctx.font = `600 ${boardSc(11)}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const label = frame.label?.trim() || `Frame ${i + 1}`;
    ctx.fillText(label, x0, y0 + cellH + boardSc(4));
  });

  return canvas.toDataURL("image/jpeg", 0.88);
}

/** Vídeo curto com um único frame (para exercícios sem animação). */
export async function exportBoardStaticHoldVideo(
  frame: SketchBoardFrame,
  opts: BoardRenderOptions,
  holdMs = 2800
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_CANVAS_WIDTH;
  canvas.height = BOARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const mimeType = pickVideoMimeType();
  const stream = canvas.captureStream(EXPORT_FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const blobReady = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const base = mimeType.split(";")[0] ?? "video/webm";
      resolve(new Blob(chunks, { type: base }));
    };
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
  });

  recorder.start(100);
  renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, frame.strokes, frame.texts, opts);
  const steps = Math.max(2, Math.ceil(holdMs / (1000 / EXPORT_FPS)));
  for (let s = 0; s < steps; s++) {
    await sleep(1000 / EXPORT_FPS);
    renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, frame.strokes, frame.texts, opts);
  }
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return blobReady;
}

/** Vídeo da animação ou frame estático se só existir um frame. */
export async function exportBoardVideoForFrames(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<Blob> {
  if (frames.length >= 2) return exportBoardAnimationVideo(frames, opts, speed);
  const frame = frames[0];
  if (!frame) throw new Error("no-frames");
  return exportBoardStaticHoldVideo(frame, opts);
}
