"use client";

import { useState } from "react";
import type { Player, Position, PreferredFoot } from "@/types";
import type { NewPlayerInput } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const POSITIONS: Position[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

export function AddPlayerModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewPlayerInput) => void;
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("10");
  const [selectedPos, setSelectedPos] = useState<Position[]>(["CM"]);
  const [age, setAge] = useState("17");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot | "">("");
  const [availability, setAvailability] = useState<Player["availability"]>("available");
  const [performance, setPerformance] = useState<Player["performance"]>("steady");

  const togglePos = (p: Position) => {
    setSelectedPos((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== p);
      }
      return [...prev, p];
    });
  };

  if (!open) return null;

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const num = Math.min(99, Math.max(1, parseInt(number, 10) || 1));
    const a = Math.min(45, Math.max(14, parseInt(age, 10) || 17));
    const posList: Position[] = selectedPos.length > 0 ? selectedPos : ["CM"];
    const h = heightCm.trim() ? Math.min(220, Math.max(120, parseInt(heightCm, 10) || 170)) : undefined;
    const w = weightKg.trim() ? Math.min(150, Math.max(35, parseInt(weightKg, 10) || 70)) : undefined;
    onSave({
      name: n,
      number: num,
      position: posList[0]!,
      positions: posList.length > 1 ? posList : undefined,
      age: a,
      heightCm: h,
      weightKg: w,
      preferredFoot: preferredFoot || undefined,
      availability,
      performance,
      dateOfBirth: dateOfBirth || undefined,
    });
    setName("");
    setNumber("10");
    setSelectedPos(["CM"]);
    setAge("17");
    setHeightCm("");
    setWeightKg("");
    setDateOfBirth("");
    setPreferredFoot("");
    setAvailability("available");
    setPerformance("steady");
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
        className="w-full max-w-md rounded-2xl border border-surface-border bg-[#0f1419] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-white">Add player</h3>
        <p className="mt-1 text-sm text-zinc-500">They&apos;ll appear everywhere you pick squad members.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="np-name">
              Full name
            </label>
            <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="np-num">
                Number
              </label>
              <Input
                id="np-num"
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="np-age">
                Age
              </label>
              <Input
                id="np-age"
                type="number"
                min={14}
                max={45}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="np-h">
                Altura (cm)
              </label>
              <Input
                id="np-h"
                type="number"
                min={120}
                max={220}
                placeholder="—"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="np-w">
                Peso (kg)
              </label>
              <Input
                id="np-w"
                type="number"
                min={35}
                max={150}
                placeholder="—"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="np-dob">
                Data de nascimento
              </label>
              <Input
                id="np-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Pé preferido</label>
              <select
                value={preferredFoot}
                onChange={(e) => setPreferredFoot(e.target.value as PreferredFoot | "")}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
              >
                <option value="">—</option>
                <option value="right">Direito</option>
                <option value="left">Esquerdo</option>
                <option value="both">Ambos</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Posição (várias)</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePos(p)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium",
                    selectedPos.includes(p) ? "bg-accent/15 text-accent" : "bg-surface-raised text-zinc-400"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as Player["availability"])}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
              >
                <option value="available">Disponível</option>
                <option value="doubt">Dúvida</option>
                <option value="out">Indisponível</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Form</label>
              <select
                value={performance}
                onChange={(e) => setPerformance(e.target.value as Player["performance"])}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
              >
                <option value="up">Em alta</option>
                <option value="steady">Estável</option>
                <option value="down">Em baixa</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={!name.trim()}>
            Add to roster
          </Button>
        </div>
      </div>
    </div>
  );
}
