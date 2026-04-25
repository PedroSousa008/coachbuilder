export const TRAINING_AGE_GROUPS = [
  "benjamin",
  "infantil",
  "iniciado",
  "junior",
  "juvenil",
] as const;

export type TrainingAgeGroupId = (typeof TRAINING_AGE_GROUPS)[number];

export const TRAINING_AGE_GROUP_LABELS: Record<TrainingAgeGroupId, string> = {
  benjamin: "Benjamin",
  infantil: "Infantil",
  iniciado: "Iniciado",
  junior: "Júnior",
  juvenil: "Juvenil",
};

export type TrainingExerciseAgeMap = Record<string, TrainingAgeGroupId[]>;

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

export function resolveExerciseAgeGroupsForTitle(
  title: string,
  map: TrainingExerciseAgeMap | null | undefined
): TrainingAgeGroupId[] {
  const mapped = map?.[title];
  if (mapped && mapped.length > 0) return normalizeTrainingAgeGroups(mapped);
  return [...TRAINING_AGE_GROUPS];
}
