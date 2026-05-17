import type { SketchBoardFrame } from "@/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  boardSc,
  type SketchBoardPlaybackSpeed,
} from "@/lib/sketch-board";
import {
  renderBoardFrame,
  type BoardRenderOptions,
} from "@/components/sketch/SketchBoardCanvas";
import { recordBoardFramesToVideoBlob } from "@/lib/sketch-board-video-record";

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

/** Grava animação (2+ frames) para download no quadro. */
export async function exportBoardAnimationVideo(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<Blob> {
  if (frames.length < 2) {
    throw new Error("exportBoardAnimationVideo requires at least 2 frames");
  }
  return recordBoardFramesToVideoBlob(frames, opts, speed);
}

/** Grava animação ou frame único — mesmo pipeline que a reprodução em Treinos. */
export async function exportBoardVideoForFrames(
  frames: SketchBoardFrame[],
  opts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<Blob> {
  return recordBoardFramesToVideoBlob(frames, opts, speed);
}
