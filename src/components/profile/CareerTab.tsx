"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Plus,
  Save,
  ScrollText,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import type {
  CoachCareerCurrent,
  CoachCareerDocument,
  CoachCareerSeason,
  CoachCertificationEntry,
  CoachCertificationGoal,
  CoachDistrictAssociationId,
  CoachHonorEntry,
  CoachProfileState,
  UefaLicenseId,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { profileFieldClass, profileTextAreaClass } from "@/components/profile/field-styles";
import { newCoachEntityId } from "@/lib/coach-entity-id";
import { COACH_DISTRICT_ASSOCIATIONS } from "@/lib/coach-district-associations";
import {
  CAREER_ROLE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  careerRoleLabel,
  employmentStatusLabel,
} from "@/lib/coach-profile-constants";
import { UEFA_LICENSE_TEMPLATES, uefaTemplate } from "@/lib/coach-cert-templates";
import {
  buildCareerOriginatedHonors,
  filterManualRemovingConflictsWithGenerated,
  findHonorConflicts,
  mergeHonorsWithCareer,
} from "@/lib/coach-career-honors-sync";
import { winRatePercent } from "@/lib/tactics-match-stats";
import { sortSeasonsChronologically } from "@/lib/coach-career-aggregates";

function emptySeason(): CoachCareerSeason {
  return {
    id: newCoachEntityId("sea"),
    seasonLabel: "",
    club: "",
    ageGroup: "",
    role: "head",
    stats: {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      finalPosition: undefined,
    },
    achievements: {
      championNational: false,
      championDistrictAfId: null,
      cupsWon: "",
      promotion: false,
      maintenance: false,
      qualifiedFinals: false,
      recordsNotes: "",
      distinctions: "",
    },
  };
}

function defaultCurrent(p: CoachProfileState): CoachCareerCurrent {
  return (
    p.careerCurrent ?? {
      club: p.club ?? "",
      ageGroup: "",
      role: "head",
      since: "",
      status: "active",
    }
  );
}

type Props = {
  coachProfile: CoachProfileState;
  hydrated: boolean;
  onCommit: (next: Partial<CoachProfileState>) => void;
};

export function CareerTab({ coachProfile, hydrated, onCommit }: Props) {
  const [seasons, setSeasons] = useState<CoachCareerSeason[]>([]);
  const [current, setCurrent] = useState<CoachCareerCurrent>(defaultCurrent(coachProfile));
  const [certs, setCerts] = useState<CoachCertificationEntry[]>([]);
  const [goal, setGoal] = useState<CoachCertificationGoal | undefined>(undefined);
  const [documents, setDocuments] = useState<CoachCareerDocument[]>([]);
  const [openSeasonId, setOpenSeasonId] = useState<string | null>(null);
  const [openUefa, setOpenUefa] = useState<UefaLicenseId | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingCommit, setPendingCommit] = useState<Partial<CoachProfileState> | null>(null);
  const [conflictBullets, setConflictBullets] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setSeasons(coachProfile.careerSeasons ?? []);
    setCurrent(defaultCurrent(coachProfile));
    setCerts(coachProfile.certifications ?? []);
    setGoal(
      coachProfile.certificationGoal ?? {
        targetLevelId: "uefa_b",
        progressPercent: 0,
        criteriaMet: [],
        criteriaPending: [],
      }
    );
    setDocuments(coachProfile.careerDocuments ?? []);
  }, [hydrated, coachProfile]);

  const uefaByLevel = useMemo(() => {
    const m = new Map<UefaLicenseId, CoachCertificationEntry>();
    for (const c of certs) {
      if (c.kind === "uefa" && c.uefaLevel && c.completed) m.set(c.uefaLevel, c);
    }
    return m;
  }, [certs]);

  function runSave(overrideHonors?: CoachHonorEntry[]) {
    const mode = coachProfile.careerHonorSyncMode ?? "auto";
    const manual = (coachProfile.honors ?? []).filter((h) => h.origin === "manual");
    const generated = buildCareerOriginatedHonors(seasons);
    const nextHonors =
      overrideHonors ??
      (mode === "manual" ? coachProfile.honors : mergeHonorsWithCareer(coachProfile.honors, seasons));

    if (mode !== "manual" && !overrideHonors) {
      const conflicts = findHonorConflicts(manual, generated);
      if (conflicts.length > 0) {
        setConflictBullets(
          conflicts.slice(0, 6).map((c) => `${c.existing.title} · ${c.existing.seasonLabel} · ${c.existing.club}`)
        );
        setPendingCommit({
          careerSeasons: seasons,
          careerCurrent: current,
          certifications: certs,
          certificationGoal: goal,
          careerDocuments: documents,
        });
        setConflictOpen(true);
        return;
      }
    }

    onCommit({
      careerSeasons: seasons,
      careerCurrent: current,
      certifications: certs,
      certificationGoal: goal,
      careerDocuments: documents,
      honors: nextHonors,
    });
    setHint("Carreira guardada.");
    window.setTimeout(() => setHint(null), 2400);
  }

  function resolveConflict(choice: "keep-both" | "drop-manual") {
    if (!pendingCommit) {
      setConflictOpen(false);
      return;
    }
    const manual = (coachProfile.honors ?? []).filter((h) => h.origin === "manual");
    const generated = buildCareerOriginatedHonors(seasons);
    let honors: CoachHonorEntry[];
    if (choice === "keep-both") {
      honors = [...manual, ...generated];
    } else {
      const filtered = filterManualRemovingConflictsWithGenerated(manual, generated);
      honors = [...filtered, ...generated];
    }
    onCommit({
      ...pendingCommit,
      honors,
    });
    setPendingCommit(null);
    setConflictOpen(false);
    setHint("Guardado com sincronização do palmarés.");
    window.setTimeout(() => setHint(null), 2400);
  }

  const addUefaCompleted = (level: UefaLicenseId) => {
    const t = uefaTemplate(level);
    const entry: CoachCertificationEntry = {
      id: newCoachEntityId("cert"),
      kind: "uefa",
      uefaLevel: level,
      title: t?.label,
      completed: true,
      completionYear: new Date().getFullYear(),
      notes: "",
    };
    setCerts((prev) => [...prev.filter((c) => !(c.kind === "uefa" && c.uefaLevel === level && c.completed)), entry]);
  };

  const removeUefaCompleted = (level: UefaLicenseId) => {
    setCerts((prev) => prev.filter((c) => !(c.kind === "uefa" && c.uefaLevel === level)));
  };

  const readDoc = (file: File | null, name: string, category: CoachCareerDocument["category"]) => {
    if (!file) return;
    if (file.size > 1_200_000) return;
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = typeof r.result === "string" ? r.result : undefined;
      setDocuments((d) => [
        ...d,
        {
          id: newCoachEntityId("doc"),
          name: name || file.name,
          category,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-10 pb-16">
      {conflictOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h4 className="font-display text-lg text-white">Conflito com o palmarés</h4>
            <p className="mt-2 text-sm text-zinc-400">
              Existem conquistas manuais muito semelhantes às que vamos gerar a partir desta Carreira. Como queres
              proceder?
            </p>
            <ul className="mt-3 list-inside list-disc text-xs text-zinc-500">
              {conflictBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" className="w-full" onClick={() => resolveConflict("keep-both")}>
                Manter ambos
              </Button>
              <Button
                variant="outline"
                className="w-full border-zinc-600"
                onClick={() => resolveConflict("drop-manual")}
              >
                Remover duplicados manuais e sincronizar
              </Button>
              <button
                type="button"
                className="mt-2 text-center text-sm text-zinc-500 hover:text-white"
                onClick={() => {
                  setConflictOpen(false);
                  setPendingCommit(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden border-accent/25 bg-gradient-to-br from-accent/15 via-zinc-950 to-zinc-950">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center gap-2 text-accent">
            <Briefcase className="h-5 w-5" />
            <CardTitle className="text-white">Estado actual</CardTitle>
          </div>
          <p className="text-sm text-zinc-500">Destaque no topo — visível de relance no teu perfil profissional.</p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-zinc-500">Clube actual</label>
            <input
              className={profileFieldClass}
              value={current.club}
              onChange={(e) => setCurrent((c) => ({ ...c, club: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Escalão</label>
            <input
              className={profileFieldClass}
              value={current.ageGroup}
              onChange={(e) => setCurrent((c) => ({ ...c, ageGroup: e.target.value }))}
              placeholder="U17, Sénior…"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Função</label>
            <select
              className={profileFieldClass}
              value={current.role}
              onChange={(e) =>
                setCurrent((c) => ({ ...c, role: e.target.value as CoachCareerSeason["role"] }))
              }
            >
              {CAREER_ROLE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Desde</label>
            <input
              type="date"
              className={profileFieldClass}
              value={current.since ?? ""}
              onChange={(e) => setCurrent((c) => ({ ...c, since: e.target.value || undefined }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-500">Estado</label>
            <select
              className={profileFieldClass}
              value={current.status}
              onChange={(e) =>
                setCurrent((c) => ({ ...c, status: e.target.value as CoachCareerCurrent["status"] }))
              }
            >
              {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2">
            <p className="text-sm text-zinc-400">
              <span className="font-medium text-zinc-200">{careerRoleLabel(current.role)}</span>
              {" · "}
              <span>{employmentStatusLabel(current.status)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400/90" />
            <h3 className="font-display text-lg text-white">Épocas desportivas</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-dashed border-zinc-600 text-zinc-200"
            onClick={() => {
              const s = emptySeason();
              setSeasons((prev) => [...prev, s]);
              setOpenSeasonId(s.id);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar época
          </Button>
        </div>
        <div className="space-y-3">
          {seasons.length === 0 ? (
            <p className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-sm text-zinc-500">
              A tua timeline começa aqui. Usa o formato <span className="text-zinc-300">2024/25</span> para cada época.
            </p>
          ) : (
            sortSeasonsChronologically(seasons)
              .slice()
              .reverse()
              .map((s) => {
                const open = openSeasonId === s.id;
                const wr = winRatePercent(s.stats.wins, s.stats.played);
                return (
                  <div
                    key={s.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-lg shadow-black/20"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03]"
                      onClick={() => setOpenSeasonId(open ? null : s.id)}
                    >
                      <div className="flex items-center gap-3">
                        {open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                        <div>
                          <p className="font-display text-base text-white">{s.seasonLabel || "Nova época"}</p>
                          <p className="text-xs text-zinc-500">
                            {s.club || "Clube"} · {s.ageGroup || "Escalão"} · {careerRoleLabel(s.role)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-400">
                        {s.stats.played} jogos · {wr}% vit.
                        {s.achievements.championNational || s.achievements.championDistrictAfId ? (
                          <Trophy className="ml-2 inline h-3.5 w-3.5 text-amber-400" />
                        ) : null}
                      </div>
                    </button>
                    {open ? (
                      <div className="space-y-4 border-t border-white/5 px-4 py-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-xs text-zinc-500">Época</label>
                            <input
                              className={profileFieldClass}
                              value={s.seasonLabel}
                              onChange={(e) =>
                                setSeasons((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, seasonLabel: e.target.value } : x))
                                )
                              }
                              placeholder="2025/26"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500">Clube</label>
                            <input
                              className={profileFieldClass}
                              value={s.club}
                              onChange={(e) =>
                                setSeasons((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, club: e.target.value } : x))
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500">Escalão</label>
                            <input
                              className={profileFieldClass}
                              value={s.ageGroup}
                              onChange={(e) =>
                                setSeasons((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, ageGroup: e.target.value } : x))
                                )
                              }
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-xs text-zinc-500">Função</label>
                            <select
                              className={profileFieldClass}
                              value={s.role}
                              onChange={(e) =>
                                setSeasons((prev) =>
                                  prev.map((x) =>
                                    x.id === s.id
                                      ? { ...x, role: e.target.value as CoachCareerSeason["role"] }
                                      : x
                                  )
                                )
                              }
                            >
                              {CAREER_ROLE_OPTIONS.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Estatísticas
                          </p>
                          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
                            {(
                              [
                                ["played", "Jogos"],
                                ["wins", "V"],
                                ["draws", "E"],
                                ["losses", "D"],
                                ["goalsFor", "GM"],
                                ["goalsAgainst", "GS"],
                                ["points", "Pts"],
                              ] as const
                            ).map(([key, lab]) => (
                              <div key={key}>
                                <label className="text-xs text-zinc-500">{lab}</label>
                                <input
                                  type="number"
                                  min={0}
                                  className={profileFieldClass}
                                  value={s.stats[key] ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                                    setSeasons((prev) =>
                                      prev.map((x) =>
                                        x.id === s.id ? { ...x, stats: { ...x.stats, [key]: v } } : x
                                      )
                                    );
                                  }}
                                />
                              </div>
                            ))}
                            <div>
                              <label className="text-xs text-zinc-500">Pos. final</label>
                              <input
                                type="number"
                                min={0}
                                className={profileFieldClass}
                                value={s.stats.finalPosition ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value === "" ? undefined : Number(e.target.value);
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id ? { ...x, stats: { ...x.stats, finalPosition: v } } : x
                                    )
                                  );
                                }}
                              />
                            </div>
                            <div className="flex items-end sm:col-span-2">
                              <p className="text-sm text-accent">
                                Aproveitamento: {winRatePercent(s.stats.wins, s.stats.played)}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Resultados e conquistas
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={s.achievements.championNational}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: {
                                              ...x.achievements,
                                              championNational: e.target.checked,
                                            },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                              Campeão Nacional
                            </label>
                            <div className="sm:col-span-2">
                              <label className="text-xs text-zinc-500" htmlFor={`district-af-${s.id}`}>
                                Campeão distrital
                              </label>
                              <select
                                id={`district-af-${s.id}`}
                                className={`${profileFieldClass} mt-1`}
                                value={s.achievements.championDistrictAfId ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: {
                                              ...x.achievements,
                                              championDistrictAfId: v ? (v as CoachDistrictAssociationId) : null,
                                            },
                                          }
                                        : x
                                    )
                                  );
                                }}
                              >
                                <option value="">— Não —</option>
                                {COACH_DISTRICT_ASSOCIATIONS.map((af) => (
                                  <option key={af.id} value={af.id}>
                                    {af.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={s.achievements.promotion}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: { ...x.achievements, promotion: e.target.checked },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                              Subida de divisão
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={s.achievements.maintenance}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: { ...x.achievements, maintenance: e.target.checked },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                              Manutenção
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={s.achievements.qualifiedFinals}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: {
                                              ...x.achievements,
                                              qualifiedFinals: e.target.checked,
                                            },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                              Fases finais
                            </label>
                          </div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-xs text-zinc-500">Taças ganhas (uma por linha)</label>
                              <textarea
                                className={profileTextAreaClass}
                                rows={2}
                                value={s.achievements.cupsWon}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: { ...x.achievements, cupsWon: e.target.value },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500">Recordes / notas</label>
                              <textarea
                                className={profileTextAreaClass}
                                rows={2}
                                value={s.achievements.recordsNotes ?? ""}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: {
                                              ...x.achievements,
                                              recordsNotes: e.target.value,
                                            },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500">Distinções individuais</label>
                              <textarea
                                className={profileTextAreaClass}
                                rows={2}
                                value={s.achievements.distinctions ?? ""}
                                onChange={(e) =>
                                  setSeasons((prev) =>
                                    prev.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            achievements: {
                                              ...x.achievements,
                                              distinctions: e.target.value,
                                            },
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end border-t border-white/5 pt-4">
                          <button
                            type="button"
                            className="flex items-center gap-2 text-sm text-red-400/90 hover:underline"
                            onClick={() => setSeasons((prev) => prev.filter((x) => x.id !== s.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover época
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-sky-400" />
          <h3 className="font-display text-lg text-white">Progressão UEFA & formação</h3>
        </div>
        <div className="relative mb-8 flex flex-wrap items-center gap-2">
          {UEFA_LICENSE_TEMPLATES.map((t, i) => {
            const done = uefaByLevel.has(t.id);
            return (
              <div key={t.id} className="flex flex-1 items-center" style={{ minWidth: "140px" }}>
                <div
                  className={`flex flex-1 flex-col rounded-xl border px-3 py-3 ${
                    done ? "border-accent/40 bg-accent/10" : "border-white/10 bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-white">{t.shortLabel}</span>
                    {done ? <Award className="h-4 w-4 text-accent" /> : null}
                  </div>
                  <p className="text-[10px] text-zinc-500">{t.label}</p>
                  <button
                    type="button"
                    className="mt-2 text-left text-xs text-sky-400/90 hover:underline"
                    onClick={() => setOpenUefa(openUefa === t.id ? null : t.id)}
                  >
                    {openUefa === t.id ? "Fechar detalhes" : "Critérios & preparação"}
                  </button>
                  {done ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-400/80 hover:underline"
                      onClick={() => removeUefaCompleted(t.id)}
                    >
                      Remover registo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-accent hover:underline"
                      onClick={() => addUefaCompleted(t.id)}
                    >
                      Marcar concluído
                    </button>
                  )}
                </div>
                {i < UEFA_LICENSE_TEMPLATES.length - 1 ? (
                  <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-zinc-600" />
                ) : null}
              </div>
            );
          })}
        </div>

        {openUefa ? (
          <Card className="mb-8 border-white/10 bg-zinc-900/60">
            <CardContent className="pt-6">
              {(() => {
                const tpl = uefaTemplate(openUefa);
                if (!tpl) return null;
                const entry = certs.find((c) => c.kind === "uefa" && c.uefaLevel === openUefa);
                return (
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">Critérios necessários</p>
                      <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
                        {tpl.prep.criteria.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">Benefícios</p>
                      <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
                        {tpl.prep.benefits.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500">Preparação sugerida</p>
                      <ul className="mt-2 list-inside list-disc text-sm text-zinc-400">
                        {tpl.prep.preparation.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    {entry ? (
                      <div className="lg:col-span-3 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="text-xs text-zinc-500">Ano conclusão</label>
                          <input
                            type="number"
                            className={profileFieldClass}
                            value={entry.completionYear ?? ""}
                            onChange={(e) => {
                              const y = e.target.value === "" ? undefined : Number(e.target.value);
                              setCerts((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, completionYear: y } : c))
                              );
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Custo (€)</label>
                          <input
                            type="number"
                            className={profileFieldClass}
                            value={entry.costEur ?? ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? undefined : Number(e.target.value);
                              setCerts((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, costEur: v } : c))
                              );
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Entidade</label>
                          <input
                            className={profileFieldClass}
                            value={entry.issuingBody ?? ""}
                            onChange={(e) =>
                              setCerts((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, issuingBody: e.target.value } : c))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Nº licença</label>
                          <input
                            className={profileFieldClass}
                            value={entry.licenseNumber ?? ""}
                            onChange={(e) =>
                              setCerts((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, licenseNumber: e.target.value } : c))
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Validade</label>
                          <input
                            type="date"
                            className={profileFieldClass}
                            value={entry.validUntil ?? ""}
                            onChange={(e) =>
                              setCerts((prev) =>
                                prev.map((c) =>
                                  c.id === entry.id ? { ...c, validUntil: e.target.value || undefined } : c
                                )
                              )
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-zinc-500">Certificado (ficheiro)</label>
                          <input
                            type="file"
                            className="block w-full text-sm text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-2"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f || f.size > 1_200_000) return;
                              const r = new FileReader();
                              r.onload = () => {
                                const url = typeof r.result === "string" ? r.result : undefined;
                                setCerts((prev) =>
                                  prev.map((c) => (c.id === entry.id ? { ...c, certificateDataUrl: url } : c))
                                );
                              };
                              r.readAsDataURL(f);
                            }}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-zinc-500">Observações</label>
                          <textarea
                            className={profileTextAreaClass}
                            rows={2}
                            value={entry.notes ?? ""}
                            onChange={(e) =>
                              setCerts((prev) =>
                                prev.map((c) => (c.id === entry.id ? { ...c, notes: e.target.value } : c))
                              )
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <ScrollText className="h-4 w-4 text-zinc-400" />
              Licenças FPF & cursos complementares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {certs
              .filter((c) => c.kind === "fpf" || c.kind === "course")
              .map((c) => (
                <div key={c.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/5 p-3">
                  <div className="min-w-[160px] flex-1">
                    <label className="text-xs text-zinc-500">Título</label>
                    <input
                      className={profileFieldClass}
                      value={c.title ?? ""}
                      onChange={(e) =>
                        setCerts((prev) => prev.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)))
                      }
                    />
                  </div>
                  <Button type="button" variant="ghost" className="text-red-400" onClick={() => setCerts((prev) => prev.filter((x) => x.id !== c.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-dashed border-zinc-600"
                onClick={() =>
                  setCerts((prev) => [
                    ...prev,
                    {
                      id: newCoachEntityId("cert"),
                      kind: "fpf",
                      title: "Licença FPF",
                      completed: true,
                      completionYear: new Date().getFullYear(),
                    },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Licença FPF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-dashed border-zinc-600"
                onClick={() =>
                  setCerts((prev) => [
                    ...prev,
                    {
                      id: newCoachEntityId("cert"),
                      kind: "course",
                      title: "Curso complementar",
                      completed: true,
                      completionYear: new Date().getFullYear(),
                    },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Curso complementar
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-gradient-to-br from-violet-950/30 to-zinc-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-400" />
            <CardTitle className="text-white">Objectivo como treinador</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-500">Próximo nível alvo</label>
            <select
              className={profileFieldClass}
              value={goal?.targetLevelId ?? "uefa_b"}
              onChange={(e) =>
                setGoal((g) => ({
                  ...(g ?? {
                    targetLevelId: "uefa_b",
                    progressPercent: 0,
                    criteriaMet: [],
                    criteriaPending: [],
                  }),
                  targetLevelId: e.target.value,
                }))
              }
            >
              {UEFA_LICENSE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              <option value="custom">Outro / personalizado</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Progresso actual (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className={profileFieldClass}
              value={goal?.progressPercent ?? 0}
              onChange={(e) =>
                setGoal((g) => ({
                  ...(g ?? {
                    targetLevelId: "uefa_b",
                    progressPercent: 0,
                    criteriaMet: [],
                    criteriaPending: [],
                  }),
                  progressPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                }))
              }
            />
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${goal?.progressPercent ?? 0}%` }}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-500">Critérios já cumpridos (um por linha)</label>
            <textarea
              className={profileTextAreaClass}
              rows={3}
              value={(goal?.criteriaMet ?? []).join("\n")}
              onChange={(e) =>
                setGoal((g) => ({
                  ...(g ?? {
                    targetLevelId: "uefa_b",
                    progressPercent: 0,
                    criteriaMet: [],
                    criteriaPending: [],
                  }),
                  criteriaMet: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-500">Critérios em falta</label>
            <textarea
              className={profileTextAreaClass}
              rows={3}
              value={(goal?.criteriaPending ?? []).join("\n")}
              onChange={(e) =>
                setGoal((g) => ({
                  ...(g ?? {
                    targetLevelId: "uefa_b",
                    progressPercent: 0,
                    criteriaMet: [],
                    criteriaPending: [],
                  }),
                  criteriaPending: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Prazo pessoal</label>
            <input
              type="date"
              className={profileFieldClass}
              value={goal?.deadline ?? ""}
              onChange={(e) =>
                setGoal((g) => ({
                  ...(g ?? {
                    targetLevelId: "uefa_b",
                    progressPercent: 0,
                    criteriaMet: [],
                    criteriaPending: [],
                  }),
                  deadline: e.target.value || undefined,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <ScrollText className="h-4 w-4" />
            Documentos
          </CardTitle>
          <p className="text-sm text-zinc-500">Certificados e provas (armazenados localmente como anexo).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 p-3">
              <div>
                <p className="text-sm text-white">{d.name}</p>
                <p className="text-xs text-zinc-500">{d.category}</p>
              </div>
              <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => setDocuments((prev) => prev.filter((x) => x.id !== d.id))}>
                Remover
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Nome do documento"
              className={`${profileFieldClass} max-w-xs`}
              id="doc-name-input"
            />
            <select className={`${profileFieldClass} w-40`} id="doc-cat-input">
              <option value="certificate">Certificado</option>
              <option value="proof">Prova</option>
              <option value="other">Outro</option>
            </select>
            <input
              type="file"
              className="block text-sm text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-2"
              onChange={(e) => {
                const elName = document.getElementById("doc-name-input") as HTMLInputElement | null;
                const elCat = document.getElementById("doc-cat-input") as HTMLSelectElement | null;
                readDoc(
                  e.target.files?.[0] ?? null,
                  elName?.value ?? "",
                  (elCat?.value as CoachCareerDocument["category"]) ?? "other"
                );
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md">
        <p className="text-sm text-zinc-400">
          Modo palmarés: <span className="text-accent">{coachProfile.careerHonorSyncMode ?? "auto"}</span>
          {hint ? <span className="ml-3 text-accent">{hint}</span> : null}
        </p>
        <Button type="button" onClick={() => runSave()}>
          <Save className="mr-2 h-4 w-4" />
          Guardar carreira
        </Button>
      </div>
    </div>
  );
}
