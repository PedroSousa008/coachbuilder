/**
 * Coaching Development — catálogo de tópicos, competências e lições (vídeos).
 *
 * Como editar quando tiveres o conteúdo:
 * 1. Adiciona entradas em `COACHING_TOPICS` (áreas gerais).
 * 2. Adiciona `COACHING_SKILLS` com `topicId` que aponta para um tópico.
 * 3. Para cada vídeo/lição publicada, adiciona `COACHING_LESSON_DEVELOPMENTS`.
 *    - `lessonId` deve coincidir com o identificador usado quando o treinador marca a lição como vista.
 *      Na app isso é o **dayKey** do calendário (`YYYY-MM-DD`) no dia em que essa lição está activa.
 * 4. Em cada lição, lista `skillIds` (ids das competências que essa lição desenvolve).
 *
 * Progresso por competência: cada visualização válida soma `100 / N` pontos percentuais,
 * onde `N` = número total de lições no catálogo que referenciam essa competência.
 * Assim, 5 lições sobre "Game intelligence" → cada uma vale 20% até completar 100%.
 */

export type CoachingTopicDef = {
  id: string;
  label: string;
  /** Texto curto opcional para a UI. */
  summary?: string;
};

export type CoachingSkillDef = {
  id: string;
  topicId: string;
  label: string;
  summary?: string;
};

export type CoachingLessonDevelopmentDef = {
  /** Normalmente `YYYY-MM-DD` (dia da lição no calendário). */
  lessonId: string;
  title: string;
  /** Competências que esta lição desenvolve (cada uma recebe +100/N % quando vista). */
  skillIds: string[];
};

export const COACHING_TOPICS: CoachingTopicDef[] = [
  {
    id: "game-intelligence-midfield",
    label: "Game intelligence & midfield",
    summary: "Leitura de jogo, meio-campo e ritmo.",
  },
  {
    id: "technical-foundation",
    label: "Technical foundation",
    summary: "Base técnica reutilizável em contexto de jogo.",
  },
];

/** Competências individuais (cada linha da tabela de desenvolvimento). */
export const COACHING_SKILLS: CoachingSkillDef[] = [
  {
    id: "game-intelligence",
    topicId: "game-intelligence-midfield",
    label: "Game intelligence",
    summary: "Decisões e leitura global.",
  },
  {
    id: "midfield-understanding",
    topicId: "game-intelligence-midfield",
    label: "Midfield understanding",
    summary: "Estrutura e funções no meio.",
  },
  {
    id: "scanning-before-receiving",
    topicId: "game-intelligence-midfield",
    label: "Scanning before receiving",
    summary: "Informação antes do primeiro toque.",
  },
  {
    id: "tempo-control",
    topicId: "game-intelligence-midfield",
    label: "Tempo control",
    summary: "Acelerar e abrandar o jogo com bola.",
  },
  {
    id: "passing-angles",
    topicId: "game-intelligence-midfield",
    label: "Passing angles",
    summary: "Linhas de passe e terceiro homem.",
  },
  {
    id: "first-touch-under-pressure",
    topicId: "technical-foundation",
    label: "First touch under pressure",
    summary: "Controlo orientado com adversário próximo.",
  },
];

/**
 * Catálogo de lições → competências.
 * Substitui / acrescenta linhas quando publicares vídeos; usa `lessonId` = dayKey do dia.
 * Entradas de exemplo (lessonIds fictícios) para demonstrar o cálculo 100/N na UI.
 */
export const COACHING_LESSON_DEVELOPMENTS: CoachingLessonDevelopmentDef[] = [
  {
    lessonId: "example-lesson-midfield-1",
    title: "Example: Midfield intelligence (catalogue sample)",
    skillIds: [
      "game-intelligence",
      "midfield-understanding",
      "scanning-before-receiving",
      "tempo-control",
      "passing-angles",
    ],
  },
  {
    lessonId: "example-lesson-midfield-2",
    title: "Example: Tempo and angles (catalogue sample)",
    skillIds: ["game-intelligence", "tempo-control", "passing-angles"],
  },
  {
    lessonId: "example-lesson-midfield-3",
    title: "Example: Scanning habits (catalogue sample)",
    skillIds: ["scanning-before-receiving", "game-intelligence"],
  },
  {
    lessonId: "example-lesson-midfield-4",
    title: "Example: Midfield structure (catalogue sample)",
    skillIds: ["midfield-understanding", "passing-angles"],
  },
  {
    lessonId: "example-lesson-midfield-5",
    title: "Example: Game intelligence blocks (catalogue sample)",
    skillIds: ["game-intelligence", "midfield-understanding"],
  },
  {
    lessonId: "example-lesson-technical-1",
    title: "Example: First touch in tight spaces (catalogue sample)",
    skillIds: ["first-touch-under-pressure", "tempo-control"],
  },
  {
    lessonId: "example-lesson-midfield-6",
    title: "Example: Reading pressure as a #6 (catalogue sample)",
    skillIds: ["game-intelligence"],
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
  /** 0–100 após cap. */
  progressPercent: number;
  /** Lições do catálogo que tocam esta competência. */
  relatedLessonTotal: number;
  /** Quantas dessas lições o treinador já marcou como vistas (e existem no catálogo). */
  contributingWatchedCount: number;
};

function topicById(id: string): CoachingTopicDef | undefined {
  return COACHING_TOPICS.find((t) => t.id === id);
}

function skillById(id: string): CoachingSkillDef | undefined {
  return COACHING_SKILLS.find((s) => s.id === id);
}

/**
 * Calcula o progresso por competência a partir dos `lessonId` já marcados como vistos
 * (na app: `completedDayKeys` do challenge, cada um deve coincidir com `lessonId` no catálogo quando publicares por dia).
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
    if (n <= 0) continue;
    const raw = incrementSum.get(skill.id) ?? 0;
    rows.push({
      skill,
      topic,
      progressPercent: Math.min(100, Math.round(raw * 10) / 10),
      relatedLessonTotal: n,
      contributingWatchedCount: watchedTouchCount.get(skill.id) ?? 0,
    });
  }

  const topicOrder = new Map(COACHING_TOPICS.map((t, i) => [t.id, i]));
  rows.sort((a, b) => {
    const oa = topicOrder.get(a.topic.id) ?? 99;
    const ob = topicOrder.get(b.topic.id) ?? 99;
    if (oa !== ob) return oa - ob;
    return a.skill.label.localeCompare(b.skill.label);
  });

  return rows;
}

export function getLessonDevelopment(lessonId: string): CoachingLessonDevelopmentDef | undefined {
  return LESSON_BY_ID.get(lessonId);
}
