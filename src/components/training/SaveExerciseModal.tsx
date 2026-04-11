"use client";

import { useEffect, useState } from "react";
import type { SavedExerciseCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { SAVED_EXERCISE_CATEGORIES, SAVED_EXERCISE_CATEGORY_LABELS } from "@/lib/saved-exercise-categories";

export function SaveExerciseModal({
  open,
  exerciseTitle,
  defaultCategory,
  onClose,
  onConfirm,
}: {
  open: boolean;
  exerciseTitle: string;
  defaultCategory: SavedExerciseCategory;
  onClose: () => void;
  onConfirm: (category: SavedExerciseCategory) => void;
}) {
  const [category, setCategory] = useState<SavedExerciseCategory>(defaultCategory);

  useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-exercise-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-[#0f1419] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="save-exercise-title" className="font-display text-lg font-semibold text-white">
          Guardar exercício
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Fica na tua biblioteca pessoal (só tu vês as notas). Escolhe o tipo para organizares.
        </p>
        <p className="mt-2 truncate text-sm font-medium text-zinc-200" title={exerciseTitle}>
          {exerciseTitle}
        </p>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Tipo de exercício
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SavedExerciseCategory)}
          className="mt-2 w-full rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2.5 text-sm text-zinc-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SAVED_EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SAVED_EXERCISE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" className="text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className="text-xs" onClick={() => onConfirm(category)}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
