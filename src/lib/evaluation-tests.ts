import type { EvaluationTestId } from "@/types";

/** URL pública (ex.: `/evaluation/sprint20m.jpg`) ou absoluta; vídeo: mp4, webm, mov. */
export function inferProtocolMediaKind(url: string): "image" | "video" {
  const path = url.split("?")[0]!.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(path)) return "video";
  return "image";
}

/** Metadados dos testes (rótulos PT + unidade esperada para o treinador). */
export const EVALUATION_TESTS: readonly {
  readonly id: EvaluationTestId;
  readonly label: string;
  readonly valuePlaceholder: string;
  readonly hint: string;
  /** Como executar o teste para resultados comparáveis e precisos (mostrado ao treinador). */
  readonly protocolNote: string;
  /** Imagem ou vídeo de demonstração (opcional). Coloca ficheiros em `public/evaluation/` e usa `/evaluation/nome.ext`. */
  readonly protocolMediaUrl?: string;
  /** Se não definires, infere-se pela extensão do URL. */
  readonly protocolMediaKind?: "image" | "video";
}[] = [
  {
    id: "sprint20m",
    label: "Sprint 20 metros",
    valuePlaceholder: "ex.: 3,45",
    hint: "Tempo em segundos (menor = melhor).",
    protocolNote:
      "Usa sempre a mesma distância (20 m) e superfície plana e seca. Partida de pé, sem passo de arranque antes da linha; cronómetro manual ou laser na altura do tronco, parado na linha de chegada. Faz 2 tentativas com recuperação completa e regista o melhor tempo. Evita vento forte ou piso irregular — isso distorce a comparação com a tabela.",
  },
  {
    id: "dribblingSlalom",
    label: "Dribbling Slalom",
    valuePlaceholder: "ex.: 8,2",
    hint: "Tempo total em segundos (menor = melhor).",
    protocolNote:
      "Coloca os cones à distância e alinhamento que a equipa usa sempre (anota essa configuração). O tempo começa no 1.º toque na bola e termina ao passar a última linha/cone, sem cortar nem desviar o percurso. Mantém a bola próxima dos pés; regista o melhor de 2 tentativas após aquecimento semelhante.",
  },
  {
    id: "yoyoEndurance",
    label: "Yo-Yo Endurance",
    valuePlaceholder: "ex.: 17.1",
    hint: "Nível / distância conforme protocolo (maior = melhor).",
    protocolNote:
      "Segue o protocolo oficial (IR ou Endurance) com marcas no chão e sinal sonoro fiável. O jogador deve atingir a linha a tempo em cada repetição; regista o nível final ou a distância total conforme o teste que usas — sempre o mesmo protocolo entre avaliações para comparar evolução.",
  },
  {
    id: "verticalJump",
    label: "Vertical Jump",
    valuePlaceholder: "ex.: 52",
    hint: "Altura em cm (maior = melhor).",
    protocolNote:
      "Parede lisa com escala ou sensor; salto a partir de pé parado (sem passo de corrida), braços livres ou protocolo fixo que repitas sempre. Faz várias tentativas (ex.: 3) e regista a melhor ou a média — desde que sejas consistente entre jogadores e datas.",
  },
  {
    id: "shortPassingAccuracy",
    label: "Short Passing Accuracy",
    valuePlaceholder: "ex.: 8/10",
    hint: "Acertos (podes usar fração ou %).",
    protocolNote:
      "Define distância fixa até ao alvo (ex.: gaiola ou cone), número de passes (ex.: 10) e superfície. Conta só passes que cumprem o critério (ex.: parar dentro da zona); regista acertos/total ou % — o importante é o mesmo critério para todos.",
  },
  {
    id: "reactionTest",
    label: "Reaction Test",
    valuePlaceholder: "ex.: 0,28",
    hint: "Tempo de reação em segundos (menor = melhor).",
    protocolNote:
      "Estímulo visual ou sonoro aleatório; o jogador reage com um toque ou botão sem “saltar a vez”. Descarta tentativas em que antecipou o sinal; faz várias repetições e regista a média ou a mediana conforme o teu protocolo, sempre igual entre avaliações.",
  },
  {
    id: "strengthTest",
    label: "Strength Test",
    valuePlaceholder: "ex.: 5",
    hint: "Repetições ou carga (maior = melhor).",
    protocolNote:
      "Escolhe um exercício claro (ex.: prancha, agachamento, supino) e regista o mesmo tipo de métrica: repetições máximas com técnica correta, ou carga a X reps. Amplitude e cadência devem ser as mesmas entre avaliações; não compares resultados de exercícios diferentes.",
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

/** Tempos de referência (segundos) por idade — Aceleração + Sprint 20 m (tabela fornecida). Menor tempo = melhor. */
export type SprintNormRow = { p10: number; p25: number; p50: number; p75: number; p90: number };

export const SPRINT_20M_BY_AGE: Record<number, SprintNormRow> = {
  8: { p10: 4.15, p25: 4.29, p50: 4.41, p75: 4.51, p90: 5.02 },
  9: { p10: 4.01, p25: 4.15, p50: 4.28, p75: 4.44, p90: 4.88 },
  10: { p10: 3.87, p25: 4.01, p50: 4.15, p75: 4.36, p90: 4.73 },
  11: { p10: 3.53, p25: 3.71, p50: 4.12, p75: 4.55, p90: 4.69 },
  12: { p10: 3.59, p25: 3.73, p50: 3.89, p75: 4.21, p90: 4.44 },
  13: { p10: 3.44, p25: 3.61, p50: 3.82, p75: 4.07, p90: 4.27 },
  14: { p10: 3.2, p25: 3.34, p50: 3.5, p75: 3.71, p90: 3.93 },
  15: { p10: 3.19, p25: 3.3, p50: 3.45, p75: 3.76, p90: 3.93 },
  16: { p10: 3.05, p25: 3.15, p50: 3.34, p75: 3.64, p90: 3.76 },
  17: { p10: 3.02, p25: 3.09, p50: 3.16, p75: 3.3, p90: 3.44 },
  18: { p10: 3.01, p25: 3.05, p50: 3.22, p75: 3.41, p90: 3.58 },
  19: { p10: 2.95, p25: 2.99, p50: 3.09, p75: 3.35, p90: 3.56 },
  20: { p10: 2.97, p25: 3.03, p50: 3.11, p75: 3.31, p90: 3.5 },
  21: { p10: 2.99, p25: 3.06, p50: 3.2, p75: 3.32, p90: 3.44 },
  22: { p10: 2.98, p25: 3.04, p50: 3.17, p75: 3.3, p90: 3.42 },
  23: { p10: 2.97, p25: 3.03, p50: 3.15, p75: 3.29, p90: 3.41 },
};

/**
 * Escala 0–100 (interpolação linear no tempo; menor tempo = melhor):
 * abaixo de P10 → 100 | P10–P25: 95→90 | P25–P50: 90→75 | P50–P75: 75→40 | P75–P90: 40→10 | acima de P90: 10→0
 */
function sprintScoreAboveP90(t: number, p75: number, p90: number): number {
  const span = Math.max(p90 - p75, 0.05);
  const tEnd = p90 + span;
  if (t >= tEnd) return 0;
  return lerpScore(t, p90, tEnd, 10, 0);
}

function clampAgeToSprintRow(age: number): number {
  const a = Math.round(age);
  return Math.min(23, Math.max(8, a));
}

function lerpScore(t: number, t0: number, t1: number, s0: number, s1: number): number {
  if (t1 === t0) return Math.round((s0 + s1) / 2);
  const u = (t - t0) / (t1 - t0);
  return s0 + u * (s1 - s0);
}

/**
 * Sprint 20 m: tempo em segundos + idade → overall 0–100 (tabela P10–P90 por idade).
 * Tempos mais baixos = melhor. Ver comentário acima para a escala por segmentos.
 */
export function computeSprint20mScore(timeSec: number, age: number): number | null {
  if (!Number.isFinite(timeSec) || timeSec <= 0) return null;
  const rowAge = clampAgeToSprintRow(age);
  const row = SPRINT_20M_BY_AGE[rowAge];
  if (!row) return null;
  const { p10, p25, p50, p75, p90 } = row;

  if (timeSec < p10) return 100;
  if (timeSec <= p25) return Math.round(lerpScore(timeSec, p10, p25, 95, 90));
  if (timeSec <= p50) return Math.round(lerpScore(timeSec, p25, p50, 90, 75));
  if (timeSec <= p75) return Math.round(lerpScore(timeSec, p50, p75, 75, 40));
  if (timeSec <= p90) return Math.round(lerpScore(timeSec, p75, p90, 40, 10));
  return Math.round(sprintScoreAboveP90(timeSec, p75, p90));
}

/**
 * Pontuação AI (0–100): Sprint 20 m usa tabela oficial; outros testes mantêm heurística até haver tabelas.
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
      const score = computeSprint20mScore(v, age);
      return score == null ? null : clamp01to100(score);
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
