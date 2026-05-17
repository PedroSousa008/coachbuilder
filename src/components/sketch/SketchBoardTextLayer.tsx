"use client";

import { useEffect, useRef } from "react";
import type { SketchBoardText } from "@/types";
import { BOARD_CANVAS_HEIGHT, BOARD_CANVAS_WIDTH, boardSc } from "@/lib/sketch-board";
import { cn } from "@/lib/utils";

type Props = {
  texts: SketchBoardText[];
  readOnly?: boolean;
  onChange: (texts: SketchBoardText[]) => void;
  selectMode?: boolean;
  selectedTextId?: string | null;
  editingTextId?: string | null;
  onSelectText?: (id: string | null, anchor: { x: number; y: number }) => void;
  onEditingDone?: () => void;
};

function textPositionStyle(t: SketchBoardText) {
  return {
    left: `${(t.x / BOARD_CANVAS_WIDTH) * 100}%`,
    top: `${(t.y / BOARD_CANVAS_HEIGHT) * 100}%`,
    transform: "translate(-50%, -50%)",
  } as const;
}

export function SketchBoardTextLayer({
  texts,
  readOnly,
  onChange,
  selectMode,
  selectedTextId,
  editingTextId,
  onSelectText,
  onEditingDone,
}: Props) {
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingTextId) return;
    const t = window.setTimeout(() => editRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [editingTextId]);

  const updateText = (id: string, patch: Partial<SketchBoardText>) => {
    onChange(texts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const logicalFromEvent = (e: React.PointerEvent, el: HTMLElement) => {
    const wrap = el.closest("[data-board-wrap]");
    const canvas = wrap?.querySelector("canvas");
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * BOARD_CANVAS_WIDTH,
      y: ((e.clientY - r.top) / r.height) * BOARD_CANVAS_HEIGHT,
    };
  };

  return (
    <div className="pointer-events-none absolute inset-0">
      {texts.map((t) => {
        const isEditing = editingTextId === t.id;
        const isSelected = selectedTextId === t.id;
        const fontSize = t.fontSize ?? boardSc(13);

        return (
          <div
            key={t.id}
            className={cn(
              "absolute max-w-[min(28%,320px)]",
              selectMode || isEditing ? "pointer-events-auto" : "pointer-events-none",
              isSelected && !isEditing && "ring-2 ring-accent/70 rounded-lg"
            )}
            style={textPositionStyle(t)}
            onPointerDown={(e) => {
              if (readOnly || isEditing) return;
              if (!selectMode) return;
              e.stopPropagation();
              const pos = logicalFromEvent(e, e.currentTarget);
              if (!pos) return;
              dragRef.current = {
                id: t.id,
                dx: pos.x - t.x,
                dy: pos.y - t.y,
                moved: false,
              };
              onSelectText?.(t.id, { x: t.x, y: t.y });
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current || dragRef.current.id !== t.id) return;
              dragRef.current.moved = true;
              const pos = logicalFromEvent(e, e.currentTarget);
              if (!pos) return;
              const nx = pos.x - dragRef.current.dx;
              const ny = pos.y - dragRef.current.dy;
              updateText(t.id, { x: nx, y: ny });
              onSelectText?.(t.id, { x: nx, y: ny });
            }}
            onPointerUp={(e) => {
              if (!dragRef.current || dragRef.current.id !== t.id) return;
              if (!dragRef.current.moved) {
                onSelectText?.(t.id, { x: t.x, y: t.y });
              }
              dragRef.current = null;
              e.stopPropagation();
            }}
          >
            <div
              className={cn(
                "rounded-md border px-2 py-1",
                isEditing
                  ? "border-white/20 bg-black/30 backdrop-blur-[2px]"
                  : "border-transparent bg-transparent"
              )}
              style={{ color: t.color, fontSize }}
            >
              {isEditing ? (
                <input
                  ref={t.id === editingTextId ? editRef : undefined}
                  className="min-w-[4ch] bg-transparent text-inherit outline-none placeholder:text-white/35"
                  style={{ width: `${Math.max(4, t.text.length + 1)}ch`, fontSize }}
                  value={t.text}
                  placeholder="Escreve…"
                  onChange={(ev) => updateText(t.id, { text: ev.target.value })}
                  onBlur={() => onEditingDone?.()}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      onEditingDone?.();
                    }
                    if (ev.key === "Escape") {
                      ev.preventDefault();
                      onEditingDone?.();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="block whitespace-pre-wrap text-left leading-snug">
                  {t.text || (selectMode ? "…" : "")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
