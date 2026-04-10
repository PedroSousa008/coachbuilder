import Link from "next/link";
import { GitBranch, CalendarDays, MessageSquare, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import {
  mockCoach,
  mockNextMatch,
  mockTeamStats,
  mockTactics,
  mockConversations,
  mockMessages,
  mockUpcomingSession,
} from "@/data/mock";
import { formatKickoff, formatRelativeDay } from "@/lib/format";

export default function DashboardPage() {
  const featuredTactic = mockTactics[0];
  const denom = featuredTactic ? featuredTactic.wins + featuredTactic.losses : 0;
  const tacticWinRate = featuredTactic && denom > 0 ? Math.round((featuredTactic.wins / denom) * 100) : 0;
  const firstGroup = mockConversations.find((c) => c.type === "group");
  const groupPreview = firstGroup ? (mockMessages[firstGroup.id]?.slice(-2).reverse() ?? []) : [];
  const welcomeLine =
    mockCoach.name.trim().length > 0
      ? `Welcome back, ${mockCoach.name.trim().split(/\s+/)[0]}`
      : "Welcome to CoachBuilder";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">{welcomeLine}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {mockCoach.club.trim() || "Your club"} · {mockCoach.role}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tactics saved" value={mockCoach.tacticsCreated} icon={GitBranch} />
        <StatCard label="Sessions planned" value={mockCoach.sessionsPlanned} icon={CalendarDays} />
        <StatCard label="Matches tagged" value={mockCoach.matchesAnalyzed} icon={Target} />
        <StatCard
          label="Form (last 5)"
          value={mockTeamStats.formLast5.length > 0 ? mockTeamStats.formLast5.join(" · ") : "—"}
          hint={
            mockTeamStats.formLast5.length > 0
              ? `${mockTeamStats.goalsFor} GF · ${mockTeamStats.goalsAgainst} GA`
              : "Log results to see form"
          }
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" hover>
          <CardHeader>
            <CardTitle>Upcoming training</CardTitle>
            {mockUpcomingSession ? (
              <p className="text-sm text-zinc-500">{formatRelativeDay(mockUpcomingSession.date)}</p>
            ) : (
              <p className="text-sm text-zinc-500">Nothing scheduled</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {mockUpcomingSession ? (
              <>
                <div>
                  <p className="font-medium text-white">{mockUpcomingSession.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mockUpcomingSession.categories.map((c) => (
                      <Badge key={c} variant="muted">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {mockUpcomingSession.durationMin} minutes · {mockUpcomingSession.intensity} intensity
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
            {mockNextMatch ? (
              <>
                <p className="text-lg font-semibold text-white">{mockNextMatch.opponent}</p>
                <p className="mt-1 text-sm text-zinc-500">{mockNextMatch.competition}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="accent">{mockNextMatch.venue === "home" ? "Home" : "Away"}</Badge>
                  <Badge variant="default">{formatKickoff(mockNextMatch.kickoff)}</Badge>
                </div>
                <Link href="/app/tactics" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
                  Open match tactics
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">No upcoming fixture yet.</p>
                <Link href="/app/tactics" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
                  Prepare a tactic anyway
                </Link>
              </>
            )}
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
          <CardContent className="space-y-4">
            {groupPreview.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet. Start the squad chat when your team is connected.</p>
            ) : (
              groupPreview.map((m) => (
                <div key={m.id} className="rounded-xl border border-surface-border/80 bg-surface-raised/30 p-3">
                  <p className="text-xs font-medium text-accent">{m.authorName}</p>
                  <p className="mt-1 text-sm text-zinc-300">{m.body}</p>
                </div>
              ))
            )}
            {firstGroup && (
              <p className="text-xs text-zinc-600">
                {firstGroup.title}: {firstGroup.lastMessagePreview}
              </p>
            )}
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
            {featuredTactic ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Used</p>
                    <p className="mt-1 font-display text-xl font-semibold text-white">{featuredTactic.matchesUsed}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Wins</p>
                    <p className="mt-1 font-display text-xl font-semibold text-accent">{featuredTactic.wins}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/50 p-3 text-center">
                    <p className="text-xs text-zinc-500">Losses</p>
                    <p className="mt-1 font-display text-xl font-semibold text-red-400/90">{featuredTactic.losses}</p>
                  </div>
                  <div className="rounded-xl bg-accent/10 p-3 text-center">
                    <p className="text-xs text-zinc-500">Win rate</p>
                    <p className="mt-1 font-display text-xl font-semibold text-accent">{tacticWinRate}%</p>
                  </div>
                </div>
                <Link href="/app/tactics" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
                  Edit tactic board
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
        </div>
      </div>
    </div>
  );
}
