"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SketchPitchTemplate, SketchStroke, SketchStrokeTool } from "@/types";
import { cn } from "@/lib/utils";

export const BOARD_COLORS = ["#e4e4e7", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

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

const NUMBERED_DISK_RADIUS = 14;

function drawNumberedDisk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: number
) {
  const r = NUMBERED_DISK_RADIUS;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = numberedDiskLabelTextColor(color);
  const size = label > 9 ? 12 : 13;
  ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(label), x, y);
}

/** Relva riscada + linhas FIFA (105×68 m) em vista de cima; balizas à esquerda/direita. */
const GRASS_A = "#1e6b3d";
const GRASS_B = "#143d26";
const LINE = "rgba(248, 250, 252, 0.94)";

function drawPitchBackground(ctx: CanvasRenderingContext2D, w: number, h: number, tpl: SketchPitchTemplate) {
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
    drawHalfPitchBackground(ctx, w, h);
    return;
  }

  // Relva com riscas verticais (campo completo / blank)
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    const x0 = xL + (i * pitchW) / stripes;
    const x1 = xL + ((i + 1) * pitchW) / stripes;
    ctx.fillStyle = i % 2 === 0 ? GRASS_A : GRASS_B;
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
function drawHalfPitchBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
    ctx.fillStyle = i % 2 === 0 ? GRASS_A : GRASS_B;
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

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SketchStroke[]) {
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = s.points;
    if (pts.length < 1) continue;

    if (s.tool === "cone") {
      const [x, y] = pts[pts.length - 1]!;
      // Flat marker cone with top hole.
      ctx.fillStyle = "#f4f4f5";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 8.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(x, y - 0.5, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (s.tool === "player") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = s.color + "99";
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.stroke();
      continue;
    }
    if (s.tool === "playerToken") {
      const [x, y] = pts[pts.length - 1]!;
      const r = 14;
      const num = s.playerNumber ?? 0;
      const name = s.playerName ?? "Player";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = `700 ${num > 9 ? 11 : 12}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), x, y);
      ctx.font = "600 11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 3;
      ctx.textBaseline = "top";
      ctx.strokeText(name, x, y + r + 4);
      ctx.fillText(name, x, y + r + 4);
      continue;
    }
    if (s.tool === "numbered" && s.label != null) {
      const [x, y] = pts[pts.length - 1]!;
      drawNumberedDisk(ctx, x, y, s.color, s.label);
      continue;
    }
    if (s.tool === "ball") {
      const [x, y] = pts[pts.length - 1]!;
      const r = 9;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Simple football patches
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * 4.5;
        const py = y + Math.sin(a) * 4.5;
        ctx.beginPath();
        ctx.arc(px, py, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    if (s.tool === "circle") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (s.tool === "square") {
      const [x, y] = pts[pts.length - 1]!;
      const size = 18;
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      continue;
    }
    if (s.tool === "triangle") {
      const [x, y] = pts[pts.length - 1]!;
      ctx.beginPath();
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x - 10, y + 8);
      ctx.lineTo(x + 10, y + 8);
      ctx.closePath();
      ctx.stroke();
      continue;
    }
    if (s.tool === "arrow") {
      const [x, y] = pts[pts.length - 1]!;
      const x2 = x + 22;
      const y2 = y;
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 8, y2 - 4);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 8, y2 + 4);
      ctx.stroke();
      continue;
    }
    if (s.tool === "goal") {
      const [x, y] = pts[pts.length - 1]!;
      const w = 30;
      const h = 14;
      const depth = 8;
      const topLift = 4;
      const x0 = x - w / 2;
      const y0 = y - h / 2;
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.28)";
      ctx.lineWidth = 2;
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
      const w = 16;
      const h = 34;
      const x0 = x - w / 2;
      const y0 = y - h / 2;
      const cx = x;
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.35)";
      ctx.lineWidth = 2;
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
      const h = 26;
      const yTop = y - h / 2;
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yTop + h * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yTop + h * 0.78);
      ctx.lineTo(x - 7, yTop + h);
      ctx.lineTo(x + 7, yTop + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      continue;
    }
    if (s.tool === "ladder" || s.tool === "leader") {
      const [x, y] = pts[pts.length - 1]!;
      const ang = -Math.PI / 4;
      const len = 36;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const half = 8;
      const startX = x - (Math.cos(ang) * len) / 2;
      const startY = y - (Math.sin(ang) * len) / 2;
      const endX = x + (Math.cos(ang) * len) / 2;
      const endY = y + (Math.sin(ang) * len) / 2;
      ctx.strokeStyle = "#f4f4f5";
      ctx.lineWidth = 2;
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
    } else if (s.tool === "square" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.max(6, Math.abs(x2 - x1));
      const h = Math.max(6, Math.abs(y2 - y1));
      ctx.strokeRect(x, y, w, h);
    } else if (s.tool === "triangle" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.max(8, Math.abs(x2 - x1));
      const h = Math.max(8, Math.abs(y2 - y1));
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.stroke();
    } else if (s.tool === "goal" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const x = Math.min(x1, x2) + 2;
      const y = Math.min(y1, y2) + 2;
      const w = Math.max(28, Math.abs(x2 - x1));
      const h = Math.max(14, Math.abs(y2 - y1));
      const depth = Math.max(8, Math.min(16, w * 0.18));
      const topLift = Math.max(5, h * 0.28);
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w + depth, y + h - topLift);
      ctx.lineTo(x + depth, y + h - topLift);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + depth, y + h - topLift);
      ctx.moveTo(x + w, y + h);
      ctx.lineTo(x + w + depth, y + h - topLift);
      ctx.moveTo(x + w, y + h);
      ctx.lineTo(x + w + depth, y + h + topLift * 0.7);
      ctx.lineTo(x + depth, y + h + topLift * 0.7);
      ctx.lineTo(x, y + h);
      ctx.moveTo(x + depth + w * 0.25, y + h - topLift);
      ctx.lineTo(x + depth + w * 0.25, y + h + topLift * 0.7);
      ctx.moveTo(x + depth + w * 0.6, y + h - topLift);
      ctx.lineTo(x + depth + w * 0.6, y + h + topLift * 0.7);
      ctx.stroke();
    } else if (s.tool === "mannequin" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.max(18, Math.abs(x2 - x1));
      const h = Math.max(40, Math.abs(y2 - y1));
      const cx = x + w / 2;
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.12, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.38, y + h * 0.25);
      ctx.lineTo(cx + w * 0.38, y + h * 0.25);
      ctx.lineTo(cx + w * 0.32, y + h * 0.64);
      ctx.lineTo(cx + w * 0.2, y + h * 0.95);
      ctx.lineTo(cx - w * 0.2, y + h * 0.95);
      ctx.lineTo(cx - w * 0.32, y + h * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.25);
      ctx.lineTo(cx, y + h * 0.95);
      ctx.moveTo(cx - w * 0.2, y + h * 0.45);
      ctx.lineTo(cx + w * 0.2, y + h * 0.45);
      ctx.stroke();
    } else if (s.tool === "poleBase" && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const x = (x1 + x2) / 2;
      const yTop = Math.min(y1, y2);
      const yBottom = Math.max(y1, y2);
      const h = Math.max(28, yBottom - yTop);
      ctx.strokeStyle = "#f4f4f5";
      ctx.fillStyle = "rgba(244,244,245,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yTop + h * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yTop + h * 0.78);
      ctx.lineTo(x - 8, yTop + h);
      ctx.lineTo(x + 8, yTop + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if ((s.tool === "ladder" || s.tool === "leader") && pts.length >= 2) {
      const [x1, y1] = pts[0]!;
      const [x2, y2] = pts[pts.length - 1]!;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.max(24, Math.hypot(x2 - x1, y2 - y1));
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const half = 9;
      const startX = x1;
      const startY = y1;
      const endX = startX + Math.cos(ang) * len;
      const endY = startY + Math.sin(ang) * len;
      ctx.strokeStyle = "#f4f4f5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + nx * half, startY + ny * half);
      ctx.lineTo(endX + nx * half, endY + ny * half);
      ctx.moveTo(startX - nx * half, startY - ny * half);
      ctx.lineTo(endX - nx * half, endY - ny * half);
      const rungGap = 18;
      const rungs = Math.max(2, Math.floor(len / rungGap));
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        const rx = startX + (endX - startX) * t;
        const ry = startY + (endY - startY) * t;
        ctx.moveTo(rx + nx * half, ry + ny * half);
        ctx.lineTo(rx - nx * half, ry - ny * half);
      }
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
  expanded = false,
  nextNumberLabel,
  canPlaceNumbered = true,
  playerTokenDraft,
  dragMode = false,
}: {
  pitchTemplate: SketchPitchTemplate;
  strokes: SketchStroke[];
  onStrokesChange: (next: SketchStroke[]) => void;
  tool: SketchStrokeTool;
  color: string;
  lineWidth: number;
  /** Taller canvas (fullscreen / mobile drawing area). */
  expanded?: boolean;
  /** Próximo número a colocar quando `tool === "numbered"` (1–24). */
  nextNumberLabel?: number;
  /** Se false, não aceita novos discos numerados (já atingiu 24 nesta cor). */
  canPlaceNumbered?: boolean;
  /** Novo token de jogador a colocar (click-to-place). */
  playerTokenDraft?: { playerId: string; number: number; name: string } | null;
  /** Move objects around instead of placing/drawing. */
  dragMode?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const currentStroke = useRef<SketchStroke | null>(null);
  const activePointerId = useRef<number | null>(null);
  const draggingTokenStrokeId = useRef<number | null>(null);
  const draggingOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const redraw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // c.width/height are buffer pixels; ctx is scaled by dpr so drawing uses CSS pixels (same as pointer coords).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.width / dpr;
    const h = c.height / dpr;
    if (w < 1 || h < 1) return;
    ctx.clearRect(0, 0, w, h);
    drawPitchBackground(ctx, w, h, pitchTemplate);
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
      const h = expanded
        ? Math.max(280, Math.floor(wrap.clientHeight))
        : Math.floor(Math.min(420, wrap.clientWidth * 0.58));
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
  }, [redraw, expanded]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const finishStroke = () => {
    if (!currentStroke.current) return;
    activePointerId.current = null;
    const fin = currentStroke.current;
    currentStroke.current = null;
    if (fin.points.length >= (fin.tool === "draw" ? 2 : 1)) {
      onStrokesChange([...strokesRef.current, fin]);
    }
    redraw();
  };

  const draggableTools = new Set<SketchStrokeTool>([
    "playerToken",
    "ball",
    "circle",
    "square",
    "triangle",
    "cone",
    "mannequin",
    "poleBase",
    "ladder",
    "goal",
    "arrow",
  ]);

  const clickPlaceTools = new Set<SketchStrokeTool>([
    "ball",
    "circle",
    "square",
    "triangle",
    "cone",
    "mannequin",
    "poleBase",
    "ladder",
    "goal",
    "arrow",
  ]);

  const estimateHitRadius = (toolId: SketchStrokeTool) => {
    if (toolId === "goal") return 24;
    if (toolId === "ladder") return 24;
    if (toolId === "mannequin") return 20;
    if (toolId === "playerToken" || toolId === "cone" || toolId === "ball") return 14;
    return 12;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (tool === "numbered" && (!canPlaceNumbered || nextNumberLabel == null)) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    const { x, y } = pos(e);
    if (dragMode) {
      const hit = [...strokesRef.current]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find(({ s }) => {
          if (!draggableTools.has(s.tool) || s.points.length < 1) return false;
          const [px, py] = s.points[s.points.length - 1]!;
          return Math.hypot(px - x, py - y) <= estimateHitRadius(s.tool);
        });
      if (!hit) return;
      draggingTokenStrokeId.current = hit.i;
      const [px, py] = hit.s.points[hit.s.points.length - 1]!;
      draggingOffset.current = { dx: x - px, dy: y - py };
      return;
    }
    if (tool === "playerToken") {
      const hitIndex = [...strokesRef.current]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find(({ s }) => {
          if (s.tool !== "playerToken" || s.points.length < 1) return false;
          const [px, py] = s.points[s.points.length - 1]!;
          return Math.hypot(px - x, py - y) <= 18;
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
        playerId: playerTokenDraft.playerId,
        playerNumber: playerTokenDraft.number,
        playerName: playerTokenDraft.name,
      };
      onStrokesChange([...strokesRef.current, token]);
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
        },
      ]);
      return;
    }
    currentStroke.current = {
      tool,
      color,
      lineWidth,
      points: [[x, y]],
      ...(tool === "numbered" && nextNumberLabel != null ? { label: nextNumberLabel } : {}),
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
    onStrokesChange(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    draggingTokenStrokeId.current = null;
    finishStroke();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    draggingTokenStrokeId.current = null;
    finishStroke();
  };

  return (
    <div
      ref={wrapRef}
      className={expanded ? "flex min-h-0 w-full flex-1 flex-col" : "w-full"}
    >
      <canvas
        ref={ref}
        className={cn(
          "touch-none rounded-xl border border-surface-border bg-[#0a0f0c]",
          dragMode ? "cursor-grab" : tool === "numbered" && !canPlaceNumbered ? "cursor-not-allowed" : "cursor-crosshair"
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
}
