/**
 * Coaching Development — catálogo de tópicos, competências e lições (vídeos).
 *
 * Tópicos e competências vivem em `coaching-catalog-specs.ts` (lista completa).
 *
 * Para cada vídeo/lição publicada, adiciona `COACHING_LESSON_DEVELOPMENTS`.
 * - `lessonId` = **dia do programa** desde a criação da conta (`day-001` … `day-365`), o mesmo id que a pasta
 *   em `public/coaching-daily-videos/`. O desafio continua a guardar `completedDayKeys` como datas de calendário;
 *   a app converte anchor + data → N e usa `day-NNN` para o catálogo e para o vídeo.
 * - Lista `skillIds`: ids das competências — formato `{topicId}-{slugDoNome}` (ver `COACHING_SKILLS` na app ou inspecciona `slugify`).
 *
 * Progresso: cada visualização válida soma `100 / N` pontos percentuais,
 * onde `N` = número de lições no catálogo que referenciam essa competência.
 * Competências sem lições ainda aparecem na tabela com 0% até serem ligadas.
 */

import { TOPIC_SKILL_SPECS } from "./coaching-catalog-specs";

export type CoachingTopicDef = {
  id: string;
  label: string;
  summary?: string;
};

export type CoachingSkillDef = {
  id: string;
  topicId: string;
  label: string;
  summary?: string;
  /** Ordem dentro do tópico no catálogo (0-based). */
  catalogOrder?: number;
};

export type CoachingLessonDevelopmentDef = {
  lessonId: string;
  title: string;
  skillIds: string[];
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const COACHING_TOPICS: CoachingTopicDef[] = TOPIC_SKILL_SPECS.map((t) => ({
  id: t.id,
  label: t.label,
  summary: t.summary,
}));

export const COACHING_SKILLS: CoachingSkillDef[] = TOPIC_SKILL_SPECS.flatMap((t) =>
  t.skills.map((label, catalogOrder) => ({
    id: `${t.id}-${slugify(label)}`,
    topicId: t.id,
    label,
    catalogOrder,
  }))
);

/**
 * Catálogo de lições → competências.
 * `lessonId` = `day-001` … (program day). Exemplos nos primeiros dias.
 */
export const COACHING_LESSON_DEVELOPMENTS: CoachingLessonDevelopmentDef[] = [
  {
    lessonId: "day-001",
    title: "Fabregas - Building up to Attack - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-decision-making",
      "tactical-intelligence-positioning",
      "midfielder-elite-habits-scanning",
      "goalkeeper-specific-distribution",
      "centre-back-build-up-passing",
      "midfield-mastery-passing-lane-manipulation",
      "midfield-mastery-support-angle-creation",
      "midfielder-elite-habits-receive-between-lines",
      "midfield-mastery-dictating-possession",
      "tactical-intelligence-press-resistance",
    ],
  },
  {
    lessonId: "day-002",
    title: "Fabregas - Playing under Pressure - Coaches' Vision",
    skillIds: [
      "midfield-mastery-deep-build-up-composure",
      "midfielder-elite-habits-press-escape-awareness",
      "technical-ability-through-balls",
      "centre-back-line-control",
      "midfield-mastery-support-angle-creation",
      "attacking-skills-movement-off-ball",
      "tactical-intelligence-timing-of-runs",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-positioning",
    ],
  },
  {
    lessonId: "day-003",
    title: "Fabregas - Importance of the Midfield - Coaches' Vision",
    skillIds: [
      "midfielder-elite-habits-scanning",
      "midfielder-elite-habits-open-body-shape",
      "midfielder-elite-habits-forward-passing-mindset",
      "advanced-tactical-between-line-positioning",
      "advanced-tactical-overload-creation",
      "advanced-tactical-width-management",
      "midfield-mastery-vertical-progression",
      "tactical-intelligence-rotation-understanding",
      "attacking-skills-movement-off-ball",
      "tactical-intelligence-decision-making",
    ],
  },
  {
    lessonId: "day-004",
    title: "Fabregas - Importance of the Wingers - Coaches' Vision",
    skillIds: [
      "defensive-skills-pressing-intensity",
      "advanced-tactical-depth-management",
      "advanced-tactical-weak-side-exploitation",
      "midfield-mastery-deep-build-up-composure",
      "attacking-skills-movement-off-ball",
      "tactical-intelligence-transition-awareness",
    ],
  },
  {
    lessonId: "day-005",
    title: "Fabregas - Trust the Process - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-game-reading",
      "tactical-intelligence-positioning",
      "midfield-mastery-deep-build-up-composure",
      "coach-development-metrics-leadership-presence-as-coach",
      "mental-attributes-confidence",
      "tactical-intelligence-spatial-awareness",
      "tactical-intelligence-numerical-superiority-recognition",
      "tactical-intelligence-decision-making",
    ],
  },
  {
    lessonId: "day-006",
    title: "Thiago Alcântara - Importance of Positioning - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-positioning",
      "tactical-intelligence-spatial-awareness",
      "tactical-intelligence-timing-of-runs",
      "attacking-skills-movement-off-ball",
      "midfielder-elite-habits-scanning",
      "midfielder-elite-habits-receive-between-lines",
      "midfielder-elite-habits-one-touch-awareness",
      "technical-ability-passing-accuracy",
      "advanced-tactical-between-line-positioning",
      "advanced-tactical-creating-passing-angles",
      "midfield-mastery-support-angle-creation",
      "midfield-mastery-vertical-progression",
    ],
  },
  {
    lessonId: "day-007",
    title: "Thiago Alcântara - False 9 Options - Coaches' Vision",
    skillIds: [
      "midfield-mastery-midfield-balance-awareness",
      "tactical-intelligence-positioning",
      "advanced-tactical-overload-creation",
      "tactical-intelligence-rotation-understanding",
      "attacking-specialist-dribble-to-final-third",
      "tactical-intelligence-tactical-discipline",
      "tactical-intelligence-spatial-awareness",
      "advanced-tactical-double-movement-timing",
      "tactical-intelligence-zone-occupation",
      "striker-false-nine-link-play",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-decision-making",
      "tactical-intelligence-numerical-superiority-recognition",
    ],
  },
  {
    lessonId: "day-008",
    title: "Thiago Alcântara - Full Backs and Wingers Coordination - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-game-reading",
      "advanced-tactical-width-management",
      "full-back-wing-back-inverted-fullback-iq",
      "tactical-intelligence-positioning",
      "communication-leadership-organising-teammates",
      "tactical-intelligence-rotation-understanding",
      "tactical-intelligence-zone-occupation",
    ],
  },
  {
    lessonId: "day-009",
    title: "Thiago Alcântara - Striker Stretching the Team - Coaches' Vision",
    skillIds: [
      "attacking-skills-hold-up-play",
      "attacking-skills-link-up-play",
      "advanced-tactical-width-management",
      "attacking-skills-cut-inside-threat",
      "tactical-intelligence-third-man-awareness",
      "attacking-skills-combination-play",
      "midfielder-elite-habits-receive-between-lines",
      "midfield-mastery-support-angle-creation",
      "striker-running-channels",
      "advanced-tactical-creating-passing-angles",
    ],
  },
  {
    lessonId: "day-010",
    title: "Thiago Alcântara - Midfielder dropping for Build Up - Coaches' Vision",
    skillIds: [
      "midfielder-elite-habits-scanning",
      "midfield-mastery-deep-build-up-composure",
      "centre-back-build-up-passing",
      "attacking-skills-creativity",
      "midfielder-elite-habits-receive-between-lines",
      "tactical-intelligence-spatial-awareness",
      "advanced-tactical-between-line-positioning",
      "tactical-intelligence-line-breaking-vision",
      "midfield-mastery-passing-lane-manipulation",
      "tactical-intelligence-numerical-superiority-recognition",
      "attacking-skills-combination-play",
      "tactical-intelligence-decision-making",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-creating-passing-angles",
      "tactical-intelligence-zone-occupation",
      "midfield-mastery-dictating-possession",
    ],
  },
  {
    lessonId: "day-011",
    title: "Thiago Alcântara - Midfield Defensive Awareness - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-spatial-awareness",
      "tactical-intelligence-defensive-shape-understanding",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-zone-occupation",
      "defensive-skills-defensive-positioning",
      "communication-leadership-trigger-communication",
      "advanced-tactical-trigger-press-recognition",
      "defensive-skills-tracking-runners",
      "advanced-tactical-width-management",
      "advanced-tactical-depth-management",
      "advanced-tactical-defensive-cover-shadow",
    ],
  },
  {
    lessonId: "day-012",
    title: "Thiago Alcântara - Reaction to Losing the ball - Coaches' Vision",
    skillIds: [
      "defensive-skills-pressing-intensity",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-counter-prevention",
      "advanced-physical-work-rate-engine",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-numerical-superiority-recognition",
      "defensive-skills-anticipation",
      "advanced-tactical-press-trap-understanding",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-zone-occupation",
      "defensive-skills-tackling",
      "defensive-skills-interceptions",
      "defensive-skills-second-ball-winning",
      "communication-leadership-trigger-communication",
      "tactical-intelligence-tactical-discipline",
    ],
  },
  {
    lessonId: "day-013",
    title: "Zabaleta - Importance of Full Backs - Coaches' Vision",
    skillIds: [
      "full-back-wing-back-wide-channel-defending",
      "centre-back-build-up-passing",
      "physical-attributes-stamina",
      "physical-attributes-recovery-speed",
      "advanced-physical-work-rate-engine",
      "attacking-skills-overlap-timing",
      "full-back-wing-back-overlap-end-product",
      "advanced-tactical-creating-passing-angles",
      "wide-player-winger-wide-combination-play",
      "defensive-skills-defensive-positioning",
      "defensive-skills-tracking-runners",
      "physical-attributes-physical-duels",
      "defensive-skills-1v1-defending",
      "defensive-specialist-back-pedal-control",
      "defensive-specialist-defensive-body-shape",
      "attacking-skills-underlap-timing",
      "full-back-wing-back-underlap-runs",
      "advanced-tactical-decoy-runs",
    ],
  },
  {
    lessonId: "day-014",
    title: "Zabaleta - Defending 1v1 situations as a Full Back - Coaches' Vision",
    skillIds: [
      "defensive-skills-1v1-defending",
      "defensive-specialist-last-man-defending",
      "defensive-specialist-tackling-timing",
      "centre-back-body-position-in-duels",
      "defensive-skills-defensive-positioning",
      "tactical-intelligence-marking-intelligence",
      "tactical-intelligence-covering-space",
      "full-back-wing-back-wide-defensive-timing",
      "full-back-wing-back-wide-channel-defending",
      "defensive-skills-tracking-runners",
      "defensive-skills-recovery-runs",
      "advanced-physical-work-rate-engine",
      "defensive-skills-defensive-communication",
      "communication-leadership-defensive-instructions",
      "defensive-skills-anticipation",
      "tactical-intelligence-game-reading",
      "centre-back-line-control",
      "coach-development-metrics-opposition-analysis-skill",
      "defensive-skills-blocking",
    ],
  },
  {
    lessonId: "day-015",
    title: "Zabaleta - Final Decision after Overlap - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-decision-making",
      "attacking-skills-chance-creation",
      "attacking-specialist-final-third-decisions",
      "full-back-wing-back-overlap-end-product",
      "advanced-technical-cut-back-delivery",
      "wide-player-winger-cutback-awareness",
      "attacking-skills-final-pass",
      "attacking-skills-box-movement",
      "advanced-technical-low-cross-accuracy",
      "advanced-technical-early-cross-timing",
      "full-back-wing-back-endline-delivery",
      "wide-player-winger-cross-after-sprint",
      "advanced-technical-first-time-cross",
      "attacking-skills-near-post-runs",
      "attacking-skills-far-post-runs",
      "attacking-specialist-double-movement-in-box",
      "striker-penalty-box-presence",
      "striker-near-post-movement",
    ],
  },
  {
    lessonId: "day-016",
    title: "Zabaleta - Full Back and Wingers Adaptation - Coaches' Vision",
    skillIds: [
      "coach-evaluation-development-role-adaptation",
      "wide-player-winger-wide-combination-play",
      "full-back-wing-back-support-under-pressure",
      "full-back-wing-back-inverted-fullback-iq",
      "midfield-mastery-support-angle-creation",
      "tactical-intelligence-timing-of-runs",
      "advanced-tactical-creating-passing-angles",
      "attacking-skills-hold-up-play",
      "attacking-skills-link-up-play",
      "tactical-intelligence-decision-making",
      "tactical-intelligence-game-reading",
      "coach-evaluation-development-tactical-understanding",
      "advanced-tactical-rest-defence-awareness",
    ],
  },
  {
    lessonId: "day-017",
    title: "Zabaleta - Importance of switching from Overlap to Underlap - Coaches' Vision",
    skillIds: [
      "attacking-skills-underlap-timing",
      "full-back-wing-back-underlap-runs",
      "advanced-tactical-creating-passing-angles",
      "midfield-mastery-support-angle-creation",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-decision-making",
      "advanced-tactical-match-momentum-reading",
      "attacking-skills-movement-off-ball",
      "attacking-specialist-explosive-run-in-behind",
    ],
  },
  {
    lessonId: "day-018",
    title: "Zabaleta - Inverted Full Back - Coaches' Vision",
    skillIds: [
      "full-back-wing-back-inverted-fullback-iq",
      "centre-back-build-up-passing",
      "advanced-tactical-between-line-positioning",
      "midfield-mastery-midfield-balance-awareness",
      "advanced-tactical-blind-side-movement",
      "advanced-tactical-creating-passing-angles",
      "tactical-intelligence-numerical-superiority-recognition",
      "midfielder-elite-habits-receive-between-lines",
      "midfield-mastery-press-escape-turns",
      "midfield-mastery-receiving-on-back-foot",
      "midfielder-elite-habits-open-body-shape",
      "midfielder-elite-habits-half-turn-receiving",
      "tactical-intelligence-spatial-awareness",
      "tactical-intelligence-positioning",
      "technical-ability-first-touch",
      "advanced-technical-touch-into-space",
      "midfielder-elite-habits-scanning",
      "midfielder-elite-habits-shoulder-checks",
      "tactical-intelligence-line-breaking-vision",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-zone-occupation",
      "attacking-skills-combination-play",
    ],
  },
  {
    lessonId: "day-019",
    title: "Zabaleta - Game reading as an Inverted Full Back - Coaches' Vision",
    skillIds: [
      "tactical-intelligence-game-reading",
      "advanced-tactical-match-momentum-reading",
      "tactical-intelligence-line-breaking-vision",
      "technical-ability-through-balls",
      "full-back-wing-back-inverted-fullback-iq",
      "defensive-skills-counter-pressing",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-counter-prevention",
      "defensive-skills-anticipation",
      "defensive-skills-pressing-intensity",
      "defensive-specialist-delay-counter-attack",
    ],
  },
  {
    lessonId: "day-020",
    title: "Zabaleta - Inverted Full Back Movement inside the Box - Coaches' Vision",
    skillIds: [
      "full-back-wing-back-inverted-fullback-iq",
      "tactical-intelligence-zone-occupation",
      "attacking-skills-box-movement",
      "attacking-skills-far-post-runs",
      "attacking-specialist-timing-to-attack-space",
      "wide-player-winger-far-post-arrival",
      "attacking-skills-movement-off-ball",
      "tactical-intelligence-timing-of-runs",
      "attacking-specialist-poacher-instinct",
      "attacking-specialist-rebound-awareness",
      "tactical-intelligence-game-reading",
      "advanced-tactical-match-momentum-reading",
      "striker-one-chance-one-goal-mentality",
    ],
  },
  {
    lessonId: "day-021",
    title: "Vítor Pereira - Between the Lines - Coaches’ Vision",
    skillIds: [
      "tactical-intelligence-line-breaking-vision",
      "midfielder-elite-habits-receive-between-lines",
      "advanced-tactical-between-line-positioning",
      "midfield-mastery-vertical-progression",
      "centre-back-build-up-passing",
      "tactical-intelligence-positioning",
      "midfielder-elite-habits-open-body-shape",
      "midfielder-elite-habits-half-turn-receiving",
      "technical-ability-first-touch",
      "advanced-technical-touch-into-space",
      "tactical-intelligence-decision-making",
      "advanced-tactical-trigger-press-recognition",
      "midfield-mastery-tempo-acceleration",
      "tactical-intelligence-game-reading",
      "tactical-intelligence-zone-occupation",
      "tactical-intelligence-press-resistance",
      "advanced-tactical-press-trap-understanding",
      "advanced-tactical-weak-side-exploitation",
      "midfielder-elite-habits-passing-rhythm",
    ],
  },
  {
    lessonId: "day-022",
    title: "Vítor Pereira - Build up Pressure Trigger - Coaches’ Vision",
    skillIds: [
      "defensive-skills-pressing-intensity",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-press-trap-understanding",
      "coach-development-metrics-opposition-analysis-skill",
      "tactical-intelligence-game-reading",
      "defensive-skills-anticipation",
      "midfield-mastery-midfield-balance-awareness",
      "communication-leadership-trigger-communication",
      "advanced-physical-work-rate-engine",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-compactness-understanding",
      "defensive-skills-1v1-defending",
      "defensive-skills-second-ball-winning",
    ],
  },
  {
    lessonId: "day-023",
    title: "Sean Dyche - Trapping Opposition on One Side - Coaches’ Vision",
    skillIds: [
      "tactical-intelligence-press-resistance",
      "defensive-skills-pressing-intensity",
      "advanced-physical-high-intensity-runs",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-press-trap-understanding",
      "advanced-tactical-game-state-management",
      "coach-development-metrics-session-intensity",
      "advanced-tactical-weak-side-exploitation",
      "advanced-tactical-switch-of-play-timing",
      "advanced-tactical-width-management",
      "advanced-tactical-defensive-cover-shadow",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-compactness-understanding",
      "defensive-skills-defensive-positioning",
      "full-back-wing-back-wide-channel-defending",
      "defensive-skills-blocking",
      "tactical-intelligence-tactical-discipline",
    ],
  },
  {
    lessonId: "day-024",
    title: "Sean Dyche - Switching from one Side to the Other - Coaches’ Vision",
    skillIds: [
      "tactical-intelligence-game-reading",
      "tactical-intelligence-transition-awareness",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-zone-occupation",
      "tactical-intelligence-compactness-understanding",
      "advanced-tactical-compactness-recovery",
      "defensive-skills-pressing-intensity",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-press-trap-understanding",
      "advanced-tactical-defensive-cover-shadow",
      "advanced-tactical-switch-of-play-timing",
      "full-back-wing-back-wide-defensive-timing",
      "tactical-intelligence-marking-intelligence",
      "physical-attributes-stamina",
      "physical-attributes-endurance",
      "physical-attributes-recovery-speed",
      "advanced-physical-recovery-capacity",
      "advanced-physical-work-rate-engine",
      "physical-attributes-reaction-speed",
      "physical-attributes-change-of-direction",
      "advanced-physical-lateral-quickness",
      "mental-attributes-concentration",
      "advanced-mental-controlled-aggression",
      "defensive-skills-blocking",
      "tactical-intelligence-tactical-discipline",
    ],
  },
  {
    lessonId: "day-025",
    title: "Sean Dyche - Compact Defense on the Box - Coaches’ Vision",
    skillIds: [
      "defensive-specialist-box-defending",
      "defensive-skills-defensive-positioning",
      "defensive-skills-compact-defending",
      "defensive-specialist-cross-prevention",
      "defensive-skills-tackling",
      "tactical-intelligence-compactness-understanding",
      "advanced-tactical-compactness-recovery",
      "tactical-intelligence-marking-intelligence",
      "tactical-intelligence-covering-space",
      "communication-leadership-trigger-communication",
      "centre-back-line-control",
      "advanced-tactical-depth-management",
      "defensive-specialist-defensive-body-shape",
      "mental-attributes-work-ethic",
      "physical-attributes-stamina",
      "communication-leadership-motivation-of-teammates",
      "physical-attributes-endurance",
      "advanced-physical-recovery-capacity",
      "tactical-intelligence-counter-attack-recognition",
    ],
  },
  {
    lessonId: "day-026",
    title: "Xavi Hernández - Importance of Positioning  - Coaches’ Vision",
    skillIds: [
      "tactical-intelligence-tempo-control",
      "midfielder-elite-habits-scanning",
      "midfield-mastery-dictating-possession",
      "midfield-mastery-recycling-possession",
      "midfield-mastery-deep-build-up-composure",
      "midfield-mastery-passing-lane-manipulation",
      "tactical-intelligence-spatial-awareness",
      "tactical-intelligence-zone-occupation",
      "advanced-tactical-width-management",
      "advanced-tactical-depth-management",
      "tactical-intelligence-numerical-superiority-recognition",
      "advanced-tactical-between-line-positioning",
      "midfield-mastery-vertical-progression",
      "advanced-tactical-creating-passing-angles",
      "attacking-skills-movement-off-ball",
      "attacking-skills-combination-play",
      "attacking-skills-link-up-play",
    ],
  },
  {
    lessonId: "day-027",
    title: "Xavi Hernández - Build up Play Superiority - Coaches’ Vision",
    skillIds: [
      "goalkeeper-specific-distribution",
      "centre-back-build-up-passing",
      "centre-back-ball-carrying-from-back",
      "midfield-mastery-deep-build-up-composure",
      "midfield-mastery-dictating-possession",
      "advanced-tactical-creating-passing-angles",
      "technical-ability-long-passing",
      "technical-ability-short-passing",
      "tactical-intelligence-numerical-superiority-recognition",
      "advanced-tactical-between-line-positioning",
      "advanced-tactical-occupying-half-spaces",
      "midfielder-elite-habits-passing-rhythm",
      "midfield-mastery-vertical-progression",
      "tactical-intelligence-decision-making",
      "attacking-skills-movement-off-ball",
      "attacking-skills-combination-play",
      "attacking-skills-link-up-play",
    ],
  },
  {
    lessonId: "day-028",
    title: "Xavi Hernández - Offensive Midfield Options- Coaches’ Vision",
    skillIds: [
      "tactical-intelligence-numerical-superiority-recognition",
      "tactical-intelligence-line-breaking-vision",
      "midfield-mastery-dictating-possession",
      "advanced-tactical-creating-passing-angles",
      "advanced-tactical-between-line-positioning",
      "midfield-mastery-recycling-possession",
      "technical-ability-passing-accuracy",
      "midfielder-elite-habits-passing-rhythm",
      "midfield-mastery-passing-lane-manipulation",
      "attacking-skills-movement-off-ball",
      "tactical-intelligence-timing-of-runs",
      "advanced-tactical-double-movement-timing",
      "advanced-tactical-decoy-runs",
      "midfielder-elite-habits-receive-between-lines",
      "tactical-intelligence-decision-making",
      "advanced-tactical-width-management",
      "advanced-tactical-switch-of-play-timing",
      "attacking-skills-chance-creation",
      "attacking-specialist-final-third-decisions",
      "attacking-skills-killer-instinct",
      "midfield-mastery-vertical-progression",
    ],
  },
  {
    lessonId: "day-029",
    title: "Xavi Hernández - Pressing Build Up - Coaches’ Vision",
    skillIds: [
      "defensive-skills-pressing-intensity",
      "advanced-tactical-trigger-press-recognition",
      "advanced-tactical-press-trap-understanding",
      "coach-development-metrics-session-intensity",
      "defensive-skills-body-contact-use",
      "centre-back-body-position-in-duels",
      "tactical-intelligence-covering-space",
      "tactical-intelligence-zone-occupation",
      "tactical-intelligence-compactness-understanding",
      "defensive-skills-screening-back-line",
      "defensive-skills-tracking-runners",
      "advanced-tactical-defensive-cover-shadow",
      "defensive-specialist-delay-counter-attack",
      "defensive-skills-second-ball-winning",
      "physical-attributes-reaction-speed",
      "defensive-skills-anticipation",
      "tactical-intelligence-tactical-discipline",
      "defensive-skills-compact-defending",
      "advanced-tactical-width-management",
      "advanced-tactical-depth-management",
      "centre-back-line-control",
      "data-modern-football-metrics-ball-recoveries",
      "advanced-physical-recovery-capacity",
      "defensive-specialist-2v1-defending",
    ],
  },
];

const LESSON_BY_ID: Map<string, CoachingLessonDevelopmentDef> = new Map(
  COACHING_LESSON_DEVELOPMENTS.map((L) => [L.lessonId, L])
);

/** Nº de lições no catálogo que desenvolvem cada competência (denominador N). */
export function countRelatedLessonsPerSkill(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const skill of COACHING_SKILLS) {
    counts.set(skill.id, 0);
  }
  for (const lesson of COACHING_LESSON_DEVELOPMENTS) {
    const unique = new Set(lesson.skillIds);
    for (const sid of unique) {
      if (!counts.has(sid)) counts.set(sid, 0);
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
  }
  return counts;
}

export type SkillProgressRow = {
  skill: CoachingSkillDef;
  topic: CoachingTopicDef;
  progressPercent: number;
  relatedLessonTotal: number;
  contributingWatchedCount: number;
};

function topicById(id: string): CoachingTopicDef | undefined {
  return COACHING_TOPICS.find((t) => t.id === id);
}

/**
 * Progresso por competência a partir dos `lessonId` marcados como vistos
 * (`day-001`, … — ids de programa; a UI passa-os derivados de `completedDayKeys` + anchor).
 * Inclui todas as competências do catálogo; N=0 até existirem lições.
 */
export function computeCoachingDevelopmentRows(watchedLessonIds: readonly string[]): SkillProgressRow[] {
  const watched = new Set(watchedLessonIds);
  const relatedTotal = countRelatedLessonsPerSkill();

  const incrementSum = new Map<string, number>();
  const watchedTouchCount = new Map<string, number>();

  for (const lessonId of watched) {
    const lesson = LESSON_BY_ID.get(lessonId);
    if (!lesson) continue;
    const uniqueSkills = [...new Set(lesson.skillIds)];
    for (const skillId of uniqueSkills) {
      const n = relatedTotal.get(skillId) ?? 0;
      if (n <= 0) continue;
      incrementSum.set(skillId, (incrementSum.get(skillId) ?? 0) + 100 / n);
      watchedTouchCount.set(skillId, (watchedTouchCount.get(skillId) ?? 0) + 1);
    }
  }

  const rows: SkillProgressRow[] = [];
  for (const skill of COACHING_SKILLS) {
    const topic = topicById(skill.topicId);
    if (!topic) continue;
    const n = relatedTotal.get(skill.id) ?? 0;
    const raw = incrementSum.get(skill.id) ?? 0;
    rows.push({
      skill,
      topic,
      progressPercent: n > 0 ? Math.min(100, Math.round(raw * 10) / 10) : 0,
      relatedLessonTotal: n,
      contributingWatchedCount: watchedTouchCount.get(skill.id) ?? 0,
    });
  }

  const topicOrder = new Map(COACHING_TOPICS.map((t, i) => [t.id, i]));
  rows.sort((a, b) => {
    const oa = topicOrder.get(a.topic.id) ?? 99;
    const ob = topicOrder.get(b.topic.id) ?? 99;
    if (oa !== ob) return oa - ob;
    return (a.skill.catalogOrder ?? 0) - (b.skill.catalogOrder ?? 0);
  });

  return rows;
}

export function getLessonDevelopment(lessonId: string): CoachingLessonDevelopmentDef | undefined {
  return LESSON_BY_ID.get(lessonId);
}

/** Resolve skill id from topic + label (útil ao mapear conteúdo novo). */
export function coachingSkillId(topicId: string, label: string): string {
  return `${topicId}-${slugify(label)}`;
}
