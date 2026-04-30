import {
  COACHING_PROGRAM_DAY_COUNT,
  dayKeyToProgramDay,
  programLessonCatalogId,
} from "./coaching-program-day";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Overrides por dia do programa para vídeos alojados fora do repositório.
 * Exemplo: `NEXT_PUBLIC_COACHING_DAY_039_VIDEO_URL=https://.../lesson.mp4`
 */
const LESSON_VIDEO_URL_OVERRIDES: Record<string, string | undefined> = {
  "day-039": process.env.NEXT_PUBLIC_COACHING_DAY_039_VIDEO_URL,
  "day-040": process.env.NEXT_PUBLIC_COACHING_DAY_040_VIDEO_URL,
};

/**
 * URL público do vídeo para o dia de calendário seleccionado (`dayKey` = `YYYY-MM-DD`).
 *
 * O conteúdo é o **dia do programa** desde a criação da conta (dia 1 = dia de anchor), não a data absoluta:
 * o mesmo ficheiro `day-001/lesson.mp4` é o “vídeo 1” para todos; só a data em que aparece no calendário muda.
 *
 * Ficheiros: `public/coaching-daily-videos/day-001/lesson.mp4` … `day-365/` — ver README.
 */
export function getLessonVideoUrl(dayKey: string, anchor: Date | null): string | null {
  if (!anchor || !DAY_KEY_RE.test(dayKey)) return null;
  const n = dayKeyToProgramDay(dayKey, anchor);
  if (n == null || n > COACHING_PROGRAM_DAY_COUNT) return null;
  const lessonId = programLessonCatalogId(n);
  const externalUrl = LESSON_VIDEO_URL_OVERRIDES[lessonId]?.trim();
  if (externalUrl) return externalUrl;
  return `/coaching-daily-videos/${lessonId}/lesson.mp4`;
}
