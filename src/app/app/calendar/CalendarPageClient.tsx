"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, RefreshCw, Table2, Trash2, Pencil } from "lucide-react";
import type { LeagueImportedMatch, MatchFixture } from "@/types";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FixtureFormModal } from "@/components/calendar/FixtureFormModal";
import { formatKickoff } from "@/lib/format";
import { collectUniqueTeamNames, pickBestTeamMatch, userClubMatchesOfficialTeam } from "@/lib/team-match";
import { inferCompetitionKind, type CompetitionKind } from "@/lib/competition-kind";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { isImportedMatchUpcoming, isKickoffInFuture } from "@/lib/lisbon-date";

function formatKickoffShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthDayKey(isoDate: string): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function outcomeForMyTeam(
  m: LeagueImportedMatch,
  profileClub: string,
  label: string,
  candidates: string[]
): { opponent: string; short: string; outcome: "W" | "D" | "L" } | null {
  if (m.homeScore === undefined || m.awayScore === undefined) return null;
  const homeHit =
    userClubMatchesOfficialTeam(label, m.homeTeam, candidates) ||
    (!!profileClub && userClubMatchesOfficialTeam(profileClub, m.homeTeam, candidates));
  const awayHit =
    userClubMatchesOfficialTeam(label, m.awayTeam, candidates) ||
    (!!profileClub && userClubMatchesOfficialTeam(profileClub, m.awayTeam, candidates));
  if (!homeHit && !awayHit) return null;
  const gf = homeHit ? m.homeScore : m.awayScore;
  const ga = homeHit ? m.awayScore : m.homeScore;
  const opp = homeHit ? m.awayTeam : m.homeTeam;
  let outcome: "W" | "D" | "L";
  if (gf > ga) outcome = "W";
  else if (gf < ga) outcome = "L";
  else outcome = "D";
  const short = `${outcome} ${gf}–${ga} vs ${opp}`;
  return { opponent: opp, short, outcome };
}

type NextRow =
  | { kind: "manual"; fixture: MatchFixture }
  | { kind: "imported"; match: LeagueImportedMatch; scheduleKind: CompetitionKind };

type PrevRow =
  | { kind: "manual"; fixture: MatchFixture }
  | {
      kind: "imported";
      match: LeagueImportedMatch;
      outcome: "W" | "D" | "L";
      line: string;
    }
  | { kind: "imported-neutral"; match: LeagueImportedMatch; line: string };

function neutralResultLine(m: LeagueImportedMatch): string {
  if (m.homeScore != null && m.awayScore != null) {
    return `${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam}`;
  }
  return `${m.homeTeam} vs ${m.awayTeam}`;
}

/** Canonical table name first; fall back to profile spelling so we never miss the club. */
function myTeamPlaysMatch(
  m: LeagueImportedMatch,
  profileClub: string,
  label: string,
  candidates: string[]
): boolean {
  const primary =
    userClubMatchesOfficialTeam(label, m.homeTeam, candidates) ||
    userClubMatchesOfficialTeam(label, m.awayTeam, candidates);
  if (primary) return true;
  if (profileClub && label !== profileClub) {
    return (
      userClubMatchesOfficialTeam(profileClub, m.homeTeam, candidates) ||
      userClubMatchesOfficialTeam(profileClub, m.awayTeam, candidates)
    );
  }
  return false;
}

export function CalendarPageClient() {
  const {
    fixtures,
    addFixture,
    updateFixture,
    removeFixture,
    leagueTableUrl,
    setLeagueTableUrl,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
    leagueTableLastFetched,
    leagueTableFetchError,
    refreshLeagueTable,
    coachProfile,
    players,
    staff,
    hydrated,
  } = useAppData();

  const [fixtureModalOpen, setFixtureModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFixture | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [nextSectionOpen, setNextSectionOpen] = useState(true);
  const [previousSectionOpen, setPreviousSectionOpen] = useState(true);
  const nowMs = useScheduleNow();

  useEffect(() => {
    setUrlDraft(leagueTableUrl);
  }, [leagueTableUrl]);

  useEffect(() => {
    if (!hydrated || !leagueTableUrl.trim()) return;
    void refreshLeagueTable();
  }, [hydrated, leagueTableUrl, refreshLeagueTable, coachProfile.club]);

  useEffect(() => {
    if (!leagueTableUrl.trim()) return;
    const id = setInterval(() => {
      void refreshLeagueTable();
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [leagueTableUrl, refreshLeagueTable]);

  const candidates = useMemo(
    () => collectUniqueTeamNames({ tableRows: leagueTableRows, matches: leagueMatches }),
    [leagueTableRows, leagueMatches]
  );

  const club = coachProfile.club.trim();

  const resolvedClub = useMemo(() => {
    if (!club || candidates.length === 0) return null;
    return pickBestTeamMatch(club, candidates);
  }, [club, candidates]);

  /** Official name from the league import (classificação + jogos), not only the Profile spelling. */
  const teamLabel = (resolvedClub?.name ?? club).trim();

  const pageScheduleKind = useMemo(
    () => inferCompetitionKind(leagueCompetitionName ?? ""),
    [leagueCompetitionName]
  );

  /**
   * Importados FPF: **marcador** = jogo já disputado (Previous). Sem marcador: futuro → Next; passado → Previous.
   * Jogos manuais: só pela data/hora.
   */
  const { nextGameRows, previousGameRows } = useMemo(() => {
    const next: NextRow[] = [];
    const prev: PrevRow[] = [];
    const sk = pageScheduleKind;

    if (club) {
      for (const m of leagueMatches) {
        if (!myTeamPlaysMatch(m, club, teamLabel, candidates)) continue;

        if (isImportedMatchUpcoming(m, nowMs)) {
          next.push({ kind: "imported", match: m, scheduleKind: sk });
          continue;
        }
        const o = outcomeForMyTeam(m, club, teamLabel, candidates);
        if (o) {
          prev.push({ kind: "imported", match: m, outcome: o.outcome, line: o.short });
        } else {
          const homeHit =
            userClubMatchesOfficialTeam(teamLabel, m.homeTeam, candidates) ||
            (!!club && userClubMatchesOfficialTeam(club, m.homeTeam, candidates));
          const opp = homeHit ? m.awayTeam : m.homeTeam;
          prev.push({
            kind: "imported-neutral",
            match: m,
            line: `vs ${opp} · ${neutralResultLine(m)}`,
          });
        }
      }
    } else {
      for (const m of leagueMatches) {
        if (isImportedMatchUpcoming(m, nowMs)) {
          next.push({ kind: "imported", match: m, scheduleKind: sk });
        } else {
          prev.push({ kind: "imported-neutral", match: m, line: neutralResultLine(m) });
        }
      }
    }

    for (const f of fixtures) {
      if (isKickoffInFuture(f.kickoff, nowMs)) next.push({ kind: "manual", fixture: f });
      else prev.push({ kind: "manual", fixture: f });
    }

    next.sort((a, b) => {
      const ra = a.kind === "imported" ? (a.match.fpfRound ?? 9999) : 99999;
      const rb = b.kind === "imported" ? (b.match.fpfRound ?? 9999) : 99999;
      const ta = a.kind === "manual" ? new Date(a.fixture.kickoff).getTime() : new Date(a.match.kickoff).getTime();
      const tb = b.kind === "manual" ? new Date(b.fixture.kickoff).getTime() : new Date(b.match.kickoff).getTime();
      if (ra !== rb) return ra - rb;
      return ta - tb;
    });
    prev.sort((a, b) => {
      const ra =
        a.kind === "manual"
          ? -1
          : a.kind === "imported" || a.kind === "imported-neutral"
            ? (a.match.fpfRound ?? -1)
            : -1;
      const rb =
        b.kind === "manual"
          ? -1
          : b.kind === "imported" || b.kind === "imported-neutral"
            ? (b.match.fpfRound ?? -1)
            : -1;
      const ta = a.kind === "manual" ? new Date(a.fixture.kickoff).getTime() : new Date(a.match.kickoff).getTime();
      const tb = b.kind === "manual" ? new Date(b.fixture.kickoff).getTime() : new Date(b.match.kickoff).getTime();
      if (ra !== rb) return rb - ra;
      return tb - ta;
    });

    return { nextGameRows: next, previousGameRows: prev };
  }, [leagueMatches, fixtures, club, teamLabel, candidates, pageScheduleKind, nowMs]);

  const showFullStats = leagueTableRows.some((r) => r.played != null);

  const birthdayRows = useMemo(() => {
    const now = new Date(nowMs);
    const today = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const list: { id: string; label: string; subtitle: string; isToday: boolean }[] = [];
    const coachBirth = monthDayKey(coachProfile.dateOfBirth ?? "");
    if (coachBirth) {
      list.push({
        id: "coach",
        label: coachProfile.name.trim() || "Treinador",
        subtitle: "Treinador",
        isToday: coachBirth === today,
      });
    }
    for (const p of players) {
      const key = monthDayKey(p.dateOfBirth ?? "");
      if (!key) continue;
      list.push({
        id: `player-${p.id}`,
        label: p.name,
        subtitle: `Jogador · #${p.number}`,
        isToday: key === today,
      });
    }
    for (const s of staff) {
      const key = monthDayKey(s.dateOfBirth ?? "");
      if (!key) continue;
      list.push({
        id: `staff-${s.id}`,
        label: s.name,
        subtitle: `Staff · ${s.role}`,
        isToday: key === today,
      });
    }
    return list;
  }, [coachProfile.dateOfBirth, coachProfile.name, nowMs, players, staff]);

  const birthdaysToday = birthdayRows.filter((x) => x.isToday);

  const saveUrl = () => {
    setLeagueTableUrl(urlDraft.trim());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLeagueTable();
    } finally {
      setRefreshing(false);
    }
  };

  const badgeForScheduleKind = (k: CompetitionKind) => {
    if (k === "league") return { label: "League table", variant: "default" as const };
    if (k === "tournament") return { label: "Cup / knockout", variant: "accent" as const };
    return { label: "Schedule", variant: "muted" as const };
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Calendar & matchweek</h2>
        <p className="mt-1 text-sm text-zinc-500">
          <span className="font-semibold text-zinc-300">Next:</span> jogos{" "}
          <span className="text-zinc-400">sem resultado na FPF</span> e com horário ainda no futuro (ou data em falta).
          <span className="font-semibold text-zinc-300"> Previous:</span> jogos já com marcador, ou já disputados no
          calendário (hora passada) sem marcador. Refresh na tabela para sincronizar.
        </p>
        {resolvedClub && (
          <p className="mt-2 text-xs text-accent">
            Resolved club: <span className="font-medium text-white">{resolvedClub.name}</span> (from your spelling)
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aniversários automáticos</CardTitle>
          <CardDescription>
            Quando a data coincide, o calendário assinala automaticamente com mensagem de parabéns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {birthdaysToday.length > 0 ? (
            birthdaysToday.map((row) => (
              <div key={row.id} className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                <p className="font-semibold text-emerald-200">Parabéns, {row.label}!</p>
                <p className="text-xs text-emerald-100/90">{row.subtitle}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">Hoje não há aniversários registados.</p>
          )}
          {birthdayRows.length === 0 && (
            <p className="text-xs text-zinc-500">
              Para ativar, adiciona data de nascimento no Perfil, Jogadores e Staff.
            </p>
          )}
        </CardContent>
      </Card>

      <FixtureFormModal
        open={fixtureModalOpen}
        onClose={() => {
          setFixtureModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={(input) => {
          if (editing) updateFixture(editing.id, input);
          else addFixture(input);
        }}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" strokeWidth={1.75} />
              Your fixtures
            </CardTitle>
            <CardDescription>
              Import FPF: resultado na página → Previous; resto pela data/hora. Perfil = filtro da equipa.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFixtureModalOpen(true);
            }}
          >
            Add fixture
          </Button>
        </CardHeader>
        <CardContent className="space-y-10">
          {!club && leagueMatches.length > 0 && (
            <p className="text-sm text-zinc-400">
              Showing every fixture from the league import. Add your club under Profile to filter to your team only.
            </p>
          )}
          {!club && leagueMatches.length === 0 && (
            <p className="text-sm text-amber-200/90">
              Add your club in Profile to highlight your matches — or leave it blank to see all fixtures once the league
              URL is refreshed.
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={() => setNextSectionOpen((o) => !o)}
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
              aria-expanded={nextSectionOpen}
            >
              <span>
                Next games
                {nextGameRows.length > 0 ? ` (${nextGameRows.length})` : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${nextSectionOpen ? "rotate-0" : "-rotate-90"}`}
                aria-hidden
              />
            </button>
            {nextSectionOpen &&
              (nextGameRows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {leagueMatches.length === 0 && leagueTableUrl.trim()
                  ? "No fixtures imported yet — use Refresh now on the league table below."
                  : "No upcoming games yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {nextGameRows.map((row) => {
                  if (row.kind === "manual") {
                    const f = row.fixture;
                    return (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-black px-4 py-3 text-white shadow-sm"
                      >
                        <div>
                          <p className="font-medium">vs {f.opponent}</p>
                          <p className="text-xs text-zinc-400">{f.competition}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatKickoffShort(f.kickoff)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted">Manual</Badge>
                          <Badge className="border-zinc-600 bg-zinc-900 text-zinc-200">
                            {f.venue === "home" ? "Home" : "Away"}
                          </Badge>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"
                            aria-label="Edit fixture"
                            onClick={() => {
                              setEditing(f);
                              setFixtureModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
                            aria-label="Remove fixture"
                            onClick={() => removeFixture(f.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  }
                  const m = row.match;
                  const b = badgeForScheduleKind(row.scheduleKind);
                  if (!club) {
                    return (
                      <li
                        key={`next-imp-${m.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-black px-4 py-3 text-white shadow-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {m.homeTeam} <span className="text-zinc-500">vs</span> {m.awayTeam}
                          </p>
                          <p className="text-xs text-zinc-400">{leagueCompetitionName ?? "Competition"}</p>
                          {m.fpfRound != null && (
                            <p className="mt-0.5 text-xs text-zinc-500">Jornada {m.fpfRound}</p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">{formatKickoffShort(m.kickoff)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={b.variant}>{b.label}</Badge>
                          <Badge variant="default">Imported</Badge>
                        </div>
                      </li>
                    );
                  }
                  const homeHit =
                    userClubMatchesOfficialTeam(teamLabel, m.homeTeam, candidates) ||
                    (!!club && userClubMatchesOfficialTeam(club, m.homeTeam, candidates));
                  const venue = homeHit ? "home" : "away";
                  const opp = homeHit ? m.awayTeam : m.homeTeam;
                  return (
                    <li
                      key={`next-imp-${m.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-black px-4 py-3 text-white shadow-sm"
                    >
                      <div>
                        <p className="font-medium">vs {opp}</p>
                        <p className="text-xs text-zinc-400">{leagueCompetitionName ?? "Competition"}</p>
                        {m.fpfRound != null && (
                          <p className="mt-0.5 text-xs text-zinc-500">Jornada {m.fpfRound}</p>
                        )}
                        <p className="mt-1 text-xs text-zinc-500">{formatKickoffShort(m.kickoff)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={b.variant}>{b.label}</Badge>
                        <Badge className="border-zinc-600 bg-zinc-900 text-zinc-200">
                          {venue === "home" ? "Home" : "Away"}
                        </Badge>
                        <Badge variant="default">Imported</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setPreviousSectionOpen((o) => !o)}
              className="mb-3 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
              aria-expanded={previousSectionOpen}
            >
              <span>
                Previous games
                {previousGameRows.length > 0 ? ` (${previousGameRows.length})` : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${previousSectionOpen ? "rotate-0" : "-rotate-90"}`}
                aria-hidden
              />
            </button>
            {previousSectionOpen &&
              (previousGameRows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {leagueMatches.length === 0 && leagueTableUrl.trim()
                  ? "No past games yet — refresh the league import, or your club name may not match the table."
                  : "No past games yet (kick-offs before now appear here)."}
              </p>
            ) : (
              <ul className="space-y-3">
                {previousGameRows.map((row) => {
                  if (row.kind === "manual") {
                    const f = row.fixture;
                    return (
                      <li
                        key={`prev-man-${f.id}`}
                        className="rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm text-zinc-200"
                      >
                        <p className="font-medium text-white">vs {f.opponent}</p>
                        <p className="text-xs text-zinc-500">{f.competition}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatKickoff(f.kickoff)}</p>
                        <p className="mt-1 text-xs text-zinc-600">Manual entry (no score stored)</p>
                      </li>
                    );
                  }
                  if (row.kind === "imported-neutral") {
                    const { match: m, line } = row;
                    return (
                      <li
                        key={`prev-neu-${m.id}`}
                        className="rounded-xl border border-zinc-600 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 shadow-sm"
                      >
                        <p className="font-semibold">{line}</p>
                        {m.fpfRound != null && (
                          <p className="mt-1 text-xs text-zinc-500">Jornada {m.fpfRound}</p>
                        )}
                        <p className="mt-1 text-xs text-zinc-500">{formatKickoff(m.kickoff)}</p>
                        <div className="mt-2">
                          <Badge variant="muted" className="bg-black/20">
                            {badgeForScheduleKind(pageScheduleKind).label}
                          </Badge>
                        </div>
                      </li>
                    );
                  }
                  const { match: m, outcome, line } = row;
                  const boxClass =
                    outcome === "W"
                      ? "border-2 border-emerald-500/80 bg-emerald-950/55 text-emerald-50"
                      : outcome === "D"
                        ? "border-2 border-white/60 bg-white/10 text-white"
                        : "border-2 border-red-500/75 bg-red-950/45 text-red-50";
                  return (
                    <li key={`prev-imp-${m.id}`} className={`rounded-xl px-4 py-3 text-sm shadow-sm ${boxClass}`}>
                      <p className="font-semibold">{line}</p>
                      {m.fpfRound != null && (
                        <p className="mt-1 text-xs opacity-90">Jornada {m.fpfRound}</p>
                      )}
                      <p className="mt-1 text-xs opacity-90">{formatKickoff(m.kickoff)}</p>
                      <div className="mt-2">
                        <Badge variant="muted" className="bg-black/20">
                          {badgeForScheduleKind(pageScheduleKind).label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
            League table
          </CardTitle>
          <CardDescription>
            Paste the public URL of your league standings page. We fetch it on this server and parse HTML tables or
            known layouts (e.g. FPF resultados.fpf.pt classificações). Your <strong>Profile → Club</strong> name selects
            your series when the page has multiple tables (Série A/B/…) and filters imported fixtures to your team.
            Heavy JavaScript-only pages may not work until we add a dedicated integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-zinc-500" htmlFor="league-url">
                Standings page URL
              </label>
              <Input
                id="league-url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://…"
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={saveUrl}>
                Save URL
              </Button>
              <Button type="button" onClick={handleRefresh} disabled={refreshing || !leagueTableUrl.trim()}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh now
              </Button>
            </div>
          </div>
          {leagueTableFetchError && (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
              {leagueTableFetchError}
            </p>
          )}
          {leagueTableLastFetched && (
            <p className="text-xs text-zinc-600">
              Last updated: {new Date(leagueTableLastFetched).toLocaleString("en-GB")} · Auto-refresh every 6 hours
              while this page is open (manual refresh anytime).
            </p>
          )}
          {leagueTableRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-3 font-medium">#</th>
                    <th className="px-3 py-3 font-medium">Team</th>
                    {showFullStats && (
                      <>
                        <th className="px-2 py-3 font-medium text-center" title="Jogos">
                          J
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Vitórias">
                          V
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Empates">
                          E
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Derrotas">
                          D
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Golos marcados">
                          GM
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Golos sofridos">
                          GS
                        </th>
                        <th className="px-2 py-3 font-medium text-center" title="Diferença de golos">
                          DG
                        </th>
                      </>
                    )}
                    <th className="px-3 py-3 font-medium text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTableRows.map((row, i) => (
                    <tr key={`${row.team}-${i}`} className="border-b border-surface-border/60 last:border-0">
                      <td className="px-3 py-2.5 text-zinc-400">{row.position}</td>
                      <td className="px-3 py-2.5 font-medium text-white">{row.team}</td>
                      {showFullStats && (
                        <>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.played ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.won ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.drawn ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.lost ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.goalsFor ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">{row.goalsAgainst ?? "—"}</td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-zinc-400">
                            {row.goalDifference ?? "—"}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{row.points ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !leagueTableFetchError && (
              <p className="text-sm text-zinc-500">
                {leagueTableUrl.trim()
                  ? "Save the URL and click Refresh to load the table."
                  : "No table loaded yet. Save a standings URL above."}
              </p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
