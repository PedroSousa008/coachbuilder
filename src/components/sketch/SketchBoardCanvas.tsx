"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { SketchBoardText, SketchPitchTemplate, SketchStroke, SketchStrokeTool } from "@/types";
import { cn } from "@/lib/utils";
import {
  BOARD_CANVAS_HEIGHT,
  BOARD_CANVAS_WIDTH,
  boardSc,
  hitTestStrokeIndex,
  newElementId,
  PITCH_COLOR_PRESETS,
} from "@/lib/sketch-board";

export type SketchBoardCanvasHandle = {
  exportPng: () => string | null;
};

export const BOARD_COLORS = ["#ef4444", "#e4e4e7", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#f8fafc", "#171717"];

/** Paleta para discos numerados (estilo tactical board): cada cor tem sequência 1→24 independente. */
export const NUMBERED_DISK_COLORS = [
  "#7f1d1d",
  "#ca8a04",
  "#9333ea",
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#ea580c",
  "#0891b2",
  "#fafafa",
  "#3f3f46",
];

/** Cor do texto dentro do disco numerado (contraste com o fundo). */
export function numberedDiskLabelTextColor(hex: string): string {
  const n = hex.replace("#", "").trim();
  const full =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n.slice(0, 6);
  if (full.length !== 6) return "#fff";
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.55 ? "#171717" : "#ffffff";
}

function diskOutlineStroke(hex: string): string {
  return numberedDiskLabelTextColor(hex) === "#ffffff" ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.55)";
}

function fillWithAlpha(hex: string, alpha: number): string {
  const n = hex.replace("#", "").trim();
  const full =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n.slice(0, 6);
  if (full.length !== 6) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawNumberedDisk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: number
) {
  const r = boardSc(14);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = diskOutlineStroke(color);
  ctx.lineWidth = boardSc(2);
  ctx.stroke();
  ctx.fillStyle = numberedDiskLabelTextColor(color);
  const size = boardSc(label > 9 ? 12 : 13);
  ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(label), x, y);
}

/** Relva riscada + linhas FIFA (105×68 m) em vista de cima; balizas à esquerda/direita. */
const DEFAULT_GRASS_A = "#1a3d2e";
const DEFAULT_GRASS_B = "#0f2419";
const LINE = "rgba(248, 250, 252, 0.94)";

export function drawPitchBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tpl: SketchPitchTemplate,
  grassA = DEFAULT_GRASS_A,
  grassB = DEFAULT_GRASS_B
) {
  const m = Math.max(16, Math.min(28, Math.round(Math.min(w, h) * 0.04)));
  const xL = m;
  const xR = w - m;
  const yT = m;
  const yB = h - m;
  const pitchW = xR - xL;
  const pitchH = yB - yT;
  const cx = (xL + xR) / 2;
  const cy = (yT + yB) / 2;

  if (tpl === "half") {
    drawHalfPitchBackground(ctx, w, h, grassA, grassB);
    return;
  }

  // Relva com riscas verticais (campo completo / blank)
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    const x0 = xL + (i * pitchW) / stripes;
    const x1 = xL + ((i + 1) * pitchW) / stripes;
    ctx.fillStyle = i % 2 === 0 ? grassA : grassB;
    ctx.fillRect(x0, yT, x1 - x0 + 0.5, pitchH);
  }

  if (tpl === "blank") {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1.5, Math.min(2.5, pitchW * 0.0025));
    ctx.lineJoin = "round";
    ctx.strokeRect(xL, yT, pitchW, pitchH);
    const rc = Math.min(pitchW, pitchH) * 0.018;
    drawCornerArcs(ctx, xL, yT, xR, yB, rc);
    return;
  }

  drawFullPitchBackground(ctx, xL, yT, xR, yB, pitchW, pitchH, cx, cy);
}

/** Campo completo: 105×68 m, balizas nos dois lados. */
function drawFullPitchBackground(
  ctx: CanvasRenderingContext2D,
  xL: number,
  yT: number,
  xR: number,
  yB: number,
  pitchW: number,
  pitchH: number,
  cx: number,
  cy: number
) {
  const sx = pitchW / 105;
  const sy = pitchH / 68;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, pitchW * 0.0025));
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";

  ctx.strokeRect(xL, yT, pitchW, pitchH);

  ctx.beginPath();
  ctx.moveTo(cx, yT);
  ctx.lineTo(cx, yB);
  ctx.stroke();

  const rCenter = 9.15 * sx;
  ctx.beginPath();
  ctx.arc(cx, cy, rCenter, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.2, pitchW * 0.004), 0, Math.PI * 2);
  ctx.fill();

  const dPen = 16.5 * sx;
  const wPen = 40.32 * sy;
  ctx.strokeRect(xL, cy - wPen / 2, dPen, wPen);
  ctx.strokeRect(xR - dPen, cy - wPen / 2, dPen, wPen);

  const dGa = 5.5 * sx;
  const wGa = 18.32 * sy;
  ctx.strokeRect(xL, cy - wGa / 2, dGa, wGa);
  ctx.strokeRect(xR - dGa, cy - wGa / 2, dGa, wGa);

  const pm = 11 * sx;
  const spotR = Math.max(1, pitchW * 0.0035);
  ctx.beginPath();
  ctx.arc(xL + pm, cy, spotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(xR - pm, cy, spotR, 0, Math.PI * 2);
  ctx.fill();

  const rPen = 9.15 * sx;
  const edgeL = xL + dPen;
  const dxL = edgeL - (xL + pm);
  if (rPen > Math.abs(dxL)) {
    const phiL = Math.acos(Math.min(1, Math.max(-1, dxL / rPen)));
    ctx.beginPath();
    ctx.arc(xL + pm, cy, rPen, phiL, Math.PI * 2 - phiL, true);
    ctx.stroke();
  }
  const edgeR = xR - dPen;
  const dxR = xR - pm - edgeR;
  if (rPen > Math.abs(dxR)) {
    const phiR = Math.acos(Math.min(1, Math.max(-1, dxR / rPen)));
    ctx.beginPath();
    ctx.arc(xR - pm, cy, rPen, Math.PI + phiR, Math.PI - phiR, true);
    ctx.stroke();
  }

  const rc = 1 * sx;
  drawCornerArcs(ctx, xL, yT, xR, yB, rc);

  const wGoal = 7.32 * sy;
  const gW = Math.max(2, pitchW * 0.012);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(xL - gW * 0.35, cy - wGoal / 2, gW * 0.85, wGoal);
  ctx.fillRect(xR - gW * 0.5, cy - wGoal / 2, gW * 0.85, wGoal);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, pitchW * 0.0018);
  ctx.strokeRect(xL - gW * 0.35, cy - wGoal / 2, gW * 0.85, wGoal);
  ctx.strokeRect(xR - gW * 0.5, cy - wGoal / 2, gW * 0.85, wGoal);
}

/**
 * Meio-campo: só uma metade (52,5×68 m), golo à esquerda e linha de meio à direita.
 * Círculo central como semicírculo na linha de meio-campo.
 */
function drawHalfPitchBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grassA = DEFAULT_GRASS_A,
  grassB = DEFAULT_GRASS_B
) {
  const m = Math.max(16, Math.min(28, Math.round(Math.min(w, h) * 0.04)));
  const xL = m;
  const xR = w - m;
  const yT = m;
  const yB = h - m;
  const pitchW = xR - xL;
  const pitchH = yB - yT;
  const cy = (yT + yB) / 2;

  const sx = pitchW / 52.5;
  const sy = pitchH / 68;

  const stripes = 7;
  for (let i = 0; i < stripes; i++) {
    const x0 = xL + (i * pitchW) / stripes;
    const x1 = xL + ((i + 1) * pitchW) / stripes;
    ctx.fillStyle = i % 2 === 0 ? grassA : grassB;
    ctx.fillRect(x0, yT, x1 - x0 + 0.5, pitchH);
  }

  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, pitchW * 0.0025));
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";

  ctx.strokeRect(xL, yT, pitchW, pitchH);

  ctx.beginPath();
  ctx.moveTo(xR, yT);
  ctx.lineTo(xR, yB);
  ctx.stroke();

  const rCenter = 9.15 * sx;
  ctx.beginPath();
  ctx.arc(xR, cy, rCenter, Math.PI / 2, (3 * Math.PI) / 2, true);
  ctx.stroke();

  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(xR, cy, Math.max(1.2, pitchW * 0.004), 0, Math.PI * 2);
  ctx.fill();

  const dPen = 16.5 * sx;
  const wPen = 40.32 * sy;
  ctx.strokeRect(xL, cy - wPen / 2, dPen, wPen);

  const dGa = 5.5 * sx;
  const wGa = 18.32 * sy;
  ctx.strokeRect(xL, cy - wGa / 2, dGa, wGa);

  const pm = 11 * sx;
  const spotR = Math.max(1, pitchW * 0.0035);
  ctx.beginPath();
  ctx.arc(xL + pm, cy, spotR, 0, Math.PI * 2);
  ctx.fill();

  const rPen = 9.15 * sx;
  const edgeL = xL + dPen;
  const dxL = edgeL - (xL + pm);
  if (rPen > Math.abs(dxL)) {
    const phiL = Math.acos(Math.min(1, Math.max(-1, dxL / rPen)));
    ctx.beginPath();
    ctx.arc(xL + pm, cy, rPen, phiL, Math.PI * 2 - phiL, true);
    ctx.stroke();
  }

  const rc = 1 * sx;
  ctx.beginPath();
  ctx.arc(xL + rc, yT + rc, rc, Math.PI, Math.PI * 1.5, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xL + rc, yB - rc, rc, Math.PI * 0.5, Math.PI, false);
  ctx.stroke();

  const wGoal = 7.32 * sy;
  const gW = Math.max(2, pitchW * 0.012);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(xL - gW * 0.35, cy - wGoal / 2, gW * 0.85, wGoal);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, pitchW * 0.0018);
  ctx.strokeRect(xL - gW * 0.35, cy - wGoal / 2, gW * 0.85, wGoal);
}

const TWO_POINT_LINE_TOOLS = new Set<SketchStrokeTool>(["line", "lineDashed", "lineArrow"]);
const CURVE_LINE_TOOLS = new Set<SketchStrokeTool>(["curve", "curveArrow"]);

function quadControlFromEndpoints(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const off = Math.min(boardSc(48), len * 0.35);
  return [mx - (dy / len) * off, my + (dx / len) * off];
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size = 10) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(ang - Math.PI / 6), y2 - size * Math.sin(ang - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(ang + Math.PI / 6), y2 - size * Math.sin(ang + Math.PI / 6));
  ctx.stroke();
}

function drawLineStroke(ctx: CanvasRenderingContext2D, s: SketchStroke) {
  const pts = s.points;
  if (pts.length < 2) return;
  const [x1, y1] = pts[0]!;
  const [x2, y2] = pts[pts.length - 1]!;
  const dashed = s.tool === "lineDashed" || s.lineStyle === "dashed";
  ctx.lineWidth = Math.max(1, boardSc(s.lineWidth));
  ctx.setLineDash(dashed ? [boardSc(10), boardSc(7)] : []);
  if (CURVE_LINE_TOOLS.has(s.tool)) {
    const [cx, cy] = quadControlFromEndpoints(x1, y1, x2, y2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (s.tool === "lineArrow" || s.tool === "curveArrow") {
    drawArrowHead(ctx, x1, y1, x2, y2, Math.max(boardSc(8), boardSc(s.lineWidth) * 3));
  }
}

function drawCornerArcs(
  ctx: CanvasRenderingContext2D,
  xL: number,
  yT: number,
  xR: number,
  yB: number,
  rc: number
) {
  const r = Math.max(2, rc);
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.arc(xL + r, yT + r, r, Math.PI, Math.PI * 1.5, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xR - r, yT + r, r, Math.PI * 1.5, Math.PI * 2, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xL + r, yB - r, r, Math.PI * 0.5, Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xR - r, yB - r, r, 0, Math.PI * 0.5, false);
  ctx.stroke();
}

export function drawBoardTexts(ctx: CanvasRenderingContext2D, texts: SketchBoardText[]) {
  for (const t of texts) {
    if (!t.text.trim()) continue;
    const fontSize = t.fontSize ?? boardSc(13);
    ctx.fillStyle = t.color;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = t.text.split("\n");
    const lineHeight = fontSize * 1.25;
    const startY = t.y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, t.x, startY + i * lineHeight);
    });
  }
}

export type BoardRenderOptions = {
  pitchTemplate: SketchPitchTemplate;
  grassA: string;
  grassB: string;
};

export function renderBoardFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: SketchStroke[],
  texts: SketchBoardText[],
  opts: BoardRenderOptions
) {
  ctx.clearRect(0, 0, width, height);
  drawPitchBackground(ctx, width, height, opts.pitchTemplate, opts.grassA, opts.grassB);
  drawStrokes(ctx, strokes);
  drawBoardTexts(ctx, texts);
}

export function boardFrameToDataUrl(
  strokes: SketchStroke[],
  texts: SketchBoardText[],
  opts: BoardRenderOptions
): string {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_CANVAS_WIDTH;
  canvas.height = BOARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  renderBoardFrame(ctx, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, strokes, texts, opts);
  return canvas.toDataURL("image/png");
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SketchStroke[]) {
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = Math.max(1, boardSc(s.lineWidth));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = s.points;
    if (pts.length < 1) continue;

    if (s.tool === "cone") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = diskOutlineStroke(s.color);
      ctx.lineWidth = boardSc(1.2);
      ctx.beginPath();
      ctx.ellipse(x, y + boardSc(2), boardSc(8.5), boardSc(5.5), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = numberedDiskLabelTextColor(s.color);
      ctx.beginPath();
      ctx.ellipse(x, y - boardSc(0.5), boardSc(2.6), boardSc(1.6), 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (s.tool === "coneTall") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = diskOutlineStroke(s.color);
      ctx.lineWidth = boardSc(1.4);
      ctx.beginPath();
      ctx.moveTo(x, y - boardSc(16));
      ctx.lineTo(x + boardSc(9), y + boardSc(10));
      ctx.lineTo(x - boardSc(9), y + boardSc(10));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = numberedDiskLabelTextColor(s.color);
      ctx.beginPath();
      ctx.ellipse(x, y - boardSc(14), boardSc(2.8), boardSc(1.8), 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (s.tool === "player") {
      const [x, y] = pts[pts.length - 1]!;
      const r = boardSc(12);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = s.color + "99";
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.stroke();
      continue;
    }
    if (s.tool === "playerToken") {
      const [x, y] = pts[pts.length - 1]!;
      const r = boardSc(14);
      const num = s.playerNumber ?? 0;
      const name = s.playerName ?? "Jogador";
      const labelColor = numberedDiskLabelTextColor(s.color);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = diskOutlineStroke(s.color);
      ctx.lineWidth = boardSc(2);
      ctx.stroke();
      ctx.fillStyle = labelColor;
      const numSize = boardSc(num > 9 ? 11 : 12);
      ctx.font = `700 ${numSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), x, y);
      const nameSize = boardSc(11);
      ctx.font = `600 ${nameSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = boardSc(3);
      ctx.textBaseline = "top";
      const nameY = y + r + boardSc(4);
      ctx.strokeText(name, x, nameY);
      ctx.fillText(name, x, nameY);
      continue;
    }
    if (s.tool === "numbered" && s.label != null) {
      const [x, y] = pts[pts.length - 1]!;
      drawNumberedDisk(ctx, x, y, s.color, s.label);
      continue;
    }
    if (s.tool === "ball") {
      const [x, y] = pts[pts.length - 1]!;
      const r = boardSc(9);
      const mark = numberedDiskLabelTextColor(s.color);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = diskOutlineStroke(s.color);
      ctx.lineWidth = boardSc(1.5);
      ctx.stroke();
      ctx.fillStyle = mark;
      ctx.beginPath();
      ctx.arc(x, y, boardSc(2.2), 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * boardSc(4.5);
        const py = y + Math.sin(a) * boardSc(4.5);
        ctx.beginPath();
        ctx.arc(px, py, boardSc(1.3), 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    if (s.tool === "circle") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.arc(x, y, boardSc(10), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (s.tool === "square") {
      const [x, y] = pts[pts.length - 1]!;
      const size = boardSc(18);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      continue;
    }
    if (s.tool === "triangle") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(x, y - boardSc(11));
      ctx.lineTo(x - boardSc(10), y + boardSc(8));
      ctx.lineTo(x + boardSc(10), y + boardSc(8));
      ctx.closePath();
      ctx.stroke();
      continue;
    }
    if (s.tool === "arrow") {
      const [x, y] = pts[pts.length - 1]!;
      const x2 = x + boardSc(22);
      const y2 = y;
      ctx.beginPath();
      ctx.moveTo(x - boardSc(12), y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - boardSc(8), y2 - boardSc(4));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - boardSc(8), y2 + boardSc(4));
      ctx.stroke();
      continue;
    }
    if (s.tool === "goal" || s.tool === "miniGoal") {
      const [x, y] = pts[pts.length - 1]!;
      const scale = s.tool === "miniGoal" ? 0.55 : 1;
      const w = boardSc(30) * scale;
      const h = boardSc(14) * scale;
      const depth = boardSc(8) * scale;
      const topLift = boardSc(4) * scale;
      const x0 = x - w / 2;
      const y0 = y - h / 2;
      ctx.strokeStyle = s.color;
      ctx.fillStyle = fillWithAlpha(s.color, 0.35);
      ctx.lineWidth = boardSc(2);
      ctx.beginPath();
      ctx.moveTo(x0, y0 + h);
      ctx.lineTo(x0 + w, y0 + h);
      ctx.lineTo(x0 + w + depth, y0 + h - topLift);
      ctx.lineTo(x0 + depth, y0 + h - topLift);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      continue;
    }
    if (s.tool === "mannequin") {
      const [x, y] = pts[pts.length - 1]!;
      const w = boardSc(16);
      const h = boardSc(34);
      const x0 = x - w / 2;
      const y0 = y - h / 2;
      const cx = x;
      ctx.strokeStyle = s.color;
      ctx.fillStyle = fillWithAlpha(s.color, 0.4);
      ctx.lineWidth = boardSc(2);
      ctx.beginPath();
      ctx.ellipse(cx, y0 + h * 0.12, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.38, y0 + h * 0.25);
      ctx.lineTo(cx + w * 0.38, y0 + h * 0.25);
      ctx.lineTo(cx + w * 0.32, y0 + h * 0.64);
      ctx.lineTo(cx + w * 0.2, y0 + h * 0.95);
      ctx.lineTo(cx - w * 0.2, y0 + h * 0.95);
      ctx.lineTo(cx - w * 0.32, y0 + h * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      continue;
    }
    if (s.tool === "poleBase") {
      const [x, y] = pts[pts.length - 1]!;
      const h = boardSc(26);
      const yTop = y - h / 2;
      ctx.strokeStyle = s.color;
      ctx.fillStyle = fillWithAlpha(s.color, 0.85);
      ctx.lineWidth = boardSc(2);
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yTop + h * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yTop + h * 0.78);
      ctx.lineTo(x - boardSc(7), yTop + h);
      ctx.lineTo(x + boardSc(7), yTop + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      continue;
    }
    if (s.tool === "ladder" || s.tool === "leader") {
      const [x, y] = pts[pts.length - 1]!;
      const ang = -Math.PI / 4;
      const len = boardSc(36);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const half = boardSc(8);
      const startX = x - (Math.cos(ang) * len) / 2;
      const startY = y - (Math.sin(ang) * len) / 2;
      const endX = x + (Math.cos(ang) * len) / 2;
      const endY = y + (Math.sin(ang) * len) / 2;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = boardSc(2);
      ctx.beginPath();
      ctx.moveTo(startX + nx * half, startY + ny * half);
      ctx.lineTo(endX + nx * half, endY + ny * half);
      ctx.moveTo(startX - nx * half, startY - ny * half);
      ctx.lineTo(endX - nx * half, endY - ny * half);
      const rungs = 4;
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        const rx = startX + (endX - startX) * t;
        const ry = startY + (endY - startY) * t;
        ctx.moveTo(rx + nx * half, ry + ny * half);
        ctx.lineTo(rx - nx * half, ry - ny * half);
      }
      ctx.stroke();
      continue;
    }

    if (TWO_POINT_LINE_TOOLS.has(s.tool) || CURVE_LINE_TOOLS.has(s.tool)) {
      drawLineStroke(ctx, s);
      continue;
    }

    if (pts.length < 2) continue;

    // Shapes/tools above use click-to-place (single point). Only freehand draw uses a polyline here.
    if (s.tool === "draw") {
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
      ctx.stroke();
    }
  }
}

export const SketchBoardCanvas = forwardRef<
  SketchBoardCanvasHandle,
  {
    pitchTemplate: SketchPitchTemplate;
    strokes: SketchStroke[];
    onStrokesChange: (next: SketchStroke[]) => void;
    tool: SketchStrokeTool;
    color: string;
    lineWidth: number;
    expanded?: boolean;
    nextNumberLabel?: number;
    canPlaceNumbered?: boolean;
    playerTokenDraft?: { playerId: string; number: number; name: string } | null;
    dragMode?: boolean;
    selectionMode?: boolean;
    onSelectStroke?: (index: number | null, anchor: { x: number; y: number }) => void;
    textPlaceMode?: boolean;
    onPlaceText?: (x: number, y: number) => void;
    pitchColorPresetId?: string;
    readOnly?: boolean;
  }
>(function SketchBoardCanvas(
  {
    pitchTemplate,
    strokes,
    onStrokesChange,
    tool,
    color,
    lineWidth,
    expanded = false,
    nextNumberLabel,
    canPlaceNumbered = true,
    playerTokenDraft,
    dragMode = false,
    selectionMode = false,
    onSelectStroke,
    textPlaceMode = false,
    onPlaceText,
    pitchColorPresetId = "app",
    readOnly = false,
  },
  imperativeRef
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const currentStroke = useRef<SketchStroke | null>(null);
  const activePointerId = useRef<number | null>(null);
  const draggingTokenStrokeId = useRef<number | null>(null);
  const draggingOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const dragPreviewStrokes = useRef<SketchStroke[] | null>(null);

  const pitchColors = PITCH_COLOR_PRESETS.find((p) => p.id === pitchColorPresetId) ?? PITCH_COLOR_PRESETS[0]!;

  useImperativeHandle(imperativeRef, () => ({
    exportPng: () => {
      const c = canvasRef.current;
      if (!c) return null;
      return c.toDataURL("image/png");
    },
  }));

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.width / dpr;
    const h = c.height / dpr;
    if (w < 1 || h < 1) return;
    ctx.clearRect(0, 0, w, h);
    drawPitchBackground(ctx, w, h, pitchTemplate, pitchColors.grassA, pitchColors.grassB);
    const visible = dragPreviewStrokes.current ?? strokes;
    drawStrokes(ctx, visible);
    if (currentStroke.current) drawStrokes(ctx, [currentStroke.current]);
  }, [pitchTemplate, strokes, pitchColors.grassA, pitchColors.grassB]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = BOARD_CANVAS_WIDTH * dpr;
    c.height = BOARD_CANVAS_HEIGHT * dpr;
    const ctx = c.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }, [redraw]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const scaleX = BOARD_CANVAS_WIDTH / r.width;
    const scaleY = BOARD_CANVAS_HEIGHT / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };
  };

  const finishStroke = () => {
    if (!currentStroke.current) return;
    activePointerId.current = null;
    const fin = currentStroke.current;
    currentStroke.current = null;
    const minPts =
      fin.tool === "draw" ? 2 : TWO_POINT_LINE_TOOLS.has(fin.tool) || CURVE_LINE_TOOLS.has(fin.tool) ? 2 : 1;
    if (fin.points.length >= minPts) {
      onStrokesChange([...strokesRef.current, fin]);
    }
    redraw();
  };

  const draggableTools = new Set<SketchStrokeTool>([
    "playerToken",
    "numbered",
    "ball",
    "circle",
    "square",
    "triangle",
    "cone",
    "coneTall",
    "mannequin",
    "poleBase",
    "ladder",
    "goal",
    "miniGoal",
    "arrow",
  ]);

  const clickPlaceTools = new Set<SketchStrokeTool>([
    "ball",
    "circle",
    "square",
    "triangle",
    "cone",
    "coneTall",
    "mannequin",
    "poleBase",
    "ladder",
    "goal",
    "miniGoal",
    "arrow",
  ]);

  const estimateHitRadius = (toolId: SketchStrokeTool) => {
    if (toolId === "goal") return boardSc(28);
    if (toolId === "miniGoal") return boardSc(18);
    if (toolId === "ladder") return boardSc(28);
    if (toolId === "mannequin") return boardSc(24);
    if (toolId === "playerToken" || toolId === "cone" || toolId === "coneTall" || toolId === "ball") return boardSc(16);
    return boardSc(14);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (tool === "numbered" && (!canPlaceNumbered || nextNumberLabel == null)) return;
    const { x, y } = pos(e);
    if (textPlaceMode) {
      onPlaceText?.(x, y);
      return;
    }
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    if (selectionMode) {
      const hit = hitTestStrokeIndex(strokesRef.current, x, y);
      onSelectStroke?.(hit, { x, y });
      if (hit != null) {
        const s = strokesRef.current[hit]!;
        if (draggableTools.has(s.tool) && s.points.length > 0) {
          const [px, py] = s.points[s.points.length - 1]!;
          draggingTokenStrokeId.current = hit;
          draggingOffset.current = { dx: x - px, dy: y - py };
        }
      }
      return;
    }
    if (dragMode) {
      const hit = [...strokesRef.current]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find(({ s }) => {
          if (!draggableTools.has(s.tool) || s.points.length < 1) return false;
          const [px, py] = s.points[s.points.length - 1]!;
          return Math.hypot(px - x, py - y) <= estimateHitRadius(s.tool);
        });
      if (hit) {
        draggingTokenStrokeId.current = hit.i;
        const [px, py] = hit.s.points[hit.s.points.length - 1]!;
        draggingOffset.current = { dx: x - px, dy: y - py };
      }
      return;
    }
    if (tool === "playerToken") {
      const hitIndex = [...strokesRef.current]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find(({ s }) => {
          if (s.tool !== "playerToken" || s.points.length < 1) return false;
          const [px, py] = s.points[s.points.length - 1]!;
          return Math.hypot(px - x, py - y) <= boardSc(18);
        })?.i;
      if (hitIndex != null) {
        draggingTokenStrokeId.current = hitIndex;
        return;
      }
      if (!playerTokenDraft) return;
      const token: SketchStroke = {
        tool: "playerToken",
        color: color,
        lineWidth,
        points: [[x, y]],
        elementId: newElementId(),
        playerId: playerTokenDraft.playerId,
        playerNumber: playerTokenDraft.number,
        playerName: playerTokenDraft.name,
      };
      onStrokesChange([...strokesRef.current, token]);
      return;
    }
    if (TWO_POINT_LINE_TOOLS.has(tool) || CURVE_LINE_TOOLS.has(tool)) {
      currentStroke.current = {
        tool,
        color,
        lineWidth,
        points: [[x, y]],
        lineStyle: tool === "lineDashed" ? "dashed" : "solid",
      };
      redraw();
      return;
    }
    if (clickPlaceTools.has(tool)) {
      onStrokesChange([
        ...strokesRef.current,
        {
          tool,
          color,
          lineWidth,
          points: [[x, y]],
          elementId: newElementId(),
        },
      ]);
      return;
    }
    currentStroke.current = {
      tool,
      color,
      lineWidth,
      points: [[x, y]],
      ...(tool === "numbered" && nextNumberLabel != null
        ? { label: nextNumberLabel, elementId: newElementId() }
        : {}),
    };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (!currentStroke.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const s = currentStroke.current;
    if (tool === "draw") {
      s.points.push([x, y]);
    } else if (TWO_POINT_LINE_TOOLS.has(tool) || CURVE_LINE_TOOLS.has(tool)) {
      s.points = [s.points[0]!, [x, y]];
    } else {
      s.points = [s.points[0]!, [x, y]];
    }
    redraw();
    return;
  };

  const onDragToken = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (draggingTokenStrokeId.current == null) return;
    const { x, y } = pos(e);
    const idx = draggingTokenStrokeId.current;
    const next = [...strokesRef.current];
    const s = next[idx];
    if (!s || !draggableTools.has(s.tool)) return;
    next[idx] = { ...s, points: [[x - draggingOffset.current.dx, y - draggingOffset.current.dy]] };
    dragPreviewStrokes.current = next;
    redraw();
  };

  const commitDragIfNeeded = () => {
    if (dragPreviewStrokes.current) {
      onStrokesChange(dragPreviewStrokes.current);
      dragPreviewStrokes.current = null;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const wasDragging = draggingTokenStrokeId.current != null;
    draggingTokenStrokeId.current = null;
    if (wasDragging) commitDragIfNeeded();
    else finishStroke();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    draggingTokenStrokeId.current = null;
    dragPreviewStrokes.current = null;
    finishStroke();
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "mx-auto w-full max-w-full",
        expanded ? "flex min-h-0 flex-1 flex-col justify-center" : "max-h-[min(72vh,1348px)]"
      )}
      style={{ aspectRatio: `${BOARD_CANVAS_WIDTH} / ${BOARD_CANVAS_HEIGHT}` }}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "h-full w-full touch-none rounded-xl border border-surface-border bg-[#0a0f0c]",
          textPlaceMode
            ? "cursor-text"
            : selectionMode || dragMode
              ? "cursor-pointer"
              : tool === "numbered" && !canPlaceNumbered
                ? "cursor-not-allowed"
                : "cursor-crosshair"
        )}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          onDragToken(e);
          onPointerMove(e);
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && currentStroke.current) finishStroke();
        }}
      />
    </div>
  );
});

SketchBoardCanvas.displayName = "SketchBoardCanvas";
