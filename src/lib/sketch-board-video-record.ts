import type { SketchBoardFrame, SketchBoardText } from "@/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  interpolateFrameStrokes,
  PLAYBACK_SPEED_MS,
  type SketchBoardPlaybackSpeed,
} from "@/lib/sketch-board";
import { renderBoardFrame, type BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";

/** Resolução de gravação (metade do quadro — mais fiável no MediaRecorder). */
const RECORD_W = Math.round(BOARD_CANVAS_WIDTH / 2);
const RECORD_H = Math.round(BOARD_CANVAS_HEIGHT / 2);
const RECORD_FPS = 24;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pickVideoMimeType(): string {
  const candidates = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function attachRecordingCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cleanup: () => void;
} {
  const canvas = document.createElement("canvas");
  canvas.width = RECORD_W;
  canvas.height = RECORD_H;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${RECORD_W}px`,
    height: `${RECORD_H}px`,
    opacity: "0.01",
    pointerEvents: "none",
    zIndex: "-1",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    canvas.remove();
    throw new Error("Canvas 2D unavailable");
  }
  return { canvas, ctx, cleanup: () => canvas.remove() };
}

const scratchFull = { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null };

function getScratchFull(): CanvasRenderingContext2D {
  if (!scratchFull.canvas) {
    scratchFull.canvas = document.createElement("canvas");
    scratchFull.canvas.width = BOARD_CANVAS_WIDTH;
    scratchFull.canvas.height = BOARD_CANVAS_HEIGHT;
    scratchFull.ctx = scratchFull.canvas.getContext("2d", { alpha: false });
  }
  if (!scratchFull.ctx) throw new Error("Canvas 2D unavailable");
  return scratchFull.ctx;
}

function drawFrameScaled(
  targetCtx: CanvasRenderingContext2D,
  strokes: import("@/types").SketchStroke[],
  texts: SketchBoardText[],
  opts: BoardRenderOptions
) {
  const fullCtx = getScratchFull();
  renderBoardFrame(fullCtx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, strokes, texts, opts);
  targetCtx.clearRect(0, 0, RECORD_W, RECORD_H);
  targetCtx.drawImage(scratchFull.canvas!, 0, 0, RECORD_W, RECORD_H);
}

function segmentDurationMs(frame: SketchBoardFrame, speed: SketchBoardPlaybackSpeed): number {
  return frame.durationMs > 0 ? frame.durationMs : PLAYBACK_SPEED_MS[speed];
}

function textsForBlend(from: SketchBoardFrame, to: SketchBoardFrame, t: number): SketchBoardText[] {
  return t < 0.5 ? from.texts : to.texts;
}

async function recordCanvasStream(
  drawLoop: (ctx: CanvasRenderingContext2D) => Promise<void>
): Promise<Blob> {
  const { canvas, ctx, cleanup } = attachRecordingCanvas();
  const mimeType = pickVideoMimeType();
  const stream = canvas.captureStream(RECORD_FPS);

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const blobReady = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const type = mimeType.split(";")[0] || "video/webm";
      resolve(new Blob(chunks, { type }));
    };
    recorder.onerror = () => reject(recorder.error ?? new Error("MediaRecorder failed"));
  });

  recorder.start(250);
  await sleep(350);

  await drawLoop(ctx);

  await sleep(400);
  if (recorder.state === "recording") {
    try {
      recorder.requestData();
    } catch {
      /* ignore */
    }
    recorder.stop();
  }
  stream.getTracks().forEach((t) => t.stop());

  const blob = await blobReady;
  cleanup();
  return blob;
}

/** Grava todos os frames do quadro num único vídeo WebM. */
export async function recordBoardFramesToVideoBlob(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<Blob> {
  if (frames.length === 0) throw new Error("no-frames");

  if (frames.length === 1) {
    const frame = frames[0]!;
    const blob = await recordCanvasStream(async (ctx) => {
      const stepMs = 1000 / RECORD_FPS;
      const holdSteps = Math.max(RECORD_FPS * 2, 48);
      for (let s = 0; s < holdSteps; s++) {
        drawFrameScaled(ctx, frame.strokes, frame.texts, opts);
        await sleep(stepMs);
      }
    });
    if (blob.size < 2048) throw new Error("empty-video");
    return blob;
  }

  const blob = await recordCanvasStream(async (ctx) => {
    const stepMs = 1000 / RECORD_FPS;
    const first = frames[0]!;
    drawFrameScaled(ctx, first.strokes, first.texts, opts);
    await sleep(400);

    for (let i = 0; i < frames.length - 1; i++) {
      const from = frames[i]!;
      const to = frames[i + 1]!;
      const duration = segmentDurationMs(from, speed);
      const steps = Math.max(3, Math.ceil(duration / stepMs));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const strokes = interpolateFrameStrokes(from.strokes, to.strokes, t);
        const texts = textsForBlend(from, to, t);
        drawFrameScaled(ctx, strokes, texts, opts);
        await sleep(stepMs);
      }
    }

    const last = frames[frames.length - 1]!;
    drawFrameScaled(ctx, last.strokes, last.texts, opts);
    await sleep(500);
  });

  if (blob.size < 2048) {
    throw new Error("A gravação não produziu vídeo utilizável — tenta Chrome ou Edge.");
  }
  return blob;
}
