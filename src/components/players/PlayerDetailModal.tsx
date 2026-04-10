"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type {
  EvaluationTestId,
  Player,
  PlayerEvaluationTests,
  PlayerQualities,
  Position,
  PreferredFoot,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { QUALITY_GROUPS, mergeQualities } from "@/lib/player-qualities";
import { buildPlayerInsights } from "@/lib/player-insights";
import { PlayerInsightsBox } from "@/components/team/PlayerInsightsBox";
import { Badge } from "@/components/ui/Badge";
import {
  computeAiOverallProvisional,
  EVALUATION_TESTS,
  EVALUATION_TEST_IDS,
} from "@/lib/evaluation-tests";

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

type Tab = "dados" | "qualidades" | "avaliacao";

function emptyEvaluationDraft(): Record<EvaluationTestId, string> {
  return Object.fromEntries(EVALUATION_TEST_IDS.map((id) => [id, ""])) as Record<EvaluationTestId, string>;
}

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
  const [evaluationDraft, setEvaluationDraft] = useState<Record<EvaluationTestId, string>>(emptyEvaluationDraft);
  const [evaluationHelpOpenId, setEvaluationHelpOpenId] = useState<EvaluationTestId | null>(null);
  const [evaluationMediaOpenId, setEvaluationMediaOpenId] = useState<EvaluationTestId | null>(null);
  const [mediaPortalMounted, setMediaPortalMounted] = useState(false);

  useEffect(() => setMediaPortalMounted(true), []);

  useEffect(() => {
    if (!evaluationMediaOpenId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEvaluationMediaOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evaluationMediaOpenId]);

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
    const ev = emptyEvaluationDraft();
    for (const id of EVALUATION_TEST_IDS) {
      ev[id] = player.evaluationTests?.[id]?.raw ?? "";
    }
    setEvaluationDraft(ev);
    setTab("dados");
    setEvaluationHelpOpenId(null);
    setEvaluationMediaOpenId(null);
  }, [player]);

  useEffect(() => {
    if (tab !== "avaliacao") {
      setEvaluationHelpOpenId(null);
      setEvaluationMediaOpenId(null);
    }
  }, [tab]);

  const mediaOpenTest = useMemo(
    () =>
      evaluationMediaOpenId
        ? (EVALUATION_TESTS.find((t) => t.id === evaluationMediaOpenId) ?? null)
        : null,
    [evaluationMediaOpenId]
  );

  useEffect(() => {
    if (!open) {
      setEvaluationHelpOpenId(null);
      setEvaluationMediaOpenId(null);
    }
  }, [open]);

  const insights = useMemo(() => {
    if (!player) return null;
    const hRaw = heightCm.trim() ? parseInt(heightCm, 10) : NaN;
    const wRaw = weightKg.trim() ? parseInt(weightKg, 10) : NaN;
    const h = Number.isFinite(hRaw) && hRaw > 0 ? Math.min(220, Math.max(120, hRaw)) : undefined;
    const w = Number.isFinite(wRaw) && wRaw > 0 ? Math.min(150, Math.max(35, wRaw)) : undefined;
    const posList: Position[] = selectedPos.length > 0 ? selectedPos : [player.position];
    return buildPlayerInsights({
      ...player,
      heightCm: h,
      weightKg: w,
      position: posList[0]!,
      positions: posList.length > 1 ? posList : undefined,
      qualities: qualitiesDraft,
    });
  }, [player, heightCm, weightKg, selectedPos, qualitiesDraft]);

  const mediaOverlay =
    mediaPortalMounted && mediaOpenTest && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-3 sm:p-6"
            role="dialog"
            aria-modal
            aria-labelledby="eval-protocol-media-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEvaluationMediaOpenId(null);
            }}
          >
            <div
              className="flex max-h-[min(92vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
                <h4 id="eval-protocol-media-title" className="min-w-0 text-sm font-semibold text-white">
                  {mediaOpenTest.label}
                </h4>
                <button
                  type="button"
                  onClick={() => setEvaluationMediaOpenId(null)}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label="Fechar demonstração"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {mediaOpenTest.protocolMedia.kind === "video" ? (
                  <video
                    controls
                    playsInline
                    className="mx-auto max-h-[min(70vh,520px)] w-full rounded-lg bg-black object-contain"
                    src={mediaOpenTest.protocolMedia.src}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- protocol media from /public or CDN
                  <img
                    src={mediaOpenTest.protocolMedia.src}
                    alt={`Demonstração do protocolo: ${mediaOpenTest.label}`}
                    className="mx-auto max-h-[min(70vh,520px)] w-full rounded-lg object-contain"
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (!open || !player) return <>{mediaOverlay}</>;

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
    const posList: Position[] = selectedPos.length > 0 ? selectedPos : [player.position];
    const evaluationTests: PlayerEvaluationTests = {};
    for (const id of EVALUATION_TEST_IDS) {
      const raw = evaluationDraft[id]?.trim();
      if (!raw) continue;
      const ai = computeAiOverallProvisional(id, raw, a);
      evaluationTests[id] = { raw, ...(ai != null ? { aiOverall: ai } : {}) };
    }

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
      evaluationTests,
    });
  };

  const setStat = (id: keyof PlayerQualities, v: number) => {
    const n = Math.min(100, Math.max(0, Math.round(v)));
    setQualitiesDraft((prev) => ({ ...prev, [id]: n }));
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
        role="dialog"
        aria-modal
        aria-labelledby="player-detail-title"
        onClick={onClose}
      >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl sm:max-h-[min(90vh,800px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border px-5 py-4">
          <h3 id="player-detail-title" className="font-display text-lg font-semibold text-white">
            {player.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">Editar dados e qualidades</p>
          {insights && (
            <div className="mt-4">
              <PlayerInsightsBox insights={insights} />
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setTab("dados")}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === "dados" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Dados
            </button>
            <button
              type="button"
              onClick={() => setTab("qualidades")}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === "qualidades" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Qualidades
            </button>
            <button
              type="button"
              onClick={() => setTab("avaliacao")}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === "avaliacao" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Avaliação
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

          {tab === "avaliacao" && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-zinc-500">
                Regista o resultado de cada teste. O <span className="text-zinc-400">AI Overall</span> (0–100) é
                calculado de forma <strong className="text-zinc-400">provisória</strong> até integrarmos a tabela
                oficial por idade/tempo; depois poderás sincronizar automaticamente com as Qualidades.
              </p>
              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-2 font-medium">Teste</th>
                      <th className="px-3 py-2 font-medium">Valor</th>
                      <th className="px-3 py-2 font-medium text-right">AI Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVALUATION_TESTS.map((t) => {
                      const raw = evaluationDraft[t.id] ?? "";
                      const ageNum = Math.min(45, Math.max(14, parseInt(age, 10) || 17));
                      const ai = raw.trim() ? computeAiOverallProvisional(t.id, raw, ageNum) : null;
                      return (
                        <tr key={t.id} className="border-b border-surface-border/60 last:border-0">
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-center gap-1">
                              <span className="font-medium leading-snug text-zinc-200">{t.label}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setEvaluationHelpOpenId((open) => (open === t.id ? null : t.id))
                                }
                                className={cn(
                                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors",
                                  "border-zinc-500/80 text-zinc-400 hover:border-accent/80 hover:text-accent",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                                  evaluationHelpOpenId === t.id &&
                                    "border-accent/80 bg-accent/10 text-accent"
                                )}
                                aria-label={`Como registar o teste: ${t.label}`}
                                aria-expanded={evaluationHelpOpenId === t.id}
                              >
                                !
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEvaluationMediaOpenId((open) => (open === t.id ? null : t.id))
                                }
                                className={cn(
                                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                                  "border-zinc-500/80 text-zinc-400 hover:border-accent/80 hover:text-accent",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                                  evaluationMediaOpenId === t.id &&
                                    "border-accent/80 bg-accent/10 text-accent"
                                )}
                                aria-label={`Ver demonstração: ${t.label}`}
                                aria-expanded={evaluationMediaOpenId === t.id}
                              >
                                <Search className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                              </button>
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-600">{t.hint}</p>
                            {evaluationHelpOpenId === t.id && (
                              <p className="mt-2 rounded-lg border border-surface-border bg-zinc-900/85 p-2.5 text-xs leading-relaxed text-zinc-400">
                                {t.protocolNote}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <Input
                              value={raw}
                              placeholder={t.valuePlaceholder}
                              onChange={(e) =>
                                setEvaluationDraft((d) => ({ ...d, [t.id]: e.target.value }))
                              }
                              className="min-w-[140px]"
                            />
                          </td>
                          <td className="px-3 py-3 align-middle text-right">
                            {ai != null ? (
                              <Badge variant="accent" className="min-w-[2.5rem] justify-center tabular-nums">
                                {ai}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
      {mediaOverlay}
    </>
  );
}
