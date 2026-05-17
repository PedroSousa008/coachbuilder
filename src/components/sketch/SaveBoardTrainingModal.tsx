"use client";

import { useEffect, useState } from "react";
import type { SavedExerciseCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SAVED_EXERCISE_CATEGORIES, SAVED_EXERCISE_CATEGORY_LABELS } from "@/lib/saved-exercise-categories";
import { cn } from "@/lib/utils";
import type { SaveBoardTrainingFormInput } from "@/lib/save-board-as-training";

export function SaveBoardTrainingModal({
  open,
  defaultTitle,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  defaultTitle: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: SaveBoardTrainingFormInput) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [themes, setThemes] = useState<Set<SavedExerciseCategory>>(() => new Set(["mixed"]));
  const [explanation, setExplanation] = useState("");
  const [durationMin, setDurationMin] = useState(10);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setThemes(new Set(["mixed"]));
    setExplanation("");
    setDurationMin(10);
  }, [open, defaultTitle]);

  const toggleTheme = (c: SavedExerciseCategory) => {
    setThemes((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-board-training-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-[#0f1419] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="save-board-training-title" className="font-display text-lg font-semibold text-white">
          Guardar Treino
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          O exercício fica em Treinos → Todos os exercícios (só tu o vês), com vídeo e imagem para impressão.
        </p>

        <label className="mt-4 block space-y-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Título
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </label>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Temas</p>
          <p className="mt-1 text-[11px] text-zinc-600">Podes seleccionar vários.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SAVED_EXERCISE_CATEGORIES.map((c) => {
              const on = themes.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleTheme(c)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    on ? "bg-accent/25 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {SAVED_EXERCISE_CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 block space-y-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Explicação do exercício <span className="font-normal normal-case text-zinc-600">(opcional)</span>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2 text-sm text-zinc-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Objectivo, regras, progressões…"
          />
        </label>

        <label className="mt-4 block space-y-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Duração (min)
          <Input
            type="number"
            min={1}
            max={180}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
            className="mt-1 max-w-[120px]"
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" className="text-xs" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="text-xs"
            disabled={saving || !title.trim() || themes.size === 0}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                themes: [...themes],
                explanation,
                durationMin,
              })
            }
          >
            {saving ? "A guardar…" : "Adicionar aos Treinos"}
          </Button>
        </div>
      </div>
    </div>
  );
}
