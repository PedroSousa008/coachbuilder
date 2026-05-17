"use client";

import { useRef } from "react";
import type { SketchBoardText } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  texts: SketchBoardText[];
  readOnly?: boolean;
  onChange: (texts: SketchBoardText[]) => void;
  placeMode?: boolean;
};

export function SketchBoardTextLayer({ texts, readOnly, onChange, placeMode }: Props) {
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const updateText = (id: string, patch: Partial<SketchBoardText>) => {
    onChange(texts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeText = (id: string) => {
    onChange(texts.filter((t) => t.id !== id));
  };

  return (
    <div className={cn("pointer-events-none absolute inset-0", placeMode && "pointer-events-auto")}>
      {texts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto absolute max-w-[160px]"
          style={{ left: t.x, top: t.y, transform: "translate(-50%, -50%)" }}
          onPointerDown={(e) => {
            if (readOnly) return;
            e.stopPropagation();
            const wrap = e.currentTarget.closest("[data-board-wrap]");
            if (!wrap) return;
            const r = wrap.getBoundingClientRect();
            dragRef.current = { id: t.id, dx: e.clientX - r.left - t.x, dy: e.clientY - r.top - t.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current || dragRef.current.id !== t.id) return;
            const wrap = e.currentTarget.closest("[data-board-wrap]");
            if (!wrap) return;
            const r = wrap.getBoundingClientRect();
            updateText(t.id, {
              x: e.clientX - r.left - dragRef.current.dx,
              y: e.clientY - r.top - dragRef.current.dy,
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
        >
          <div
            className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 backdrop-blur-sm"
            style={{ color: t.color, fontSize: t.fontSize ?? 12 }}
          >
            {!readOnly ? (
              <input
                className="w-full min-w-[80px] bg-transparent text-inherit outline-none placeholder:text-white/40"
                value={t.text}
                placeholder="Anotação…"
                onChange={(ev) => updateText(t.id, { text: ev.target.value })}
              />
            ) : (
              <span className="text-xs">{t.text}</span>
            )}
            {!readOnly ? (
              <button
                type="button"
                className="mt-0.5 block text-[10px] text-red-400 hover:text-red-300"
                onClick={() => removeText(t.id)}
              >
                Remover
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
