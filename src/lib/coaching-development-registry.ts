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
