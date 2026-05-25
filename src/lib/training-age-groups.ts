export const TRAINING_AGE_GROUPS = [
  "benjamin",
  "infantil",
  "iniciado",
  "junior",
  "juvenil",
  "senior",
] as const;

export type TrainingAgeGroupId = (typeof TRAINING_AGE_GROUPS)[number];

export const TRAINING_AGE_GROUP_LABELS: Record<TrainingAgeGroupId, string> = {
  benjamin: "Benjamin",
  infantil: "Infantil",
  iniciado: "Iniciado",
  junior: "Júnior",
  juvenil: "Juvenil",
  senior: "Seniores",
};

export type TrainingExerciseAgeMap = Record<string, TrainingAgeGroupId[]>;

export const DEFAULT_TRAINING_EXERCISE_AGE_MAP: TrainingExerciseAgeMap = {
  "Warm Up with Ball": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Passing Activation": ["iniciado", "juvenil", "junior", "senior"],
  "Dual Passing": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Aquecimento com Bola - Movimentação": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Variação de Posse de Bola com base na Pressão": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
  "Combinações e Passe de Rotura": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
  "Combinações sob Pressão": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
  "Back Four Shifting": ["iniciado", "juvenil", "junior", "senior"],
  "Compact Defending Transition": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Defensive Recovery on Counter Attack": ["iniciado", "juvenil", "junior", "senior"],
  "Offensive Between Lines": ["iniciado", "juvenil", "junior", "senior"],
  "Between the Lines": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "9v9 + 2 Game": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Double Finishing Drill": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Finishing Transition": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Cross and Strike": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Movimentação dentro de Área em Cruzamentos": [
    "benjamin",
    "infantil",
    "iniciado",
    "juvenil",
    "junior",
    "senior",
  ],
  "Variação de Cruzamentos": [
    "benjamin",
    "infantil",
    "iniciado",
    "juvenil",
    "junior",
    "senior",
  ],
  "Variações para Cruzamento": [
    "benjamin",
    "iniciado",
    "infantil",
    "junior",
    "juvenil",
    "senior",
  ],
  "3 Cenários 5v5": [
    "benjamin",
    "iniciado",
    "infantil",
    "junior",
    "juvenil",
    "senior",
  ],
  "4v4 mais apoios laterais": [
    "benjamin",
    "infantil",
    "iniciado",
    "juvenil",
    "junior",
    "senior",
  ],
  "Superioridade nos Setores": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "4 Finishing Drills": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Rondo 9v3": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Rondo 5v3": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Breakout Rondo": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "(2+1)v1 Transition": ["iniciado", "juvenil", "junior", "senior"],
  "Short Corner Routine": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Short Corner by Newcastle": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Short Corner by Empoli": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Free Kick Routine": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Short Free Kick - Winger Movement": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Build up into Counter Attack": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "Fitness Rondo into Finishing": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Rondo to Counter Attack": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Goal Kick 1": ["iniciado", "juvenil", "junior", "senior"],
  "Goal Kick 2": ["iniciado", "juvenil", "junior", "senior"],
  "Midfielder Run Behind Defense": ["iniciado", "juvenil", "junior", "senior"],
  "Full Back Overlap - Winger": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "Full Back Overlap - Striker": ["infantil", "iniciado", "juvenil", "junior", "senior"],
  "3v2 Fast Break": ["iniciado", "juvenil", "junior", "senior"],
  "3v2 Finishing Drill": ["benjamin", "infantil", "iniciado", "juvenil", "junior", "senior"],
  "5 Teams 3v3 Attacking": ["juvenil", "junior", "senior"],
  "Fixed Position Rondo": ["iniciado", "juvenil", "junior", "senior"],
  "Pressing Exercise": ["iniciado", "juvenil", "junior", "senior"],
  "1v1 Situations": ["benjamin", "iniciado"],
  "Passe e Movimentação": ["benjamin", "iniciado"],
  "Reação e Finalização": ["benjamin", "iniciado", "infantil", "junior"],
  "Drible Rápido e Passe": ["benjamin", "iniciado"],
  "Posse de Bola com Transição": ["benjamin", "iniciado", "infantil", "junior", "juvenil"],
  "Sair a Jogar da Defesa com Pressão": ["iniciado", "infantil", "junior", "juvenil", "senior"],
  "Jogo do Galo": ["benjamin", "iniciado", "infantil", "junior"],
  "Circuito de Construção para Quebrar Linhas": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
  "Saída de Jogo com Finalização Rápida": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
  "Rondo com Variação do Jogo": [
    "benjamin",
    "infantil",
    "iniciado",
    "junior",
    "juvenil",
    "senior",
  ],
};

export function isTrainingAgeGroupId(value: unknown): value is TrainingAgeGroupId {
  return typeof value === "string" && TRAINING_AGE_GROUPS.includes(value as TrainingAgeGroupId);
}

export function normalizeTrainingAgeGroups(values: unknown): TrainingAgeGroupId[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<TrainingAgeGroupId>();
  for (const v of values) {
    if (isTrainingAgeGroupId(v)) seen.add(v);
  }
  return TRAINING_AGE_GROUPS.filter((id) => seen.has(id));
}

export function normalizeTrainingExerciseAgeMap(raw: unknown): TrainingExerciseAgeMap | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: TrainingExerciseAgeMap = {};
  const obj = raw as Record<string, unknown>;
  for (const [title, value] of Object.entries(obj)) {
    if (!title.trim()) continue;
    const groups = normalizeTrainingAgeGroups(value);
    if (groups.length > 0) out[title] = groups;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Junta defaults do catálogo com overrides guardados no perfil do treinador. */
export function mergeTrainingExerciseAgeMap(
  userMap: TrainingExerciseAgeMap | undefined
): TrainingExerciseAgeMap {
  const merged: TrainingExerciseAgeMap = { ...DEFAULT_TRAINING_EXERCISE_AGE_MAP };
  if (userMap) {
    for (const [title, groups] of Object.entries(userMap)) {
      const normalized = normalizeTrainingAgeGroups(groups);
      if (normalized.length > 0) merged[title] = normalized;
    }
  }
  return merged;
}

/** Garante que cada título do catálogo built-in tem pelo menos o escalão por defeito (todos). */
export function ensureExerciseAgeDefaults(titles: readonly string[]): void {
  for (const title of titles) {
    const key = title.trim();
    if (!key) continue;
    const existing = DEFAULT_TRAINING_EXERCISE_AGE_MAP[key];
    if (existing && existing.length > 0) continue;
    DEFAULT_TRAINING_EXERCISE_AGE_MAP[key] = [...TRAINING_AGE_GROUPS];
  }
}

export function resolveExerciseAgeGroupsForTitle(
  title: string,
  map: TrainingExerciseAgeMap | null | undefined
): TrainingAgeGroupId[] {
  const effective = map ?? DEFAULT_TRAINING_EXERCISE_AGE_MAP;
  const mapped = effective[title] ?? DEFAULT_TRAINING_EXERCISE_AGE_MAP[title];
  if (mapped && mapped.length > 0) return normalizeTrainingAgeGroups(mapped);
  return [...TRAINING_AGE_GROUPS];
}
