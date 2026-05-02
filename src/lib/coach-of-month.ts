export type CoachMonthAgeGroupId = "benjamin" | "infantil" | "iniciado" | "junior" | "juvenil";

export type CoachMonthWinner = {
  id: CoachMonthAgeGroupId;
  coachUserId?: string;
  coachName: string;
  /** Identificador curto na app (conta); editável ou preenchido a partir do utilizador ligado. */
  nametag: string;
  ageGroup: string;
  clubName: string;
  clubLogoUrl?: string;
  rankLabel: string;
  photoUrl?: string;
  news: string;
};

/** Uma linha do histórico de vencedores (por mês e escalão). */
export type CoachOfMonthArchiveRow = {
  monthLabel: string;
  benjamin: string;
  infantil: string;
  iniciado: string;
  junior: string;
  juvenil: string;
};

export type CoachOfMonthContent = {
  headerTitle: string;
  headerSubtitle: string;
  /** Mês editorial do prémio (1–12), usado no palmarés. */
  awardMonth: number;
  /** Ano do prémio (ex.: 2026). */
  awardYear: number;
  winners: CoachMonthWinner[];
  /** Linhas editáveis pelo owner: vencedores por mês (colunas = escalões). */
  winnersArchive: CoachOfMonthArchiveRow[];
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
    nametag: "",
    ageGroup: AGE_GROUP_LABELS[id],
    clubName: "Clube",
    clubLogoUrl: "",
    rankLabel: "#1",
    photoUrl: "",
    news: "Desempenho exemplar ao longo do mês, com evolução clara da equipa e liderança em campo.",
  };
}

export function coachArchiveEmptyRow(): CoachOfMonthArchiveRow {
  return {
    monthLabel: "",
    benjamin: "",
    infantil: "",
    iniciado: "",
    junior: "",
    juvenil: "",
  };
}

/** Cabeçalhos da tabela “Histórico de vencedores” (UI + dados). */
export const COACH_MONTH_ARCHIVE_TABLE_HEADERS: { key: keyof CoachOfMonthArchiveRow; label: string }[] = [
  { key: "monthLabel", label: "Mês" },
  { key: "benjamin", label: "Benjamin" },
  { key: "infantil", label: "Infantil" },
  { key: "iniciado", label: "Iniciado" },
  { key: "junior", label: "Junior" },
  { key: "juvenil", label: "Juvenil" },
];

export function defaultCoachOfMonthContent(): CoachOfMonthContent {
  const d = new Date();
  return {
    headerTitle: "Melhores Treinadores do Mês",
    headerSubtitle: "Reconhecer o mérito. Inspirar o futuro.",
    awardMonth: d.getMonth() + 1,
    awardYear: d.getFullYear(),
    winners: COACH_MONTH_IDS.map((id) => baseWinner(id)),
    winnersArchive: [coachArchiveEmptyRow()],
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
    nametag: text(o.nametag, ""),
    ageGroup: text(o.ageGroup, fallback.ageGroup),
    clubName: text(o.clubName, fallback.clubName),
    clubLogoUrl: text(o.clubLogoUrl, ""),
    rankLabel: text(o.rankLabel, fallback.rankLabel),
    photoUrl: text(o.photoUrl, ""),
    news: text(o.news, fallback.news),
  };
}

function parseAwardMonth(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return fallback;
  return n;
}

function parseAwardYear(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return fallback;
  return n;
}

function normalizeArchiveRow(raw: unknown): CoachOfMonthArchiveRow {
  const empty = coachArchiveEmptyRow();
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  return {
    monthLabel: text(r.monthLabel, ""),
    benjamin: text(r.benjamin, ""),
    infantil: text(r.infantil, ""),
    iniciado: text(r.iniciado, ""),
    junior: text(r.junior, ""),
    juvenil: text(r.juvenil, ""),
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
  let winnersArchive: CoachOfMonthArchiveRow[] = [];
  if (Array.isArray(o.winnersArchive)) {
    winnersArchive = o.winnersArchive.map(normalizeArchiveRow).slice(0, 240);
  }
  if (winnersArchive.length === 0) winnersArchive = [coachArchiveEmptyRow()];
  return {
    headerTitle: text(o.headerTitle, fallback.headerTitle),
    headerSubtitle: text(o.headerSubtitle, fallback.headerSubtitle),
    awardMonth: parseAwardMonth(o.awardMonth, fallback.awardMonth),
    awardYear: parseAwardYear(o.awardYear, fallback.awardYear),
    winners: COACH_MONTH_IDS.map((id) => normalizeWinner(byId.get(id), id)),
    winnersArchive,
  };
}
