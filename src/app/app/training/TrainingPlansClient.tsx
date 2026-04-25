"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiFullTrainingSession,
  AiSingleDrill,
  AiTrainingBlock,
  AiTrainingPhase,
} from "@/lib/training-ai-types";
import { SessionCard } from "@/components/training/SessionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddTrainingSessionModal } from "@/components/training/AddTrainingSessionModal";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatPlayerPositions, sortSquadRoster } from "@/lib/player-positions";
import {
  buildFullSessionDocumentHtml,
  buildSingleDrillDocumentHtml,
  openPrintableHtml,
} from "@/lib/training-print-html";
import { TrainingVideoEmbed } from "@/components/training/TrainingVideoEmbed";
import { SaveExerciseModal } from "@/components/training/SaveExerciseModal";
import {
  buildLocalFullTrainingSession,
  buildLocalSingleDrill,
  getTrainingCatalogItems,
  type TrainingCatalogItem,
} from "@/lib/training-session-local";
import { Search } from "lucide-react";
import {
  TRAINING_AGE_GROUP_LABELS,
  TRAINING_AGE_GROUPS,
  type TrainingExerciseAgeMap,
} from "@/lib/training-age-groups";
import {
  SAVED_EXERCISE_CATEGORIES,
  SAVED_EXERCISE_CATEGORY_LABELS,
  suggestSavedExerciseCategory,
} from "@/lib/saved-exercise-categories";
import type {
  NewSavedTrainingExerciseInput,
  SavedExerciseCategory,
  TrainingAgeGroupId,
  TrainingSession,
} from "@/types";

const DURATIONS = [30, 60, 90, 120] as const;
const MANUAL_TOTAL_EXERCISE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12] as const;
const MANUAL_CATEGORY_ORDER: SavedExerciseCategory[] = [
  "warmup",
  "possession",
  "goalKick",
  "setPiece",
  "pressing",
  "finishing",
  "defensive",
  "transition",
  "physical",
  "mixed",
  "stretching",
];

function phaseLabel(p: AiTrainingPhase): string {
  if (p === "warmup") return "Aquecimento";
  if (p === "cooldown") return "Alongamento / volta à calma";
  return "Principal";
}

type SaveExercisePayload = Omit<NewSavedTrainingExerciseInput, "category">;

export function TrainingPlansClient() {
  const {
    trainingSessions,
    addTrainingSession,
    players,
    trainingPlayerIdsBySession,
    setTrainingSessionPlayerIds,
    savedTrainingExercises,
    addSavedTrainingExercise,
    updateSavedTrainingExercise,
    removeSavedTrainingExercise,
    coachProfile,
    setCoachProfile,
  } = useAppData();
  const { user } = useAuth();

  const coachPrintName = useMemo(
    () => coachProfile.name.trim() || user?.name?.trim() || "",
    [coachProfile.name, user?.name]
  );

  const [labTab, setLabTab] = useState<"full" | "manual" | "drill" | "library" | "catalog">("full");
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS)[number]>(60);
  const [objective, setObjective] = useState("");
  const [drillBrief, setDrillBrief] = useState("");

  const [selectedAiIds, setSelectedAiIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelectedAiIds((prev) => {
      const valid = new Set(players.map((p) => p.id));
      const next = new Set<string>();
      if (prev.size === 0) {
        players.forEach((p) => next.add(p.id));
        return next;
      }
      for (const id of prev) if (valid.has(id)) next.add(id);
      for (const p of players) if (!prev.has(p.id)) next.add(p.id);
      return next;
    });
  }, [players]);

  const selectedPlayers = useMemo(
    () => players.filter((p) => selectedAiIds.has(p.id)),
    [players, selectedAiIds]
  );
  const selectedCount = selectedPlayers.length;

  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleAiPlayer = (id: string) => {
    setSelectedAiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return next;
        next.delete(id);
      } else next.add(id);
      return next;
    });
  };

  const [fullLoading, setFullLoading] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fullPlan, setFullPlan] = useState<AiFullTrainingSession | null>(null);
  const [fullMeta, setFullMeta] = useState<{ durationMin: number; playerCount: number } | null>(null);
  const [singleDrill, setSingleDrill] = useState<AiSingleDrill | null>(null);

  const [saveModal, setSaveModal] = useState<{
    defaultCategory: SavedExerciseCategory;
    payload: SaveExercisePayload;
  } | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<"all" | SavedExerciseCategory>("all");
  const [catalogExpandedIds, setCatalogExpandedIds] = useState<Set<string>>(() => new Set());
  const [catalogFilterPick, setCatalogFilterPick] = useState<Set<SavedExerciseCategory>>(() => new Set());
  const [manualTotalExercises, setManualTotalExercises] = useState<number>(6);
  const [manualCategoryTargets, setManualCategoryTargets] = useState<Record<SavedExerciseCategory, number>>({
    warmup: 1,
    stretching: 0,
    possession: 2,
    goalKick: 0,
    setPiece: 0,
    pressing: 0,
    finishing: 1,
    defensive: 0,
    transition: 1,
    physical: 0,
    mixed: 1,
  });
  const [manualSelectedCatalogIds, setManualSelectedCatalogIds] = useState<Record<SavedExerciseCategory, string[]>>({
    warmup: [],
    stretching: [],
    possession: [],
    goalKick: [],
    setPiece: [],
    pressing: [],
    finishing: [],
    defensive: [],
    transition: [],
    physical: [],
    mixed: [],
  });

  const selectedAgeGroup: TrainingAgeGroupId = coachProfile.trainingSquadAgeGroup ?? "juvenil";
  const exerciseAgeMap: TrainingExerciseAgeMap | undefined = coachProfile.trainingExerciseAgeMap;

  const trainingCatalog = useMemo(() => getTrainingCatalogItems(selectedPlayers), [selectedPlayers]);

  const setSelectedAgeGroup = useCallback(
    (ageGroup: TrainingAgeGroupId) => {
      setCoachProfile({ trainingSquadAgeGroup: ageGroup });
    },
    [setCoachProfile]
  );

  const filteredTrainingCatalog = useMemo(() => {
    if (catalogFilterPick.size === 0) return trainingCatalog;
    return trainingCatalog.filter((item) => item.filterCategories.some((c) => catalogFilterPick.has(c)));
  }, [trainingCatalog, catalogFilterPick]);

  const manualCatalogById = useMemo(
    () => new Map(trainingCatalog.map((item) => [item.catalogId, item])),
    [trainingCatalog]
  );

  const manualTargetTotal = useMemo(
    () => MANUAL_CATEGORY_ORDER.reduce((sum, c) => sum + (manualCategoryTargets[c] ?? 0), 0),
    [manualCategoryTargets]
  );
  const manualTargetMismatch = manualTargetTotal !== manualTotalExercises;

  const manualSelectedCountByCategory = useMemo(() => {
    const out = {} as Record<SavedExerciseCategory, number>;
    for (const c of MANUAL_CATEGORY_ORDER) out[c] = manualSelectedCatalogIds[c]?.length ?? 0;
    return out;
  }, [manualSelectedCatalogIds]);

  const manualPlanBlocks = useMemo(() => {
    const blocks: AiTrainingBlock[] = [];
    for (const c of MANUAL_CATEGORY_ORDER) {
      const ids = manualSelectedCatalogIds[c] ?? [];
      for (const id of ids) {
        const item = manualCatalogById.get(id);
        if (!item) continue;
        blocks.push({
          title: item.title,
          durationMin: item.durationMin,
          phase: item.phase,
          description: item.description,
          coachingPoints: item.coachingPoints,
          setup: item.setup,
          groupSplit: item.groupSplit,
          diagramHint: item.diagramHint,
          videoUrl: item.videoUrl,
        });
      }
    }
    return blocks;
  }, [manualCatalogById, manualSelectedCatalogIds]);

  const manualPlanDurationMin = useMemo(
    () => manualPlanBlocks.reduce((sum, b) => sum + b.durationMin, 0),
    [manualPlanBlocks]
  );

  const manualPlanReady = useMemo(() => {
    if (manualTargetMismatch) return false;
    for (const c of MANUAL_CATEGORY_ORDER) {
      const want = manualCategoryTargets[c] ?? 0;
      if (want > 0 && (manualSelectedCatalogIds[c]?.length ?? 0) !== want) return false;
    }
    return manualPlanBlocks.length === manualTotalExercises;
  }, [manualCategoryTargets, manualPlanBlocks.length, manualSelectedCatalogIds, manualTargetMismatch, manualTotalExercises]);

  const toggleCatalogBrief = useCallback((catalogId: string) => {
    setCatalogExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  }, []);

  const toggleCatalogFilter = useCallback((c: SavedExerciseCategory) => {
    setCatalogFilterPick((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const setManualTargetForCategory = useCallback((category: SavedExerciseCategory, value: number) => {
    const nextValue = Math.max(0, Math.min(12, Math.floor(value)));
    setManualCategoryTargets((prev) => ({ ...prev, [category]: nextValue }));
    setManualSelectedCatalogIds((prev) => {
      const selected = prev[category] ?? [];
      if (selected.length <= nextValue) return prev;
      return { ...prev, [category]: selected.slice(0, nextValue) };
    });
  }, []);

  const toggleManualCatalogItem = useCallback(
    (category: SavedExerciseCategory, catalogId: string) => {
      const limit = manualCategoryTargets[category] ?? 0;
      setManualSelectedCatalogIds((prev) => {
        const current = prev[category] ?? [];
        if (current.includes(catalogId)) {
          return { ...prev, [category]: current.filter((id) => id !== catalogId) };
        }
        if (limit <= 0 || current.length >= limit) return prev;
        return { ...prev, [category]: [...current, catalogId] };
      });
    },
    [manualCategoryTargets]
  );

  const filteredSaved = useMemo(() => {
    const list = [...savedTrainingExercises].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (libraryFilter === "all") return list;
    return list.filter((x) => x.category === libraryFilter);
  }, [savedTrainingExercises, libraryFilter]);

  const openSaveFromBlock = (b: AiTrainingBlock) => {
    setSaveModal({
      defaultCategory: suggestSavedExerciseCategory({
        title: b.title,
        videoUrl: b.videoUrl,
        phase: b.phase,
      }),
      payload: {
        title: b.title,
        durationMin: b.durationMin,
        description: b.description,
        coachingPoints: b.coachingPoints,
        setup: b.setup,
        groupSplit: b.groupSplit,
        diagramHint: b.diagramHint,
        videoUrl: b.videoUrl,
        sourcePhase: b.phase,
      },
    });
  };

  const openSaveFromDrill = () => {
    if (!singleDrill) return;
    setSaveModal({
      defaultCategory: suggestSavedExerciseCategory({
        title: singleDrill.title,
        videoUrl: singleDrill.videoUrl,
      }),
      payload: {
        title: singleDrill.title,
        durationMin: singleDrill.durationMin,
        description: singleDrill.description,
        coachingPoints: singleDrill.coachingCues ?? "",
        diagramHint: singleDrill.diagramHint,
        videoUrl: singleDrill.videoUrl,
        progression: singleDrill.progression,
        variations: singleDrill.variations,
        objective: singleDrill.objective,
      },
    });
  };

  const openSaveFromCatalogItem = (item: TrainingCatalogItem) => {
    setSaveModal({
      defaultCategory: item.defaultSaveCategory,
      payload: {
        title: item.title,
        durationMin: item.durationMin,
        description: item.description,
        coachingPoints: item.coachingPoints,
        setup: item.setup,
        groupSplit: item.groupSplit,
        diagramHint: item.diagramHint,
        videoUrl: item.videoUrl,
        progression: item.progression,
        variations: item.variations,
        objective: "Adicionado a partir do catálogo «Todos os exercícios».",
        sourcePhase: item.phase,
      },
    });
  };

  const confirmSaveExercise = (category: SavedExerciseCategory) => {
    if (!saveModal) return;
    addSavedTrainingExercise({ ...saveModal.payload, category });
    setSaveModal(null);
    setLabTab("library");
  };

  const runFullLocal = () => {
    setErr(null);
    setFullPlan(null);
    setFullMeta(null);
    setFullLoading(true);
    queueMicrotask(() => {
      try {
        const plan = buildLocalFullTrainingSession({
          durationMin,
          objective: objective.trim(),
          players: selectedPlayers,
          ageGroup: selectedAgeGroup,
          exerciseAgeMap,
        });
        setFullPlan(plan);
        setFullMeta({ durationMin, playerCount: selectedCount });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (
          msg === "no_drills_for_age_group" ||
          msg === "explicit_drills_not_in_age_group" ||
          msg === "warmup_not_in_age_group"
        ) {
          setErr(
            `Não há exercícios suficientes associados ao escalão ${TRAINING_AGE_GROUP_LABELS[selectedAgeGroup]}. Atualiza as associações na aba "Todos os exercícios".`
          );
        } else {
          setErr("Não foi possível gerar o plano.");
        }
      } finally {
        setFullLoading(false);
      }
    });
  };

  const runDrillLocal = () => {
    setErr(null);
    setSingleDrill(null);
    setDrillLoading(true);
    queueMicrotask(() => {
      try {
        const drill = buildLocalSingleDrill(drillBrief.trim(), selectedPlayers, selectedAgeGroup, exerciseAgeMap);
        setSingleDrill(drill);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "no_drills_for_age_group" || msg === "explicit_drills_not_in_age_group") {
          setErr(
            `Não há exercícios associados ao escalão ${TRAINING_AGE_GROUP_LABELS[selectedAgeGroup]}. Atualiza as associações na aba "Todos os exercícios".`
          );
        } else {
          setErr("Não foi possível gerar o exercício.");
        }
      } finally {
        setDrillLoading(false);
      }
    });
  };

  const printFull = useCallback(() => {
    if (!fullPlan || !fullMeta) return;
    const sortedForPrint = sortSquadRoster(selectedPlayers, "position");
    const playerLines = sortedForPrint.map((p) => `#${p.number} ${p.name} — ${formatPlayerPositions(p)}`);
    const assetBaseUrl = window.location.origin;
    const html = buildFullSessionDocumentHtml({
      plan: fullPlan,
      durationMin: fullMeta.durationMin,
      playerLines,
      generatedAt: new Date().toLocaleString("pt-PT"),
      assetBaseUrl,
      coachPrintName,
    });
    openPrintableHtml(html);
  }, [fullPlan, fullMeta, selectedPlayers, coachPrintName]);

  const printDrill = useCallback(() => {
    if (!singleDrill) return;
    const assetBaseUrl = window.location.origin;
    const html = buildSingleDrillDocumentHtml({
      drill: singleDrill,
      generatedAt: new Date().toLocaleString("pt-PT"),
      assetBaseUrl,
      coachPrintName,
    });
    openPrintableHtml(html);
  }, [singleDrill, coachPrintName]);

  const printManualPlan = useCallback(() => {
    if (!manualPlanReady) return;
    const sortedForPrint = sortSquadRoster(selectedPlayers, "position");
    const playerLines = sortedForPrint.map((p) => `#${p.number} ${p.name} — ${formatPlayerPositions(p)}`);
    const assetBaseUrl = window.location.origin;
    const plan: AiFullTrainingSession = {
      sessionTitle: `Sessão manual · ${manualPlanDurationMin} min`,
      summary: `Sessão construída manualmente por tópicos. Escalão selecionado: ${TRAINING_AGE_GROUP_LABELS[selectedAgeGroup]}.`,
      blocks: manualPlanBlocks,
      closingNotes: "Plano manual criado pelo treinador a partir do catálogo de exercícios.",
    };
    const html = buildFullSessionDocumentHtml({
      plan,
      durationMin: manualPlanDurationMin,
      playerLines,
      generatedAt: new Date().toLocaleString("pt-PT"),
      assetBaseUrl,
      coachPrintName,
    });
    openPrintableHtml(html);
  }, [
    coachPrintName,
    manualPlanBlocks,
    manualPlanDurationMin,
    manualPlanReady,
    selectedAgeGroup,
    selectedPlayers,
  ]);

  const saveFullAsSession = () => {
    if (!fullPlan || !fullMeta) return;
    const desc = [
      fullPlan.summary,
      "",
      ...fullPlan.blocks.map(
        (b) =>
          `### ${b.title} (${b.durationMin} min, ${phaseLabel(b.phase)})\n${b.description}\n\n${b.coachingPoints}`
      ),
      "",
      fullPlan.closingNotes,
    ].join("\n");
    addTrainingSession({
      title: fullPlan.sessionTitle.slice(0, 80),
      date: new Date().toISOString(),
      durationMin: fullMeta.durationMin,
      intensity: "medium",
      categories: ["Possession", "Recovery"],
      description: desc.slice(0, 12000),
    });
  };

  const saveManualAsSession = () => {
    if (!manualPlanReady) return;
    const desc = [
      `Plano manual por tópicos (escalão: ${TRAINING_AGE_GROUP_LABELS[selectedAgeGroup]}).`,
      "",
      ...manualPlanBlocks.map(
        (b) => `### ${b.title} (${b.durationMin} min, ${phaseLabel(b.phase)})\n${b.description}\n\n${b.coachingPoints}`
      ),
      "",
      "Plano montado manualmente pelo treinador.",
    ].join("\n");
    addTrainingSession({
      title: `Sessão manual · ${manualPlanDurationMin} min`.slice(0, 80),
      date: new Date().toISOString(),
      durationMin: manualPlanDurationMin,
      intensity: "medium",
      categories: ["Possession", "Recovery"],
      description: desc.slice(0, 12000),
    });
  };

  /* ——— legado: lista manual ——— */
  const sorted = useMemo(
    () => [...trainingSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [trainingSessions]
  );
  const [selectedId, setSelectedId] = useState("");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  useEffect(() => {
    if (trainingSessions.length === 0) {
      setSelectedId("");
      return;
    }
    const order = [...trainingSessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const firstId = order[0]!.id;
    if (!selectedId || !order.some((s) => s.id === selectedId)) setSelectedId(firstId);
  }, [trainingSessions, selectedId]);

  const selected = sorted.find((s) => s.id === selectedId) ?? sorted[0];
  const selectedPlayerIds = selected ? trainingPlayerIdsBySession[selected.id] ?? [] : [];

  const togglePlayerForSession = (playerId: string) => {
    if (!selected) return;
    const set = new Set(selectedPlayerIds);
    if (set.has(playerId)) set.delete(playerId);
    else set.add(playerId);
    setTrainingSessionPlayerIds(selected.id, [...set]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16 print:hidden">
      <AddTrainingSessionModal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onSave={(input) => {
          const s = addTrainingSession(input);
          setSelectedId(s.id);
        }}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Planos de treino</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Motor local (como o Style of Play): combina o teu texto com templates e o plantel — sem API externa, sem
            custo por uso. Imprime ou guarda em PDF pelo browser. Diagramas: descrições para desenhares no quadro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="shrink-0 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-left transition hover:bg-sky-500/15"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300/90">Plantel na sessão</p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-white">{selectedCount}</p>
          <p className="text-xs text-zinc-500">Clica para incluir ou retirar jogadores</p>
        </button>
      </header>

      <Card className="border-indigo-500/25 bg-indigo-500/5">
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/90">Escalão da equipa</p>
              <p className="mt-1 text-sm text-zinc-500">
                O gerador usa este escalão para só propor exercícios associados a essa idade.
              </p>
            </div>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value as TrainingAgeGroupId)}
              className="rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2 text-sm text-zinc-200"
            >
              {TRAINING_AGE_GROUPS.map((id) => (
                <option key={id} value={id}>
                  {TRAINING_AGE_GROUP_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {pickerOpen ? (
        <Card className="border-sky-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quem entra no plano</CardTitle>
            <p className="text-xs text-zinc-500">
              Dados da Equipa. O gerador usa nomes, números e posições nos textos (ex.: divisão de grupos).
            </p>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <p className="text-sm text-zinc-500">Adiciona jogadores em Equipa primeiro.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto sm:max-h-80">
                {players.map((p) => {
                  const on = selectedAiIds.has(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                          on ? "bg-sky-500/10" : "hover:bg-white/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleAiPlayer(p.id)}
                          className="h-4 w-4 rounded border-zinc-600"
                        />
                        <span className="text-sm font-medium text-white">
                          #{p.number} {p.name}
                        </span>
                        <span className="text-xs text-zinc-500">{formatPlayerPositions(p)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-1">
        <button
          type="button"
          onClick={() => setLabTab("full")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            labTab === "full" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Sessão completa AI
        </button>
        <button
          type="button"
          onClick={() => setLabTab("manual")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            labTab === "manual" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Sessão completa manual
        </button>
        <button
          type="button"
          onClick={() => setLabTab("drill")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            labTab === "drill" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Exercício isolado
        </button>
        <button
          type="button"
          onClick={() => setLabTab("library")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            labTab === "library" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Meus exercícios ({savedTrainingExercises.length})
        </button>
        <button
          type="button"
          onClick={() => setLabTab("catalog")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            labTab === "catalog" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Todos os exercícios
        </button>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>
      ) : null}

      <SaveExerciseModal
        open={saveModal !== null}
        exerciseTitle={saveModal?.payload.title ?? ""}
        defaultCategory={saveModal?.defaultCategory ?? "mixed"}
        onClose={() => setSaveModal(null)}
        onConfirm={confirmSaveExercise}
      />

      {labTab === "catalog" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Todos os exercícios</CardTitle>
              <p className="text-sm text-zinc-500">
                Todos os modelos do motor local (aquecimento, blocos principais com ou sem vídeo, volta à calma).
                Filtra por uma ou mais categorias; sem nenhuma selecção vês a lista completa. A bola com a lupa mostra
                a explicação; «Guardar exercício» envia para «Meus exercícios» com o mesmo detalhe que os outros.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Filtrar por tipo</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Podes activar várias opções. Mostram-se exercícios que coincidam com pelo menos um filtro.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {SAVED_EXERCISE_CATEGORIES.map((c) => {
                    const on = catalogFilterPick.has(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCatalogFilter(c)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          on ? "bg-accent/25 text-accent" : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {SAVED_EXERCISE_CATEGORY_LABELS[c]}
                      </button>
                    );
                  })}
                  {catalogFilterPick.size > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCatalogFilterPick(new Set())}
                      className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </div>
              {filteredTrainingCatalog.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum exercício corresponde a esta combinação de filtros.</p>
              ) : (
                <ul className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTrainingCatalog.map((item) => {
                    const open = catalogExpandedIds.has(item.catalogId);
                    return (
                      <li
                        key={item.catalogId}
                        className="flex flex-col rounded-2xl border border-surface-border bg-surface-raised/15 p-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-display text-base font-semibold text-white">{item.title}</h3>
                          <Badge variant="muted" className="text-[10px]">
                            {phaseLabel(item.phase)} · {item.durationMin} min
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.filterCategories.map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-500"
                            >
                              {SAVED_EXERCISE_CATEGORY_LABELS[c]}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex-1">
                          {item.videoUrl ? (
                            <TrainingVideoEmbed videoUrl={item.videoUrl} title={item.title} />
                          ) : (
                            <p className="rounded-xl border border-dashed border-surface-border bg-black/20 px-3 py-8 text-center text-xs text-zinc-500">
                              Sem vídeo de demonstração para este exercício.
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                          <button
                            type="button"
                            onClick={() => toggleCatalogBrief(item.catalogId)}
                            className={cn(
                              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                              open
                                ? "border-accent/50 bg-accent/10 text-white"
                                : "border-surface-border bg-surface-raised/40 text-zinc-300 hover:border-accent/35 hover:bg-surface-raised"
                            )}
                            aria-expanded={open}
                            aria-label={
                              open
                                ? `Ocultar explicação de ${item.title}`
                                : `Ver explicação breve de ${item.title}`
                            }
                          >
                            <span className="text-xl leading-none" aria-hidden>
                              ⚽
                            </span>
                            <Search
                              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border border-[#0c1014] bg-[#0c1014] p-0.5 text-accent"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                          {open ? (
                            <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-surface-border bg-black/25 px-3 py-2 text-sm text-zinc-300">
                              <p className="leading-relaxed">{item.brief}</p>
                              <p className="text-xs leading-relaxed text-zinc-500">
                                <span className="font-medium text-zinc-400">Porquê / como:</span>{" "}
                                {item.coachingPoints}
                              </p>
                              {item.setup ? (
                                <p className="text-xs leading-relaxed text-zinc-500">
                                  <span className="font-medium text-zinc-400">Organização:</span> {item.setup}
                                </p>
                              ) : null}
                              {item.groupSplit ? (
                                <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100/90">
                                  <span className="font-medium">Grupos:</span> {item.groupSplit}
                                </p>
                              ) : null}
                              {item.progression ? (
                                <p className="text-xs text-zinc-500">
                                  <span className="font-medium text-zinc-400">Progressão:</span> {item.progression}
                                </p>
                              ) : null}
                              {item.variations ? (
                                <p className="text-xs text-zinc-500">
                                  <span className="font-medium text-zinc-400">Variações:</span> {item.variations}
                                </p>
                              ) : null}
                              {item.diagramHint ? (
                                <p className="rounded-lg bg-zinc-800/80 px-2 py-1.5 font-mono text-[11px] text-zinc-400">
                                  Diagrama sugerido: {item.diagramHint}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => openSaveFromCatalogItem(item)}
                          >
                            Guardar exercício
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : labTab === "library" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biblioteca pessoal</CardTitle>
              <p className="text-sm text-zinc-500">
                Exercícios que guardaste a partir do gerador. As notas são só tuas (conta + sincronização cloud).
                Filtra por tipo para organizares.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLibraryFilter("all")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    libraryFilter === "all"
                      ? "bg-accent/25 text-accent"
                      : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Todos
                </button>
                {SAVED_EXERCISE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLibraryFilter(c)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      libraryFilter === c
                        ? "bg-accent/25 text-accent"
                        : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {SAVED_EXERCISE_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
              {filteredSaved.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {savedTrainingExercises.length === 0
                    ? "Ainda não guardaste nenhum exercício. Gera um plano ou um exercício isolado e clica em «Guardar exercício»."
                    : "Nenhum exercício neste filtro."}
                </p>
              ) : (
                <ul className="space-y-4">
                  {filteredSaved.map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-2xl border border-surface-border bg-surface-raised/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-white">{ex.title}</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {ex.durationMin} min
                            {ex.sourcePhase ? ` · ${phaseLabel(ex.sourcePhase)}` : ""}
                            {" · "}
                            {new Date(ex.updatedAt).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`cat-${ex.id}`}>
                            Tipo
                          </label>
                          <select
                            id={`cat-${ex.id}`}
                            value={ex.category}
                            onChange={(e) =>
                              updateSavedTrainingExercise(ex.id, {
                                category: e.target.value as SavedExerciseCategory,
                              })
                            }
                            className="rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1.5 text-xs text-zinc-200"
                          >
                            {SAVED_EXERCISE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {SAVED_EXERCISE_CATEGORY_LABELS[c]}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs text-red-300 hover:bg-red-500/10"
                            onClick={() => removeSavedTrainingExercise(ex.id)}
                          >
                            Apagar
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-zinc-300">{ex.description}</p>
                      <p className="mt-2 text-sm text-zinc-500">
                        <span className="font-medium text-zinc-400">Porquê / como:</span> {ex.coachingPoints}
                      </p>
                      {ex.objective ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          <span className="text-zinc-400">Pedido original:</span> {ex.objective}
                        </p>
                      ) : null}
                      {ex.setup ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          <span className="text-zinc-400">Organização:</span> {ex.setup}
                        </p>
                      ) : null}
                      {ex.groupSplit ? (
                        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                          <span className="font-medium">Grupos:</span> {ex.groupSplit}
                        </p>
                      ) : null}
                      {ex.progression ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          <span className="text-zinc-400">Progressão:</span> {ex.progression}
                        </p>
                      ) : null}
                      {ex.variations ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          <span className="text-zinc-400">Variações:</span> {ex.variations}
                        </p>
                      ) : null}
                      {ex.videoUrl ? <TrainingVideoEmbed videoUrl={ex.videoUrl} title={ex.title} /> : null}
                      {ex.diagramHint ? (
                        <p className="mt-2 rounded-lg bg-zinc-800/80 px-3 py-2 font-mono text-xs text-zinc-400">
                          {ex.diagramHint}
                        </p>
                      ) : null}
                      <div className="mt-4">
                        <label className="text-xs font-medium text-zinc-400" htmlFor={`notes-${ex.id}`}>
                          As minhas notas (só eu vejo)
                        </label>
                        <textarea
                          id={`notes-${ex.id}`}
                          value={ex.coachNotes}
                          onChange={(e) => updateSavedTrainingExercise(ex.id, { coachNotes: e.target.value })}
                          rows={3}
                          placeholder="Ex.: ajustes para o escalão sub-15, material extra, o que correu bem ou mal…"
                          className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : labTab === "manual" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sessão completa manual</CardTitle>
              <p className="text-sm text-zinc-500">
                Define quantos exercícios queres e quantos por tópico. Depois escolhe os exercícios no catálogo para
                fechar a sessão.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Quantidade total de exercícios</p>
                <div className="flex flex-wrap gap-2">
                  {MANUAL_TOTAL_EXERCISE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setManualTotalExercises(n)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                        manualTotalExercises === n
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500">Soma dos tópicos: {manualTargetTotal}</p>
                {manualTargetMismatch ? (
                  <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    A soma dos tópicos tem de ser igual ao total ({manualTotalExercises}).
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MANUAL_CATEGORY_ORDER.map((c) => (
                  <label key={`target-${c}`} className="rounded-xl border border-surface-border bg-surface-raised/20 px-3 py-2">
                    <span className="block text-xs text-zinc-500">{SAVED_EXERCISE_CATEGORY_LABELS[c]}</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={manualCategoryTargets[c] ?? 0}
                      onChange={(e) => setManualTargetForCategory(c, Number.parseInt(e.target.value || "0", 10))}
                      className="mt-1 w-20 rounded-lg border border-surface-border bg-[#0c1014] px-2 py-1 text-sm text-zinc-200"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {MANUAL_CATEGORY_ORDER.filter((c) => (manualCategoryTargets[c] ?? 0) > 0).map((c) => {
            const want = manualCategoryTargets[c] ?? 0;
            const selectedIds = manualSelectedCatalogIds[c] ?? [];
            const options = trainingCatalog
              .filter((item) => item.filterCategories.includes(c))
              .sort((a, b) => a.title.localeCompare(b.title, "pt-PT"));
            return (
              <Card key={`manual-pick-${c}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {SAVED_EXERCISE_CATEGORY_LABELS[c]} ({selectedIds.length}/{want})
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    Escolhe {want} exercício(s) deste tópico.
                  </p>
                </CardHeader>
                <CardContent>
                  {options.length === 0 ? (
                    <p className="text-sm text-zinc-500">Sem exercícios disponíveis neste tópico.</p>
                  ) : (
                    <ul className="space-y-2">
                      {options.map((item) => {
                        const checked = selectedIds.includes(item.catalogId);
                        const disabled = !checked && selectedIds.length >= want;
                        return (
                          <li key={`manual-item-${c}-${item.catalogId}`}>
                            <label
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition-colors",
                                checked
                                  ? "border-accent/40 bg-accent/10"
                                  : "border-surface-border bg-surface-raised/10 hover:border-zinc-600"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleManualCatalogItem(c, item.catalogId)}
                                className="mt-0.5 h-4 w-4 rounded border-zinc-600"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                                <p className="text-xs text-zinc-500">
                                  {phaseLabel(item.phase)} · {item.durationMin} min
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">{item.brief}</p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-emerald-500/20">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Resumo da sessão manual</CardTitle>
                <p className="mt-1 text-sm text-zinc-500">
                  {manualPlanBlocks.length} exercícios · {manualPlanDurationMin} min
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-xs" onClick={printManualPlan} disabled={!manualPlanReady}>
                  Imprimir / PDF
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={saveManualAsSession}
                  disabled={!manualPlanReady}
                >
                  Guardar no plano manual
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!manualPlanReady ? (
                <p className="text-sm text-zinc-500">
                  Completa as escolhas por tópico para ativar impressão e guardar.
                </p>
              ) : null}
              <ol className="space-y-2">
                {manualPlanBlocks.map((b, i) => (
                  <li key={`manual-summary-${b.title}-${i}`} className="rounded-xl border border-surface-border bg-surface-raised/10 px-3 py-2">
                    <p className="text-sm font-medium text-zinc-100">
                      {i + 1}. {b.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {phaseLabel(b.phase)} · {b.durationMin} min
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      ) : labTab === "full" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Objetivo de hoje</CardTitle>
              <p className="text-sm text-zinc-500">
                Ex.: treino com foco na posse e transições rápidas para o último terço; ou pressão alta nos primeiros
                20 min.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Duração total</p>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationMin(d)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                        durationMin === d
                          ? "bg-accent/20 text-accent"
                          : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="train-objective" className="text-xs font-medium text-zinc-500">
                  Descrição do treinador
                </label>
                <textarea
                  id="train-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={4}
                  placeholder="O que queres trabalhar hoje?"
                  className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <Button
                type="button"
                onClick={runFullLocal}
                disabled={fullLoading || selectedCount === 0 || objective.trim().length < 8}
                className="w-full sm:w-auto"
              >
                {fullLoading ? "A gerar…" : "Gerar sessão completa"}
              </Button>
              {selectedCount === 0 ? (
                <p className="text-xs text-amber-200/90">Selecciona pelo menos um jogador no plantel acima.</p>
              ) : null}
            </CardContent>
          </Card>

          {fullPlan && fullMeta ? (
            <Card className="border-emerald-500/20">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{fullPlan.sessionTitle}</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    {fullMeta.durationMin} min · {fullMeta.playerCount} jogadores · blocos com tempos e justificações
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={printFull}>
                    Imprimir / PDF
                  </Button>
                  <Button type="button" variant="secondary" className="text-xs" onClick={saveFullAsSession}>
                    Guardar no plano manual
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm leading-relaxed text-zinc-300">{fullPlan.summary}</p>
                <div className="space-y-4">
                  {fullPlan.blocks.map((b, i) => (
                    <div
                      key={`${b.title}-${i}`}
                      className="rounded-xl border border-surface-border bg-surface-raised/20 p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-medium text-white">
                          {i + 1}. {b.title}
                        </h3>
                        <Badge variant="muted">
                          {phaseLabel(b.phase)} · {b.durationMin} min
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{b.description}</p>
                      <p className="mt-2 text-sm text-zinc-500">
                        <span className="font-medium text-zinc-400">Porquê / como:</span> {b.coachingPoints}
                      </p>
                      {b.setup ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          <span className="text-zinc-400">Organização:</span> {b.setup}
                        </p>
                      ) : null}
                      {b.groupSplit ? (
                        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                          <span className="font-medium">Grupos:</span> {b.groupSplit}
                        </p>
                      ) : null}
                      {b.videoUrl ? <TrainingVideoEmbed videoUrl={b.videoUrl} title={b.title} /> : null}
                      {b.diagramHint ? (
                        <p className="mt-2 rounded-lg bg-zinc-800/80 px-3 py-2 font-mono text-xs text-zinc-400">
                          Diagrama sugerido: {b.diagramHint}
                        </p>
                      ) : null}
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => openSaveFromBlock(b)}
                        >
                          Guardar exercício
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-zinc-400">{fullPlan.closingNotes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Um exercício sob medida</CardTitle>
              <p className="text-sm text-zinc-500">
                Já tens o resto da sessão? Pede só um exercício (rondo, transição, finalização em velocidade, etc.). O
                plantel seleccionado entra no contexto.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={drillBrief}
                onChange={(e) => setDrillBrief(e.target.value)}
                rows={4}
                placeholder="Ex.: rondo 6v2+2 com saídas de 2 toques para dois mini-golos laterais"
                className="w-full resize-y rounded-xl border border-surface-border bg-[#0c1014] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                type="button"
                onClick={runDrillLocal}
                disabled={drillLoading || drillBrief.trim().length < 10}
              >
                {drillLoading ? "A gerar…" : "Gerar exercício"}
              </Button>
            </CardContent>
          </Card>

          {singleDrill ? (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{singleDrill.title}</CardTitle>
                  <p className="text-sm text-zinc-500">{singleDrill.durationMin} min</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={openSaveFromDrill}>
                    Guardar exercício
                  </Button>
                  <Button type="button" variant="secondary" className="text-xs" onClick={printDrill}>
                    Imprimir / PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-300">
                <p>
                  <span className="text-zinc-500">Objetivo:</span> {singleDrill.objective}
                </p>
                <p>{singleDrill.description}</p>
                {singleDrill.progression ? (
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Progressão:</span> {singleDrill.progression}
                  </p>
                ) : null}
                {singleDrill.coachingCues ? (
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Cues:</span> {singleDrill.coachingCues}
                  </p>
                ) : null}
                {singleDrill.variations ? (
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Variações:</span> {singleDrill.variations}
                  </p>
                ) : null}
                {singleDrill.videoUrl ? (
                  <TrainingVideoEmbed videoUrl={singleDrill.videoUrl} title={singleDrill.title} />
                ) : null}
                {singleDrill.diagramHint ? (
                  <p className="rounded-lg bg-zinc-800/80 p-3 font-mono text-xs text-zinc-400">
                    {singleDrill.diagramHint}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <details className="rounded-2xl border border-surface-border bg-surface-raised/10 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300">
          Sessões manuais (legado) — {sorted.length} guardadas
        </summary>
        <div className="mt-6 grid gap-8 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Lista</p>
              <Button type="button" variant="secondary" className="text-xs" onClick={() => setSessionModalOpen(true)}>
                Nova sessão manual
              </Button>
            </div>
            {sorted.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma sessão manual.</p>
            ) : (
              sorted.map((s: TrainingSession) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  selected={s.id === selected?.id}
                  onClick={() => setSelectedId(s.id)}
                />
              ))
            )}
          </div>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{selected?.title ?? "Detalhe"}</CardTitle>
              {selected && (
                <p className="text-sm text-zinc-500">
                  {new Date(selected.date).toLocaleString("pt-PT", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {selected.durationMin} min
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {selected ? (
                <>
                  <p className="text-sm text-zinc-300">{selected.description}</p>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Jogadores em foco</p>
                    {players.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">Sem jogadores na equipa.</p>
                    ) : (
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-surface-border p-2">
                        {players.map((p) => {
                          const on = selectedPlayerIds.includes(p.id);
                          return (
                            <li key={p.id}>
                              <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => togglePlayerForSession(p.id)}
                                  className="h-4 w-4 rounded"
                                />
                                #{p.number} {p.name}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">Cria uma sessão manual ou usa o gerador em cima.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </details>
    </div>
  );
}
