const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * URL público do vídeo da lição para o `dayKey` do calendário (`YYYY-MM-DD`).
 *
 * Ficheiros em `public/coaching-daily-videos/{dayKey}/lesson.mp4` — ver README nessa pasta.
 * Se o ficheiro ainda não existir, o fetch na UI falha graciosamente (download alternativo).
 */
export function getLessonVideoUrl(dayKey: string): string | null {
  if (!DAY_KEY_RE.test(dayKey)) return null;
  return `/coaching-daily-videos/${dayKey}/lesson.mp4`;
}
