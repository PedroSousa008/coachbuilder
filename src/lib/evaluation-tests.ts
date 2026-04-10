import type { EvaluationTestId } from "@/types";

/** Metadados dos testes (rótulos PT + unidade esperada para o treinador). */
export const EVALUATION_TESTS: readonly {
  readonly id: EvaluationTestId;
  readonly label: string;
  readonly valuePlaceholder: string;
  readonly hint: string;
}[] = [
  {
    id: "sprint20m",
    label: "Sprint 20 metros",
    valuePlaceholder: "ex.: 3,45",
    hint: "Tempo em segundos (menor = melhor).",
  },
  {
    id: "dribblingSlalom",
    label: "Dribbling Slalom",
    valuePlaceholder: "ex.: 8,2",
    hint: "Tempo total em segundos (menor = melhor).",
  },
  {
    id: "yoyoEndurance",
    label: "Yo-Yo Endurance",
    valuePlaceholder: "ex.: 17.1",
    hint: "Nível / distância conforme protocolo (maior = melhor).",
  },
  {
    id: "verticalJump",
    label: "Vertical Jump",
    valuePlaceholder: "ex.: 52",
    hint: "Altura em cm (maior = melhor).",
  },
  {
    id: "shortPassingAccuracy",
    label: "Short Passing Accuracy",
    valuePlaceholder: "ex.: 8/10",
    hint: "Acertos (podes usar fração ou %).",
  },
  {
    id: "reactionTest",
    label: "Reaction Test",
    valuePlaceholder: "ex.: 0,28",
    hint: "Tempo de reação em segundos (menor = melhor).",
  },
  {
    id: "strengthTest",
    label: "Strength Test",
    valuePlaceholder: "ex.: 5",
    hint: "Repetições ou carga (maior = melhor).",
  },
] as const;

export const EVALUATION_TEST_IDS: EvaluationTestId[] = EVALUATION_TESTS.map((t) => t.id);

/** Aceita vírgula ou ponto; extrai primeiro número; para "8/10" usa quociente×100. */
export function parseEvaluationRaw(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const frac = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(t);
  if (frac) {
    const a = parseFloat(frac[1]!);
    const b = parseFloat(frac[2]!);
    if (b > 0 && Number.isFinite(a)) return (a / b) * 100;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function clamp01to100(x: number): number {
  return Math.min(100, Math.max(0, Math.round(x)));
}

/**
 * Pontuação AI provisória (0–100) até existirem tabelas oficiais por idade.
 * Quando integrares a tabela, substitui esta função pela consulta aos intervalos.
 */
export function computeAiOverallProvisional(
  testId: EvaluationTestId,
  raw: string,
  age: number
): number | null {
  const v = parseEvaluationRaw(raw);
  if (v == null) return null;

  const ageAdj = Math.min(1.15, Math.max(0.85, 1 + (17 - age) * 0.02));

  switch (testId) {
    case "sprint20m": {
      const sec = v;
      if (sec < 2.4 || sec > 8) return null;
      const score = 100 - ((sec - 2.85) / (5.8 - 2.85)) * 85;
      return clamp01to100(score * ageAdj);
    }
    case "dribblingSlalom": {
      const sec = v;
      if (sec < 4 || sec > 25) return null;
      const score = 100 - ((sec - 6.5) / (14 - 6.5)) * 85;
      return clamp01to100(score * ageAdj);
    }
    case "yoyoEndurance": {
      const level = v;
      if (level < 5 || level > 25) return null;
      return clamp01to100(((level - 8) / 12) * 100 * ageAdj);
    }
    case "verticalJump": {
      const cm = v;
      if (cm < 15 || cm > 90) return null;
      const score = ((cm - 25) / (65 - 25)) * 100;
      return clamp01to100(score * ageAdj);
    }
    case "shortPassingAccuracy": {
      if (v <= 0 || v > 100) return null;
      return clamp01to100(v);
    }
    case "reactionTest": {
      const sec = v;
      if (sec < 0.12 || sec > 0.9) return null;
      const score = 100 - ((sec - 0.18) / (0.55 - 0.18)) * 90;
      return clamp01to100(score * ageAdj);
    }
    case "strengthTest": {
      const reps = v;
      if (reps < 0 || reps > 80) return null;
      const score = (reps / 40) * 100;
      return clamp01to100(score * ageAdj);
    }
    default:
      return null;
  }
}
