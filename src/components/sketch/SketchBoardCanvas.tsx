"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SketchPitchTemplate, SketchStroke, SketchStrokeTool } from "@/types";
export const BOARD_COLORS = ["#e4e4e7", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

function drawPitchBackground(ctx: CanvasRenderingContext2D, w: number, h: number, tpl: SketchPitchTemplate) {
  ctx.fillStyle = "#0f2918";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  const m = 24;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  if (tpl === "full" || tpl === "half") {
    ctx.beginPath();
    ctx.moveTo(w / 2, m);
    ctx.lineTo(w / 2, h - m);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (tpl === "half") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(w / 2, m, w / 2 - m, h - m * 2);
  }
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SketchStroke[]) {
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = s.points;
    if (pts.length < 2) continue;

    if (s.tool === "draw") {
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
      ctx.stroke();
    } else if (s.tool === "arrow" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const L = 14;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45));
      ctx.lineTo(x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    } else if (s.tool === "circle" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 4), Math.max(ry, 4), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.tool === "cone") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - 8, y + 8);
      ctx.lineTo(x + 8, y + 8);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    } else if (s.tool === "player") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = s.color + "99";
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.stroke();
    }
  }
}

export function SketchBoardCanvas({
  pitchTemplate,
  strokes,
  onStrokesChange,
  tool,
  color,
  lineWidth,
}: {
  pitchTemplate: SketchPitchTemplate;
  strokes: SketchStroke[];
  onStrokesChange: (next: SketchStroke[]) => void;
  tool: SketchStrokeTool;
  color: string;
  lineWidth: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const currentStroke = useRef<SketchStroke | null>(null);

  const redraw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    if (pitchTemplate !== "blank") drawPitchBackground(ctx, w, h, pitchTemplate);
    drawStrokes(ctx, strokes);
    if (currentStroke.current) drawStrokes(ctx, [currentStroke.current]);
  }, [pitchTemplate, strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const wrap = wrapRef.current;
      const c = ref.current;
      if (!wrap || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(wrap.clientWidth);
      const h = Math.floor(Math.min(420, wrap.clientWidth * 0.58));
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = c.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = ref.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = pos(e);
    setDrawing(true);
    currentStroke.current = {
      tool,
      color,
      lineWidth,
      points: [[x, y]],
    };
    redraw();
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentStroke.current) return;
    const { x, y } = pos(e);
    const s = currentStroke.current;
    if (tool === "draw") {
      s.points.push([x, y]);
    } else {
      s.points = [s.points[0]!, [x, y]];
    }
    redraw();
  };

  const onUp = () => {
    if (!drawing || !currentStroke.current) return;
    setDrawing(false);
    const fin = currentStroke.current;
    currentStroke.current = null;
    if (fin.points.length >= (fin.tool === "draw" ? 2 : 1)) {
      onStrokesChange([...strokes, fin]);
    }
    redraw();
  };

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={ref}
        className="touch-none cursor-crosshair rounded-xl border border-surface-border bg-[#0a0f0c]"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      />
    </div>
  );
}
