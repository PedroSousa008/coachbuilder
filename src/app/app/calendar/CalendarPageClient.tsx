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

type UnifiedUpcoming =
  | { kind: "manual"; fixture: MatchFixture }
  | { kind: "imported"; match: LeagueImportedMatch; scheduleKind: CompetitionKind };

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

  const { upcoming, past } = useMemo(() => {
    const t = Date.now() - 3600000;
    const u: MatchFixture[] = [];
    const p: MatchFixture[] = [];
    for (const f of fixtures) {
      if (new Date(f.kickoff).getTime() >= t) u.push(f);
      else p.push(f);
    }
    u.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    p.sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
    return { upcoming: u, past: p };
  }, [fixtures]);

  const { leagueUpcoming, leaguePast } = useMemo(() => {
    const cut = Date.now() - 3600000;
    const u: LeagueImportedMatch[] = [];
    const pa: LeagueImportedMatch[] = [];
    for (const m of leagueMatches) {
      const t = new Date(m.kickoff).getTime();
      if (t >= cut) u.push(m);
      else pa.push(m);
    }
    u.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    pa.sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
    return { leagueUpcoming: u, leaguePast: pa };
  }, [leagueMatches]);

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

  const unifiedUpcoming = useMemo((): UnifiedUpcoming[] => {
    const rows: UnifiedUpcoming[] = [];
    const sk = pageScheduleKind;
    if (club) {
      for (const m of leagueUpcoming) {
        const mine =
          userClubMatchesOfficialTeam(club, m.homeTeam, candidates) ||
          userClubMatchesOfficialTeam(club, m.awayTeam, candidates);
        if (mine) rows.push({ kind: "imported", match: m, scheduleKind: sk });
      }
    }
    for (const f of upcoming) {
      rows.push({ kind: "manual", fixture: f });
    }
    rows.sort((a, b) => {
      const ta = a.kind === "manual" ? new Date(a.fixture.kickoff).getTime() : new Date(a.match.kickoff).getTime();
      const tb = b.kind === "manual" ? new Date(b.fixture.kickoff).getTime() : new Date(b.match.kickoff).getTime();
      return ta - tb;
    });
    return rows;
  }, [leagueUpcoming, upcoming, club, candidates, pageScheduleKind]);

  const myPreviousGames = useMemo(() => {
    if (!club) return [];
    const rows: { match: LeagueImportedMatch; line: string; outcome: "W" | "D" | "L" }[] = [];
    for (const m of leaguePast) {
      const o = outcomeForMyTeam(m, club, candidates);
      if (o) rows.push({ match: m, line: o.short, outcome: o.outcome });
    }
    rows.sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime());
    return rows;
  }, [leaguePast, club, candidates]);

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
          Your club in Profile is matched to names on the league page. Upcoming imports are listed under Your fixtures;
          finished games with results appear under Previous games.
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
              Manual entries plus upcoming games for your club pulled from the league page. Schedule type (league vs
              cup-style) is inferred from the competition title when possible.
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
        <CardContent className="space-y-8">
          {!club && (
            <p className="text-sm text-amber-200/90">
              Set your club name in Profile and save — then refresh the league URL so we can attach the right team.
            </p>
          )}

          {unifiedUpcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming fixtures yet (manual or imported for your club).</p>
          ) : (
            <ul className="space-y-3">
              {unifiedUpcoming.map((row) => {
                if (row.kind === "manual") {
                  const f = row.fixture;
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">vs {f.opponent}</p>
                        <p className="text-xs text-zinc-500">{f.competition}</p>
                        <p className="mt-1 text-xs text-zinc-400">{formatKickoffShort(f.kickoff)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted">Manual</Badge>
                        <Badge variant="accent">{f.venue === "home" ? "Home" : "Away"}</Badge>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
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
                          className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
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
                    key={`imp-${m.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">vs {opp}</p>
                      <p className="text-xs text-zinc-500">{leagueCompetitionName ?? "Competition"}</p>
                      <p className="mt-1 text-xs text-zinc-400">{formatKickoffShort(m.kickoff)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={b.variant}>{b.label}</Badge>
                      <Badge variant="accent">{venue === "home" ? "Home" : "Away"}</Badge>
                      <Badge variant="default">Imported</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {past.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Past (manual)</p>
              <ul className="space-y-2 opacity-90">
                {past.slice(0, 8).map((f) => (
                  <li key={f.id} className="flex justify-between gap-2 text-sm text-zinc-500">
                    <span>
                      vs {f.opponent} · {f.competition}
                    </span>
                    <span className="shrink-0">{formatKickoff(f.kickoff)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {leagueMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous games</CardTitle>
            <CardDescription>
              Every finished game on the import that involves your club (Profile), with the result from your team’s
              perspective. Refresh the league URL after match days to update.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!club ? (
              <p className="text-sm text-zinc-500">Add and save your club in Profile to filter these games.</p>
            ) : myPreviousGames.length === 0 ? (
              <p className="text-sm text-zinc-500">No past results for your club in this import yet.</p>
            ) : (
              <ul className="space-y-2">
                {myPreviousGames.map(({ match: m, line, outcome }) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised/30 px-4 py-3 text-sm"
                  >
                    <div>
                      <span
                        className={
                          outcome === "W"
                            ? "text-accent"
                            : outcome === "D"
                              ? "text-zinc-300"
                              : "text-red-400/90"
                        }
                      >
                        {line}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500">{formatKickoff(m.kickoff)}</p>
                    </div>
                    <Badge variant="muted">{badgeForScheduleKind(pageScheduleKind).label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

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
