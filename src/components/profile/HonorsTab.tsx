"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles, Trophy } from "lucide-react";
import type { CoachHonorCategory, CoachHonorEntry, CoachProfileState } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { profileFieldClass } from "@/components/profile/field-styles";
import { newCoachEntityId } from "@/lib/coach-entity-id";
import {
  HONOR_CATEGORY_OPTIONS,
  honorCategoryLabel,
  honorCategoryUsesLeagueDefaultTrophy,
  TROPHY_CABINET_SLOTS,
} from "@/lib/coach-profile-constants";
import { sortHonorsForCabinetDisplay } from "@/lib/coach-career-aggregates";
import {
  buildCareerOriginatedHonors,
  filterManualRemovingConflictsWithGenerated,
  findHonorConflicts,
  mergeHonorsWithCareer,
  minimalSeasonFromHonor,
} from "@/lib/coach-career-honors-sync";
import { HonorTrophyVisual } from "@/components/profile/HonorTrophyVisual";
import { TrophyCabinet } from "@/components/profile/TrophyCabinet";

type Props = {
  coachProfile: CoachProfileState;
  onCommit: (next: Partial<CoachProfileState>) => void;
};

export function HonorsTab({ coachProfile, onCommit }: Props) {
  const honors = coachProfile.honors ?? [];
  const seasons = coachProfile.careerSeasons ?? [];
  const mode = coachProfile.careerHonorSyncMode ?? "auto";

  const [hint, setHint] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedHonorId, setSelectedHonorId] = useState<string | null>(null);
  const [newHonor, setNewHonor] = useState({
    category: "cup" as CoachHonorCategory,
    title: "",
    seasonLabel: "",
    club: "",
    ageGroup: "",
    createSeason: false,
  });
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictLines, setConflictLines] = useState<string[]>([]);

  const sortedForCabinet = useMemo(() => sortHonorsForCabinetDisplay(honors), [honors]);
  const overflowHonors = useMemo(
    () => sortedForCabinet.slice(TROPHY_CABINET_SLOTS),
    [sortedForCabinet]
  );

  const selectedHonor = useMemo(
    () => (selectedHonorId ? honors.find((h) => h.id === selectedHonorId) ?? null : null),
    [honors, selectedHonorId]
  );

  useEffect(() => {
    if (selectedHonorId && !honors.some((h) => h.id === selectedHonorId)) {
      setSelectedHonorId(null);
    }
  }, [honors, selectedHonorId]);

  function seasonExists(label: string, club: string): boolean {
    return seasons.some((s) => s.seasonLabel.trim() === label.trim() && s.club.trim() === club.trim());
  }

  function applySync(resolution?: "keep-both" | "drop-manual") {
    const manual = honors.filter((h) => h.origin === "manual");
    const generated = buildCareerOriginatedHonors(seasons);
    if (!resolution) {
      const conflicts = findHonorConflicts(manual, generated);
      if (conflicts.length > 0) {
        setConflictLines(conflicts.slice(0, 8).map((c) => `${c.existing.title} (${c.existing.seasonLabel})`));
        setConflictOpen(true);
        return;
      }
    }
    let next: CoachHonorEntry[];
    if (resolution === "drop-manual") {
      next = [...filterManualRemovingConflictsWithGenerated(manual, generated), ...generated];
    } else if (resolution === "keep-both") {
      next = [...manual, ...generated];
    } else {
      next = mergeHonorsWithCareer(honors, seasons);
    }
    onCommit({ honors: next });
    setHint("Palmarés sincronizado.");
    window.setTimeout(() => setHint(null), 2400);
    setConflictOpen(false);
  }

  function addManualHonor() {
    if (!newHonor.title.trim() || !newHonor.seasonLabel.trim()) {
      setHint("Preenche pelo menos título e época.");
      window.setTimeout(() => setHint(null), 3000);
      return;
    }
    const entry: CoachHonorEntry = {
      id: newCoachEntityId("hon"),
      category: newHonor.category,
      title: newHonor.title.trim(),
      seasonLabel: newHonor.seasonLabel.trim(),
      club: newHonor.club.trim(),
      ageGroup: newHonor.ageGroup.trim(),
      origin: "manual",
    };
    let nextSeasons = seasons;
    if (newHonor.createSeason) {
      if (seasonExists(newHonor.seasonLabel, newHonor.club)) {
        setHint("Já existe uma época com o mesmo clube e temporada — não foi duplicada.");
        window.setTimeout(() => setHint(null), 3500);
      } else {
        const s = minimalSeasonFromHonor(entry);
        nextSeasons = [...seasons, s];
      }
    }
    onCommit({
      honors: [...honors, entry],
      careerSeasons: nextSeasons,
    });
    setNewHonor({
      category: "cup",
      title: "",
      seasonLabel: "",
      club: "",
      ageGroup: "",
      createSeason: false,
    });
    setAddOpen(false);
    setHint("Conquista adicionada.");
    window.setTimeout(() => setHint(null), 2400);
  }

  return (
    <div className="space-y-8 pb-12">
      {conflictOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h4 className="font-display text-lg text-white">Conflito na sincronização</h4>
            <p className="mt-2 text-sm text-zinc-400">
              Há entradas manuais muito parecidas com as geradas pela Carreira.
            </p>
            <ul className="mt-3 max-h-40 overflow-y-auto text-xs text-zinc-500">
              {conflictLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" className="w-full" onClick={() => applySync("keep-both")}>
                Manter ambos
              </Button>
              <Button variant="outline" className="w-full border-zinc-600" onClick={() => applySync("drop-manual")}>
                Priorizar carreira (remover manuais em duplicado)
              </Button>
              <button
                type="button"
                className="mt-2 text-center text-sm text-zinc-500 hover:text-white"
                onClick={() => setConflictOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TrophyCabinet
        honors={honors}
        selectedId={selectedHonorId}
        onSelect={(h) => setSelectedHonorId(h?.id ?? null)}
      />

      {selectedHonor ? (
        <Card className="border-accent/25 bg-zinc-900/70">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-white">{selectedHonor.title}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                {honorCategoryLabel(selectedHonor.category)} · {selectedHonor.seasonLabel} ·{" "}
                {selectedHonor.club || "—"} · {selectedHonor.ageGroup || "—"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {selectedHonor.origin === "career" ? "Origem: Carreira" : "Origem: Manual"}
              </p>
            </div>
            <Button type="button" variant="ghost" className="text-zinc-400" onClick={() => setSelectedHonorId(null)}>
              Fechar
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 sm:flex-row">
            <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-white/10 bg-zinc-800/50">
              <HonorTrophyVisual honor={selectedHonor} variant="card" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3">
              <div>
                <label className="text-xs text-zinc-500" htmlFor="honor-category-edit">
                  Categoria
                </label>
                <select
                  id="honor-category-edit"
                  className={`${profileFieldClass} mt-1`}
                  value={selectedHonor.category}
                  onChange={(e) => {
                    const category = e.target.value as CoachHonorCategory;
                    onCommit({
                      honors: honors.map((x) => (x.id === selectedHonor.id ? { ...x, category } : x)),
                    });
                  }}
                >
                  {HONOR_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                  {selectedHonor.category === "league" ? (
                    <option value="league">{honorCategoryLabel("league")}</option>
                  ) : null}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer text-sm text-accent hover:underline">
                  Carregar imagem do troféu
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f || f.size > 900_000) return;
                      const r = new FileReader();
                      r.onload = () => {
                        const url = typeof r.result === "string" ? r.result : undefined;
                        onCommit({
                          honors: honors.map((x) =>
                            x.id === selectedHonor.id ? { ...x, trophyImageDataUrl: url } : x
                          ),
                        });
                      };
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
                {selectedHonor.trophyImageDataUrl && honorCategoryUsesLeagueDefaultTrophy(selectedHonor.category) ? (
                  <button
                    type="button"
                    className="text-sm text-zinc-500 hover:text-zinc-300 hover:underline"
                    onClick={() =>
                      onCommit({
                        honors: honors.map((x) =>
                          x.id === selectedHonor.id ? { ...x, trophyImageDataUrl: undefined } : x
                        ),
                      })
                    }
                  >
                    Usar troféu de campeão padrão
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-sm text-red-400/90 hover:underline"
                  onClick={() => {
                    onCommit({ honors: honors.filter((x) => x.id !== selectedHonor.id) });
                    setSelectedHonorId(null);
                  }}
                >
                  Remover conquista
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950/30 to-zinc-950">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-amber-400" />
            <div>
              <p className="font-display text-white">Sincronização inteligente</p>
              <p className="text-sm text-zinc-500">
                Modo <span className="text-amber-200/90">{mode === "auto" ? "automático" : "manual"}</span>:{" "}
                {mode === "auto"
                  ? "ao guardares a Carreira, o palmarés é actualizado (com confirmação se houver conflitos)."
                  : "só alteras o palmarés quando sincronizas aqui ou editas entradas."}
              </p>
              {hint ? <p className="mt-2 text-sm text-accent">{hint}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "auto" ? "primary" : "outline"}
              onClick={() => onCommit({ careerHonorSyncMode: "auto" })}
            >
              Automático
            </Button>
            <Button
              variant={mode === "manual" ? "primary" : "outline"}
              onClick={() => onCommit({ careerHonorSyncMode: "manual" })}
            >
              Manual
            </Button>
            <Button variant="secondary" onClick={() => applySync()}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-dashed border-amber-600/50 text-amber-200"
          onClick={() => setAddOpen((v) => !v)}
        >
          {addOpen ? "Fechar formulário" : "+ Conquista manual"}
        </Button>
      </div>

      {addOpen ? (
        <Card className="border-white/10 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Nova conquista</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-zinc-500">Categoria</label>
              <select
                className={profileFieldClass}
                value={newHonor.category}
                onChange={(e) =>
                  setNewHonor((n) => ({ ...n, category: e.target.value as CoachHonorCategory }))
                }
              >
                {HONOR_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Título</label>
              <input
                className={profileFieldClass}
                value={newHonor.title}
                onChange={(e) => setNewHonor((n) => ({ ...n, title: e.target.value }))}
                placeholder="Ex.: Taça Distrital"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Época</label>
              <input
                className={profileFieldClass}
                value={newHonor.seasonLabel}
                onChange={(e) => setNewHonor((n) => ({ ...n, seasonLabel: e.target.value }))}
                placeholder="2024/25"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Clube</label>
              <input
                className={profileFieldClass}
                value={newHonor.club}
                onChange={(e) => setNewHonor((n) => ({ ...n, club: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500">Escalão</label>
              <input
                className={profileFieldClass}
                value={newHonor.ageGroup}
                onChange={(e) => setNewHonor((n) => ({ ...n, ageGroup: e.target.value }))}
                placeholder="Sénior, U15…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={newHonor.createSeason}
                onChange={(e) => setNewHonor((n) => ({ ...n, createSeason: e.target.checked }))}
              />
              Criar entrada mínima na Carreira (sincronização inversa)
            </label>
            <div className="sm:col-span-2">
              <Button className="bg-amber-600 hover:bg-amber-500" onClick={addManualHonor}>
                Guardar conquista
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {overflowHonors.length > 0 ? (
        <Card className="border-white/10 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Trophy className="h-4 w-4 text-amber-500" />
              Fora da vitrine ({overflowHonors.length})
            </CardTitle>
            <p className="text-sm text-zinc-500">
              O armário mostra as {TROPHY_CABINET_SLOTS} conquistas mais recentes (por época). As restantes ficam
              listadas aqui para editares ou removeres.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {overflowHonors.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">{h.title}</p>
                  <p className="text-xs text-zinc-500">
                    {honorCategoryLabel(h.category)} · {h.seasonLabel} · {h.club || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() => setSelectedHonorId(h.id)}
                  >
                    Detalhes
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-400/80 hover:underline"
                    onClick={() => onCommit({ honors: honors.filter((x) => x.id !== h.id) })}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
