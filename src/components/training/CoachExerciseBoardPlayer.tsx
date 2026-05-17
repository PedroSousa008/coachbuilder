"use client";

import { useEffect, useRef } from "react";
import type { SketchBoardFrame } from "@/types";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  interpolateFrameStrokes,
  PLAYBACK_SPEED_MS,
  type SketchBoardPlaybackSpeed,
} from "@/lib/sketch-board";
import { renderBoardFrame, type BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";

type Props = {
  frames: SketchBoardFrame[];
  renderOpts: BoardRenderOptions;
  speed: SketchBoardPlaybackSpeed;
  title?: string;
};

function textsForBlend(from: SketchBoardFrame, to: SketchBoardFrame, t: number) {
  return t < 0.5 ? from.texts : to.texts;
}

export function CoachExerciseBoardPlayer({ frames, renderOpts, speed, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;

    const drawStill = (frame: SketchBoardFrame) => {
      renderBoardFrame(ctx, canvas.width, canvas.height, frame.strokes, frame.texts, renderOpts);
    };

    if (frames.length === 1) {
      drawStill(frames[0]!);
      return;
    }

    let segIndex = 0;
    let segStart = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const from = frames[segIndex]!;
      const to = frames[Math.min(segIndex + 1, frames.length - 1)]!;
      const duration = from.durationMs > 0 ? from.durationMs : PLAYBACK_SPEED_MS[speed];
      const elapsed = now - segStart;
      const t = Math.min(1, elapsed / duration);
      const strokes = interpolateFrameStrokes(from.strokes, to.strokes, t);
      const texts = textsForBlend(from, to, t);
      renderBoardFrame(ctx, canvas.width, canvas.height, strokes, texts, renderOpts);

      if (t >= 1) {
        segIndex += 1;
        if (segIndex >= frames.length - 1) {
          drawStill(frames[frames.length - 1]!);
          segIndex = 0;
        }
        segStart = now;
      }
      raf = requestAnimationFrame(tick);
    };

    drawStill(frames[0]!);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [frames, renderOpts, speed]);

  const aspect = (BOARD_CANVAS_WIDTH / BOARD_CANVAS_HEIGHT) * 100;

  return (
    <div
      className="relative w-full max-h-[360px] overflow-hidden rounded-lg bg-black"
      style={{ paddingBottom: `${aspect}%` }}
      aria-label={title ?? "Animação do exercício"}
    >
      <canvas
        ref={canvasRef}
        width={BOARD_CANVAS_WIDTH}
        height={BOARD_CANVAS_HEIGHT}
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}
