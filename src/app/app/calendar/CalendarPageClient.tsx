"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, RefreshCw, Table2, Trash2, Pencil } from "lucide-react";
import type { MatchFixture } from "@/types";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FixtureFormModal } from "@/components/calendar/FixtureFormModal";
import { formatKickoff } from "@/lib/format";

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

export function CalendarPageClient() {
  const {
    fixtures,
    addFixture,
    updateFixture,
    removeFixture,
    leagueTableUrl,
    setLeagueTableUrl,
    leagueTableRows,
    leagueTableLastFetched,
    leagueTableFetchError,
    refreshLeagueTable,
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
  }, [hydrated, leagueTableUrl]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Calendar & matchweek</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Plan fixtures, then link your league’s public standings page — we’ll try to keep the table in sync.
        </p>
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
              Next fixtures
            </CardTitle>
            <CardDescription>Home or away matches — same data powers your dashboard “Next match”.</CardDescription>
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
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming fixtures. Add your next match above.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised/40 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">vs {f.opponent}</p>
                    <p className="text-xs text-zinc-500">{f.competition}</p>
                    <p className="mt-1 text-xs text-zinc-400">{formatKickoffShort(f.kickoff)}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Past</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
            League table
          </CardTitle>
          <CardDescription>
            Paste the public URL of your league standings page (HTML with a table). We fetch it on this server
            and parse the largest table — many sites work; some use heavy JavaScript and won’t work until we add a
            dedicated integration.
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
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Team</th>
                    <th className="px-4 py-3 font-medium text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTableRows.map((row, i) => (
                    <tr key={`${row.team}-${i}`} className="border-b border-surface-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-zinc-400">{row.position}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{row.team}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">
                        {row.points ?? "—"}
                      </td>
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
