"use client";

import { useState } from "react";
import type { DrillCategory, TrainingSession } from "@/types";
import type { NewSessionInput } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES: DrillCategory[] = [
  "Possession",
  "Finishing",
  "Defensive shape",
  "Pressing",
  "Recovery",
];

export function AddTrainingSessionModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewSessionInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [dateLocal, setDateLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [durationMin, setDurationMin] = useState("90");
  const [intensity, setIntensity] = useState<TrainingSession["intensity"]>("medium");
  const [categories, setCategories] = useState<DrillCategory[]>(["Possession"]);
  const [description, setDescription] = useState("");

  if (!open) return null;

  const toggleCat = (c: DrillCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const submit = () => {
    const t = title.trim();
    if (!t || categories.length === 0) return;
    const dm = Math.min(180, Math.max(15, parseInt(durationMin, 10) || 90));
    onSave({
      title: t,
      date: new Date(dateLocal).toISOString(),
      durationMin: dm,
      intensity,
      categories,
      description: description.trim(),
    });
    setTitle("");
    setDescription("");
    setDurationMin("90");
    setCategories(["Possession"]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-[#0f1419] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-white">New training session</h3>
        <p className="mt-1 text-sm text-zinc-500">Saved on this device until your API syncs.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="ts-title">
              Title
            </label>
            <Input
              id="ts-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="e.g. Pressing triggers & rest defence"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="ts-when">
                Date & time
              </label>
              <Input
                id="ts-when"
                type="datetime-local"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="ts-dur">
                Duration (min)
              </label>
              <Input
                id="ts-dur"
                type="number"
                min={15}
                max={180}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Intensity</label>
            <div className="mt-2 flex gap-2">
              {(["low", "medium", "high"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(i)}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-xs font-medium capitalize",
                    intensity === i ? "bg-accent/15 text-accent" : "bg-surface-raised text-zinc-400"
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Drill focus</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => toggleCat(c)}>
                  <Badge variant={categories.includes(c) ? "accent" : "muted"} className="cursor-pointer px-3 py-1">
                    {c}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="ts-desc">
              Plan notes
            </label>
            <textarea
              id="ts-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Structure, constraints, coaching points…"
            />
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={!title.trim() || categories.length === 0}>
            Create session
          </Button>
        </div>
      </div>
    </div>
  );
}
