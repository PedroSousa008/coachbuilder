/** Estrutura dos planos de treino (gerador local ou futura API). */

export type AiTrainingPhase = "warmup" | "main" | "cooldown";

export type AiTrainingBlock = {
  title: string;
  durationMin: number;
  phase: AiTrainingPhase;
  description: string;
  coachingPoints: string;
  /** Organização de espaço / materiais. */
  setup?: string;
  /** Quando parte do grupo tem foco diferente (ex.: defesas trabalham saída, avançados finalização). */
  groupSplit?: string;
  /** Sugestão de diagrama simples (linhas/texto) — não é imagem gerada. */
  diagramHint?: string;
  /** URL pública (ex. `/videos/.../ficheiro.mp4`) ou link YouTube. */
  videoUrl?: string;
  /**
   * Imagem para PDF — só exercícios do quadro tático (Sketch Area).
   * Catálogo built-in: usar sempre PNG em `public/images/training-exercises/` por título.
   */
  printImageSrc?: string;
  /** ID do exercício guardado (`coach-sketch:…`) — resolve imagem de impressão em IDB. */
  coachSketchExerciseId?: string;
};

export type AiFullTrainingSession = {
  sessionTitle: string;
  summary: string;
  blocks: AiTrainingBlock[];
  closingNotes: string;
};

export type AiSingleDrill = {
  title: string;
  durationMin: number;
  objective: string;
  description: string;
  progression?: string;
  coachingCues?: string;
  variations?: string;
  diagramHint?: string;
  videoUrl?: string;
};

export function isAiFullSession(x: unknown): x is AiFullTrainingSession {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.sessionTitle !== "string" || typeof o.summary !== "string") return false;
  if (!Array.isArray(o.blocks)) return false;
  for (const b of o.blocks) {
    if (!b || typeof b !== "object") return false;
    const B = b as Record<string, unknown>;
    if (typeof B.title !== "string" || typeof B.durationMin !== "number") return false;
    if (typeof B.description !== "string" || typeof B.coachingPoints !== "string") return false;
    const ph = B.phase;
    if (ph !== "warmup" && ph !== "main" && ph !== "cooldown") return false;
    if (B.videoUrl !== undefined && typeof B.videoUrl !== "string") return false;
  }
  if (typeof o.closingNotes !== "string") return false;
  return true;
}

export function isAiSingleDrill(x: unknown): x is AiSingleDrill {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.videoUrl !== undefined && typeof o.videoUrl !== "string") return false;
  return (
    typeof o.title === "string" &&
    typeof o.durationMin === "number" &&
    typeof o.objective === "string" &&
    typeof o.description === "string"
  );
}
