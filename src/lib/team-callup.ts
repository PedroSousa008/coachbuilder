import type { TeamCallupCalendarForm, TeamCallupState } from "@/types";

export function emptyTeamCallupForm(): TeamCallupCalendarForm {
  return {
    jogo: "",
    jornada: "",
    data: "",
    pontoEncontro: "",
    maps: "",
    horaEncontro: "",
    chegadaJogo: "",
  };
}

export function emptyTeamCallupState(): TeamCallupState {
  return {
    clubLogoDataUrl: undefined,
    form: emptyTeamCallupForm(),
    selectedPlayerIds: [],
    observationsByPlayerId: {},
  };
}

export function mergeTeamCallup(raw: unknown, fallback: TeamCallupState): TeamCallupState {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Partial<TeamCallupState>;
  const f = o.form && typeof o.form === "object" ? (o.form as Partial<TeamCallupCalendarForm>) : {};
  const base = fallback.form;
  const form: TeamCallupCalendarForm = {
    jogo: typeof f.jogo === "string" ? f.jogo : base.jogo,
    jornada: typeof f.jornada === "string" ? f.jornada : base.jornada,
    data: typeof f.data === "string" ? f.data : base.data,
    pontoEncontro: typeof f.pontoEncontro === "string" ? f.pontoEncontro : base.pontoEncontro,
    maps: typeof f.maps === "string" ? f.maps : base.maps,
    horaEncontro: typeof f.horaEncontro === "string" ? f.horaEncontro : base.horaEncontro,
    chegadaJogo: typeof f.chegadaJogo === "string" ? f.chegadaJogo : base.chegadaJogo,
  };
  const ids = Array.isArray(o.selectedPlayerIds)
    ? o.selectedPlayerIds.filter((id): id is string => typeof id === "string").slice(0, 18)
    : fallback.selectedPlayerIds;
  const mergedObs: Record<string, string> = { ...fallback.observationsByPlayerId };
  if (o.observationsByPlayerId && typeof o.observationsByPlayerId === "object") {
    for (const [k, v] of Object.entries(o.observationsByPlayerId)) {
      if (typeof v === "string") mergedObs[k] = v;
    }
  }
  return {
    clubLogoDataUrl: typeof o.clubLogoDataUrl === "string" && o.clubLogoDataUrl ? o.clubLogoDataUrl : undefined,
    form,
    selectedPlayerIds: ids,
    observationsByPlayerId: mergedObs,
  };
}
