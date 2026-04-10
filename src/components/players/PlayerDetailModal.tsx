"use client";

import { useEffect, useState } from "react";
import type { Player, PlayerQualities, Position, PreferredFoot } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { QUALITY_GROUPS, mergeQualities } from "@/lib/player-qualities";

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

type Tab = "dados" | "qualidades";

export function PlayerDetailModal({
  player,
  open,
  onClose,
  onSave,
  onRemove,
}: {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<Player, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("dados");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("10");
  const [age, setAge] = useState("17");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot | "">("");
  const [selectedPos, setSelectedPos] = useState<Position[]>(["CM"]);
  const [availability, setAvailability] = useState<Player["availability"]>("available");
  const [performance, setPerformance] = useState<Player["performance"]>("steady");
  const [qualitiesDraft, setQualitiesDraft] = useState<PlayerQualities>(() => mergeQualities());

  useEffect(() => {
    if (!player) return;
    setName(player.name);
    setNumber(String(player.number));
    setAge(String(player.age));
    setHeightCm(player.heightCm != null ? String(player.heightCm) : "");
    setWeightKg(player.weightKg != null ? String(player.weightKg) : "");
    setPreferredFoot(player.preferredFoot ?? "");
    const list = player.positions?.length ? player.positions : [player.position];
    setSelectedPos(list);
    setAvailability(player.availability);
    setPerformance(player.performance);
    setQualitiesDraft(mergeQualities(player.qualities));
    setTab("dados");
  }, [player]);

  if (!open || !player) return null;

  const togglePos = (p: Position) => {
    setSelectedPos((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== p);
      }
      return [...prev, p];
    });
  };

  const save = () => {
    const n = name.trim();
    if (!n) return;
    const num = Math.min(99, Math.max(1, parseInt(number, 10) || 1));
    const a = Math.min(45, Math.max(14, parseInt(age, 10) || 17));
    const h = heightCm.trim() ? Math.min(220, Math.max(120, parseInt(heightCm, 10) || 170)) : undefined;
    const w = weightKg.trim() ? Math.min(150, Math.max(35, parseInt(weightKg, 10) || 70)) : undefined;
    const posList = selectedPos.length ? selectedPos : [player.position];
    onSave(player.id, {
      name: n,
      number: num,
      age: a,
      position: posList[0]!,
      positions: posList.length > 1 ? posList : undefined,
      heightCm: h,
      weightKg: w,
      preferredFoot: preferredFoot || undefined,
      availability,
      performance,
      qualities: qualitiesDraft,
    });
  };

  const setStat = (id: keyof PlayerQualities, v: number) => {
    const n = Math.min(100, Math.max(0, Math.round(v)));
    setQualitiesDraft((prev) => ({ ...prev, [id]: n }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="player-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl sm:max-h-[min(90vh,800px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border px-5 py-4">
          <h3 id="player-detail-title" className="font-display text-lg font-semibold text-white">
            {player.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">Editar dados e qualidades</p>
          <div className="mt-4 flex gap-1 rounded-xl bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setTab("dados")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                tab === "dados" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Dados
            </button>
            <button
              type="button"
              onClick={() => setTab("qualidades")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                tab === "qualidades" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Qualidades
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "dados" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500" htmlFor="pd-name">
                  Nome
                </label>
                <Input id="pd-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="pd-num">
                    Número
                  </label>
                  <Input
                    id="pd-num"
                    type="number"
                    min={1}
                    max={99}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="pd-age">
                    Idade
                  </label>
                  <Input
                    id="pd-age"
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
                  <label className="text-xs font-medium text-zinc-500" htmlFor="pd-h">
                    Altura (cm)
                  </label>
                  <Input
                    id="pd-h"
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
                  <label className="text-xs font-medium text-zinc-500" htmlFor="pd-w">
                    Peso (kg)
                  </label>
                  <Input
                    id="pd-w"
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
              <div>
                <label className="text-xs font-medium text-zinc-500">Posição (podes escolher várias)</label>
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
                  <label className="text-xs font-medium text-zinc-500">Disponibilidade</label>
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
                  <label className="text-xs font-medium text-zinc-500">Forma</label>
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
          )}

          {tab === "qualidades" && (
            <div className="space-y-8">
              <p className="text-xs text-zinc-500">
                Avalia cada atributo de 0 a 100 (estilo atributos de jogo).
              </p>
              {QUALITY_GROUPS.map((group) => (
                <div key={group.id}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">{group.label}</h4>
                  <div className="overflow-x-auto rounded-xl border border-surface-border">
                    <table className="w-full min-w-[320px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-surface-border bg-zinc-900/50 text-xs text-zinc-500">
                          <th className="px-3 py-2 font-medium">Atributo</th>
                          <th className="px-3 py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.stats.map((row) => (
                          <tr key={row.id} className="border-b border-surface-border/60 last:border-0">
                            <td className="px-3 py-2.5 text-zinc-300">{row.label}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={qualitiesDraft[row.id]}
                                  onChange={(e) => setStat(row.id, Number(e.target.value))}
                                  className="h-2 flex-1 cursor-pointer accent-accent"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={qualitiesDraft[row.id]}
                                  onChange={(e) => setStat(row.id, Number(e.target.value))}
                                  className="w-14 rounded-lg border border-surface-border bg-black/40 px-2 py-1 text-center tabular-nums text-white"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-surface-border px-5 py-4">
          <Button type="button" variant="secondary" className="flex-1 min-w-[120px]" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 min-w-[120px]"
            onClick={() => {
              onRemove(player.id);
              onClose();
            }}
          >
            Remover
          </Button>
          <Button type="button" className="flex-1 min-w-[120px]" onClick={save} disabled={!name.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
