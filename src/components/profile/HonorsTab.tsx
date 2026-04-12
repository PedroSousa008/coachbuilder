"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles, Trophy } from "lucide-react";
import type { CoachHonorCategory, CoachHonorEntry, CoachProfileState } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { profileFieldClass } from "@/components/profile/field-styles";
import { newCoachEntityId } from "@/lib/coach-entity-id";
import { CHAMPIONSHIP_TROPHY_IMAGE_PATH, HONOR_CATEGORY_OPTIONS } from "@/lib/coach-profile-constants";
import {
  buildCareerOriginatedHonors,
  filterManualRemovingConflictsWithGenerated,
  findHonorConflicts,
  mergeHonorsWithCareer,
  minimalSeasonFromHonor,
} from "@/lib/coach-career-honors-sync";

type Props = {
  coachProfile: CoachProfileState;
  onCommit: (next: Partial<CoachProfileState>) => void;
};

function HonorTrophyVisual({ honor }: { honor: CoachHonorEntry }) {
  const defaultChampion =
    honor.category === "league" ? CHAMPIONSHIP_TROPHY_IMAGE_PATH : null;
  const src = honor.trophyImageDataUrl ?? defaultChampion;
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-amber-500/40">
        <Trophy className="h-14 w-14" />
        <span className="text-xs uppercase tracking-wider">Troféu</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover opacity-90"
      onError={() => setBroken(true)}
    />
  );
}

export function HonorsTab({ coachProfile, onCommit }: Props) {
  const honors = coachProfile.honors ?? [];
  const seasons = coachProfile.careerSeasons ?? [];
  const mode = coachProfile.careerHonorSyncMode ?? "auto";

  const [hint, setHint] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
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

  const grouped = useMemo(() => {
    const g = new Map<CoachHonorCategory, CoachHonorEntry[]>();
    for (const h of honors) {
      const list = g.get(h.category) ?? [];
      list.push(h);
      g.set(h.category, list);
    }
    return g;
  }, [honors]);

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
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={() => applySync("keep-both")}>
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
              {hint ? <p className="mt-2 text-sm text-emerald-400">{hint}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "auto" ? "primary" : "outline"}
              className={mode === "auto" ? "bg-emerald-700 hover:bg-emerald-600" : ""}
              onClick={() => onCommit({ careerHonorSyncMode: "auto" })}
            >
              Automático
            </Button>
            <Button
              variant={mode === "manual" ? "primary" : "outline"}
              className={mode === "manual" ? "bg-emerald-700 hover:bg-emerald-600" : ""}
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
        <Button variant="outline" className="border-dashed border-amber-600/50 text-amber-200" onClick={() => setAddOpen((v) => !v)}>
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

      {HONOR_CATEGORY_OPTIONS.map((cat) => {
        const list = grouped.get(cat.id) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={cat.id}>
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-white">
              <Trophy className="h-5 w-5 text-amber-400/90" />
              {cat.label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((h) => (
                <Card
                  key={h.id}
                  className="group overflow-hidden border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950 transition hover:border-amber-500/30"
                >
                  <div className="relative aspect-[4/3] bg-zinc-800/50">
                    <HonorTrophyVisual honor={h} />
                    <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-zinc-300">
                      {h.origin === "career" ? "Carreira" : "Manual"}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <p className="font-display text-base font-semibold text-white">{h.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {h.seasonLabel} · {h.club || "—"} · {h.ageGroup || "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="cursor-pointer text-xs text-amber-400/90 hover:underline">
                        Imagem
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
                                honors: honors.map((x) => (x.id === h.id ? { ...x, trophyImageDataUrl: url } : x)),
                              });
                            };
                            r.readAsDataURL(f);
                          }}
                        />
                      </label>
                      {h.trophyImageDataUrl && h.category === "league" ? (
                        <button
                          type="button"
                          className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
                          onClick={() =>
                            onCommit({
                              honors: honors.map((x) =>
                                x.id === h.id ? { ...x, trophyImageDataUrl: undefined } : x
                              ),
                            })
                          }
                        >
                          Usar troféu de campeão padrão
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-xs text-red-400/80 hover:underline"
                        onClick={() => onCommit({ honors: honors.filter((x) => x.id !== h.id) })}
                      >
                        Remover
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {honors.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-sm text-zinc-500">
          Ainda sem troféus. Sincroniza com a Carreira ou adiciona conquistas manualmente.
        </p>
      ) : null}
    </div>
  );
}
