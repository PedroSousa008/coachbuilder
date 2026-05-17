"use client";

import { useRef } from "react";
import type { SketchBoardText } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  texts: SketchBoardText[];
  readOnly?: boolean;
  onChange: (texts: SketchBoardText[]) => void;
  placeMode?: boolean;
  selectMode?: boolean;
  selectedTextId?: string | null;
  onSelectText?: (id: string | null, anchor: { x: number; y: number }) => void;
};

export function SketchBoardTextLayer({
  texts,
  readOnly,
  onChange,
  placeMode,
  selectMode,
  selectedTextId,
  onSelectText,
}: Props) {
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  const updateText = (id: string, patch: Partial<SketchBoardText>) => {
    onChange(texts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        (placeMode || selectMode) && "pointer-events-auto"
      )}
    >
      {texts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto absolute max-w-[200px]",
            selectedTextId === t.id && "ring-2 ring-accent/70 ring-offset-1 ring-offset-transparent rounded-lg"
          )}
          style={{ left: t.x, top: t.y, transform: "translate(-50%, -50%)" }}
          onPointerDown={(e) => {
            if (readOnly || placeMode) return;
            if (!selectMode) return;
            e.stopPropagation();
            const wrap = e.currentTarget.closest("[data-board-wrap]");
            if (!wrap) return;
            const r = wrap.getBoundingClientRect();
            dragRef.current = {
              id: t.id,
              dx: e.clientX - r.left - t.x,
              dy: e.clientY - r.top - t.y,
              moved: false,
            };
            onSelectText?.(t.id, { x: t.x, y: t.y });
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current || dragRef.current.id !== t.id) return;
            dragRef.current.moved = true;
            const wrap = e.currentTarget.closest("[data-board-wrap]");
            if (!wrap) return;
            const r = wrap.getBoundingClientRect();
            const nx = e.clientX - r.left - dragRef.current.dx;
            const ny = e.clientY - r.top - dragRef.current.dy;
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
            className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 backdrop-blur-sm"
            style={{ color: t.color, fontSize: t.fontSize ?? 12 }}
          >
            {!readOnly && !selectMode ? (
              <input
                className="w-full min-w-[80px] bg-transparent text-inherit outline-none placeholder:text-white/40"
                value={t.text}
                placeholder="Anotação…"
                onChange={(ev) => updateText(t.id, { text: ev.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs">{t.text || "…"}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
