export type CoachMonthAgeGroupId = "benjamin" | "infantil" | "iniciado" | "junior" | "juvenil";

export type CoachMonthWinner = {
  id: CoachMonthAgeGroupId;
  coachUserId?: string;
  coachName: string;
  ageGroup: string;
  clubName: string;
  clubLogoUrl?: string;
  rankLabel: string;
  photoUrl?: string;
  news: string;
};

export type CoachOfMonthContent = {
  headerTitle: string;
  headerSubtitle: string;
  winners: CoachMonthWinner[];
};

export const COACH_MONTH_IDS: CoachMonthAgeGroupId[] = ["benjamin", "infantil", "iniciado", "junior", "juvenil"];

const AGE_GROUP_LABELS: Record<CoachMonthAgeGroupId, string> = {
  benjamin: "Benjamim",
  infantil: "Infantil",
  iniciado: "Iniciado",
  junior: "Júnior",
  juvenil: "Juvenil",
};

function baseWinner(id: CoachMonthAgeGroupId): CoachMonthWinner {
  return {
    id,
    coachName: "Treinador a anunciar",
    ageGroup: AGE_GROUP_LABELS[id],
    clubName: "Clube",
    clubLogoUrl: "",
    rankLabel: "#1",
    photoUrl: "",
    news: "Desempenho exemplar ao longo do mês, com evolução clara da equipa e liderança em campo.",
  };
}

export function defaultCoachOfMonthContent(): CoachOfMonthContent {
  return {
    headerTitle: "Melhores Treinadores do Mês",
    headerSubtitle: "Reconhecer o mérito. Inspirar o futuro.",
    winners: COACH_MONTH_IDS.map((id) => baseWinner(id)),
  };
}

function text(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function maybeCoachId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function normalizeWinner(raw: unknown, id: CoachMonthAgeGroupId): CoachMonthWinner {
  const fallback = baseWinner(id);
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    id,
    coachUserId: maybeCoachId(o.coachUserId),
    coachName: text(o.coachName, fallback.coachName),
    ageGroup: text(o.ageGroup, fallback.ageGroup),
    clubName: text(o.clubName, fallback.clubName),
    clubLogoUrl: text(o.clubLogoUrl, ""),
    rankLabel: text(o.rankLabel, fallback.rankLabel),
    photoUrl: text(o.photoUrl, ""),
    news: text(o.news, fallback.news),
  };
}

export function normalizeCoachOfMonthContent(raw: unknown): CoachOfMonthContent {
  const fallback = defaultCoachOfMonthContent();
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const incoming = Array.isArray(o.winners) ? o.winners : [];
  const byId = new Map<string, unknown>();
  for (const row of incoming) {
    if (!row || typeof row !== "object") continue;
    const maybeId = (row as Record<string, unknown>).id;
    if (typeof maybeId === "string") byId.set(maybeId, row);
  }
  return {
    headerTitle: text(o.headerTitle, fallback.headerTitle),
    headerSubtitle: text(o.headerSubtitle, fallback.headerSubtitle),
    winners: COACH_MONTH_IDS.map((id) => normalizeWinner(byId.get(id), id)),
  };
}
