/** Heuristic: league table competition vs cup / knockout phases (FPF-style wording). */
export type CompetitionKind = "league" | "tournament" | "unknown";

export function inferCompetitionKind(competitionLabel: string): CompetitionKind {
  const t = competitionLabel.toLowerCase();
  if (
    /ta[çc]a|cup|eliminat[oó]ria|play-?off|3\.?\s*[ªa]\s*fase\s+jogos\s+apuramento\s+campe/i.test(t) ||
    /apuramento\s+campe[aã]o/i.test(t)
  ) {
    return "tournament";
  }
  if (/campeonato|classifica|divis[aã]o|distrital|honra|j[úu]niores|s[ée]rie\s*["']?[ab]["']?/i.test(t)) {
    return "league";
  }
  if (/fase|jornada|manuten/i.test(t)) return "league";
  return "unknown";
}
