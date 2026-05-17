import type { SketchBoardFrame, SketchBoardText } from "@/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
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
