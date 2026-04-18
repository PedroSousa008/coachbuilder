import {
  COACHING_PROGRAM_DAY_COUNT,
  dayKeyToProgramDay,
  programLessonCatalogId,
} from "./coaching-program-day";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  return `/coaching-daily-videos/${programLessonCatalogId(n)}/lesson.mp4`;
}
