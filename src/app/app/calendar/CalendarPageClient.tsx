"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, RefreshCw, Table2, Trash2, Pencil } from "lucide-react";
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

function outcomeForMyTeam(
  m: LeagueImportedMatch,
  club: string,
  candidates: string[]
): { opponent: string; short: string; outcome: "W" | "D" | "L" } | null {
  if (m.homeScore === undefined || m.awayScore === undefined) return null;
  const homeHit = userClubMatchesOfficialTeam(club, m.homeTeam, candidates);
  const awayHit = userClubMatchesOfficialTeam(club, m.awayTeam, candidates);
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
    };

function isImportedPlayed(m: LeagueImportedMatch): boolean {
  return m.homeScore !== undefined && m.awayScore !== undefined;
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
    hydrated,
  } = useAppData();

  const [fixtureModalOpen, setFixtureModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFixture | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUrlDraft(leagueTableUrl);
  }, [leagueTableUrl]);

  useEffect(() => {
    if (!hydrated || !leagueTableUrl.trim()) return;
    void refreshLeagueTable();
  }, [hydrated, leagueTableUrl, refreshLeagueTable]);

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

  const pageScheduleKind = useMemo(
    () => inferCompetitionKind(leagueCompetitionName ?? ""),
    [leagueCompetitionName]
  );

  /** All imported rows involving the coach’s club, split by result (played vs not). */
  const { nextGameRows, previousGameRows } = useMemo(() => {
    const next: NextRow[] = [];
    const prev: PrevRow[] = [];
    const sk = pageScheduleKind;
    const cut = Date.now() - 3600000;

    if (club) {
      for (const m of leagueMatches) {
        const mine =
          userClubMatchesOfficialTeam(club, m.homeTeam, candidates) ||
          userClubMatchesOfficialTeam(club, m.awayTeam, candidates);
        if (!mine) continue;

        if (isImportedPlayed(m)) {
          const o = outcomeForMyTeam(m, club, candidates);
          if (o) prev.push({ kind: "imported", match: m, outcome: o.outcome, line: o.short });
        } else {
          next.push({ kind: "imported", match: m, scheduleKind: sk });
        }
      }
    }

    for (const f of fixtures) {
      const t = new Date(f.kickoff).getTime();
      if (t >= cut) next.push({ kind: "manual", fixture: f });
      else prev.push({ kind: "manual", fixture: f });
    }

    next.sort((a, b) => {
      const ta = a.kind === "manual" ? new Date(a.fixture.kickoff).getTime() : new Date(a.match.kickoff).getTime();
      const tb = b.kind === "manual" ? new Date(b.fixture.kickoff).getTime() : new Date(b.match.kickoff).getTime();
      return ta - tb;
    });
    prev.sort((a, b) => {
      const ta = a.kind === "manual" ? new Date(a.fixture.kickoff).getTime() : new Date(a.match.kickoff).getTime();
      const tb = b.kind === "manual" ? new Date(b.fixture.kickoff).getTime() : new Date(b.match.kickoff).getTime();
      return tb - ta;
    });

    return { nextGameRows: next, previousGameRows: prev };
  }, [leagueMatches, fixtures, club, candidates, pageScheduleKind]);

  const showFullStats = leagueTableRows.some((r) => r.played != null);

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
          Next games are fixtures still to play (no result yet). Previous games are finished matches with the score —
          wins, draws, and losses are colour-coded.
        </p>
        {resolvedClub && (
          <p className="mt-2 text-xs text-accent">
            Resolved club: <span className="font-medium text-white">{resolvedClub.name}</span> (from your spelling)
          </p>
        )}
      </div>

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
              Two lists: games still to come (black cards) and games already played with result (green / white / red).
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
          {!club && (
            <p className="text-sm text-amber-200/90">
              Set your club name in Profile and save — then refresh the league URL so we can attach the right team.
            </p>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Next games</p>
            {nextGameRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No upcoming games for your club yet.</p>
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
                  const homeHit = userClubMatchesOfficialTeam(club, m.homeTeam, candidates);
                  const venue = homeHit ? "home" : "away";
                  const opp = homeHit ? m.awayTeam : m.homeTeam;
                  const b = badgeForScheduleKind(row.scheduleKind);
                  return (
                    <li
                      key={`next-imp-${m.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-black px-4 py-3 text-white shadow-sm"
                    >
                      <div>
                        <p className="font-medium">vs {opp}</p>
                        <p className="text-xs text-zinc-400">{leagueCompetitionName ?? "Competition"}</p>
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
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Previous games</p>
            {previousGameRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No finished games with a result yet.</p>
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
            )}
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
            known layouts (e.g. FPF resultados.fpf.pt classificações). Heavy JavaScript-only pages may not work until we
            add a dedicated integration.
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
