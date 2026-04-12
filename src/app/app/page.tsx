"use client";

import Link from "next/link";
import { GitBranch, CalendarDays, MessageSquare, PenSquare, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { mockCoach } from "@/data/mock";
import { DashboardInboxPreview } from "@/components/dashboard/DashboardInboxPreview";
import { DashboardNextMatch } from "@/components/dashboard/DashboardNextMatch";
import { DashboardSketchToday } from "@/components/dashboard/DashboardSketchToday";
import { formatRelativeDay } from "@/lib/format";
import { useAppData } from "@/contexts/AppDataContext";
import { computeCoachPerformance, tallyForTactic, winRatePercent } from "@/lib/tactics-match-stats";

export default function DashboardPage() {
  const { coachProfile, savedTactics, tacticMatches, trainingSessions, players } = useAppData();

  const coachPerf = useMemo(
    () => computeCoachPerformance(savedTactics, tacticMatches, players),
    [savedTactics, tacticMatches, players]
  );

  const featuredTactic = coachPerf.mostUsedTactic?.tactic ?? savedTactics[0];
  const featuredTally = featuredTactic ? tallyForTactic(tacticMatches, featuredTactic.id) : null;
  const tacticWinRate = featuredTally ? winRatePercent(featuredTally.wins, featuredTally.matchesUsed) : 0;

  const welcomeLine =
    coachProfile.name.trim().length > 0
      ? `Welcome back, ${coachProfile.name.trim().split(/\s+/)[0]}`
      : "Welcome to CoachBuilder";

  const upcomingSession = useMemo(() => {
    if (trainingSessions.length === 0) return null;
    const future = trainingSessions
      .filter((s) => new Date(s.date).getTime() >= Date.now() - 86400000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return future[0] ?? trainingSessions[0] ?? null;
  }, [trainingSessions]);

  const formStr = coachPerf.formLast5.length > 0 ? coachPerf.formLast5.join(" · ") : "—";
  const formHint =
    coachPerf.matchesLogged > 0
      ? `${coachPerf.goalsFor} marcados · ${coachPerf.goalsAgainst} sofridos · SG ${coachPerf.cleanSheets}`
      : "Regista jogos nas Táticas para ver forma e golos";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">{welcomeLine}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {coachProfile.club.trim() || "Your club"} · {coachProfile.role || mockCoach.role}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tactics saved" value={savedTactics.length} icon={GitBranch} />
        <StatCard label="Sessions planned" value={trainingSessions.length} icon={CalendarDays} />
        <StatCard label="Matches logged" value={tacticMatches.length} icon={Target} />
        <StatCard label="Form (last 5)" value={formStr} hint={formHint} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <DashboardSketchToday />
        </div>
        <Card className="lg:col-span-2" hover>
          <CardHeader>
            <CardTitle>Upcoming training</CardTitle>
            {upcomingSession ? (
              <p className="text-sm text-zinc-500">{formatRelativeDay(upcomingSession.date)}</p>
            ) : (
              <p className="text-sm text-zinc-500">Nothing scheduled</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {upcomingSession ? (
              <>
                <div>
                  <p className="font-medium text-white">{upcomingSession.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {upcomingSession.categories.map((c) => (
                      <Badge key={c} variant="muted">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {upcomingSession.durationMin} minutes · {upcomingSession.intensity} intensity
                  </p>
                </div>
                <Link
                  href="/app/training"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-surface-border px-4 text-sm font-medium text-zinc-200 hover:border-accent/40 hover:text-white"
                >
                  View week
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">
                  Add your first session to plan drills, intensity, and the weekly rhythm.
                </p>
                <Link
                  href="/app/training"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-zinc-950 hover:bg-accent-muted"
                >
                  Plan training
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <CardTitle>Next match</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardNextMatch />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent messages</CardTitle>
            <Link href="/app/messages" className="text-xs font-medium text-accent hover:underline">
              Open inbox
            </Link>
          </CardHeader>
          <CardContent>
            <DashboardInboxPreview />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tactic performance</CardTitle>
            {featuredTactic ? (
              <p className="text-sm text-zinc-500">{featuredTactic.name}</p>
            ) : (
              <p className="text-sm text-zinc-500">No tactics saved yet</p>
            )}
          </CardHeader>
          <CardContent>
            {featuredTactic && featuredTally ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Jogos</p>
                    <p className="mt-1 font-display text-xl font-semibold text-white">{featuredTally.matchesUsed}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Vitórias</p>
                    <p className="mt-1 font-display text-xl font-semibold text-accent">{featuredTally.wins}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Derrotas</p>
                    <p className="mt-1 font-display text-xl font-semibold text-red-400/90">{featuredTally.losses}</p>
                  </div>
                  <div className="rounded-xl bg-accent/10 p-3 text-center">
                    <p className="text-xs text-zinc-500">% vitórias</p>
                    <p className="mt-1 font-display text-xl font-semibold text-accent">{tacticWinRate}%</p>
                  </div>
                </div>
                {coachPerf.topScorer ? (
                  <p className="mt-4 text-xs text-zinc-500">
                    Melhor marcador:{" "}
                    <span className="text-zinc-300">
                      {coachPerf.topScorer.player.name} ({coachPerf.topScorer.goals} golos)
                    </span>
                  </p>
                ) : null}
                <Link href="/app/tactics" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
                  Abrir táticas
                </Link>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Save a formation and track how it performs over the season.
                </p>
                <Link href="/app/tactics" className="inline-block text-sm font-medium text-accent hover:underline">
                  Open tactics
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Quick actions</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/tactics"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-zinc-950 hover:bg-accent-muted"
          >
            <GitBranch className="h-4 w-4" />
            Create tactic
          </Link>
          <Link
            href="/app/training"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-5 text-sm font-medium text-zinc-200 hover:border-zinc-600"
          >
            <CalendarDays className="h-4 w-4" />
            Add training session
          </Link>
          <Link
            href="/app/messages"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-5 text-sm font-medium text-zinc-200 hover:border-zinc-600"
          >
            <MessageSquare className="h-4 w-4" />
            Open team chat
          </Link>
          <Link
            href="/app/sketch"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-5 text-sm font-medium text-zinc-200 hover:border-zinc-600"
          >
            <PenSquare className="h-4 w-4" />
            Sketch Area
          </Link>
        </div>
      </div>
    </div>
  );
}
