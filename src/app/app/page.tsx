"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar, CalendarDays, GitBranch, MessageSquare, PenSquare, Target, TrendingUp } from "lucide-react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { DashboardMonthCalendarPreview } from "@/components/dashboard/DashboardMonthCalendarPreview";
import { DashboardNextTraining } from "@/components/dashboard/DashboardNextTraining";
import { DashboardNextMatch } from "@/components/dashboard/DashboardNextMatch";
import { DashboardInboxPreview } from "@/components/dashboard/DashboardInboxPreview";
import { DashboardContinueWorking } from "@/components/dashboard/DashboardContinueWorking";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { summarizePastClubResults } from "@/lib/past-club-results-utils";

export default function DashboardPage() {
  const { coachProfile, savedTactics, trainingSessions, pastClubResults } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";

  const calendarPerf = useMemo(
    () => summarizePastClubResults(pastClubResults, coachProfile.club),
    [pastClubResults, coachProfile.club]
  );

  const firstName =
    coachProfile.name.trim().length > 0 ? coachProfile.name.trim().split(/\s+/)[0] : null;

  const welcomeLine = firstName
    ? isPt
      ? `Bem-vindo de volta, ${firstName}`
      : `Welcome back, ${firstName}`
    : isPt
      ? "Bem-vindo ao CoachBuilder"
      : "Welcome to CoachBuilder";

  const tagline = isPt
    ? "Cada grande desempenho começa com uma grande preparação."
    : "Every great performance starts with great preparation.";

  const formStr = calendarPerf.formLast5.length > 0 ? calendarPerf.formLast5.join(" · ") : "—";
  const formHint =
    calendarPerf.matchesLogged > 0
      ? isPt
        ? `${calendarPerf.goalsFor} marcados · ${calendarPerf.goalsAgainst} sofridos · SG ${calendarPerf.cleanSheets}`
        : `${calendarPerf.goalsFor} scored · ${calendarPerf.goalsAgainst} conceded · CS ${calendarPerf.cleanSheets}`
      : isPt
        ? "Aplica resultados no Calendário para ver forma"
        : "Apply calendar results to view form";

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 pb-12 animate-[dashboardFadeIn_0.45s_ease-out_both]">
      <DashboardHero
        welcomeLine={welcomeLine}
        club={coachProfile.club}
        role={coachProfile.role}
        tagline={tagline}
      />

      <section aria-label={isPt ? "Resumo" : "Overview"}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            label={isPt ? "Táticas guardadas" : "Saved tactics"}
            value={savedTactics.length}
            icon={GitBranch}
          />
          <DashboardMetricCard
            label={isPt ? "Sessões planeadas" : "Planned sessions"}
            value={trainingSessions.length}
            icon={CalendarDays}
          />
          <DashboardMetricCard
            label={isPt ? "Jogos registados" : "Registered matches"}
            value={calendarPerf.matchesLogged}
            icon={Target}
          />
          <DashboardMetricCard
            label={isPt ? "Forma (últimos 5)" : "Last 5 form"}
            value={formStr}
            hint={formHint}
            icon={TrendingUp}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7">
          <DashboardMonthCalendarPreview />
        </div>
        <div className="lg:col-span-5">
          <DashboardNextTraining />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <DashboardNextMatch />
        <DashboardInboxPreview />
      </section>

      <DashboardContinueWorking />

      <section>
        <p className="mb-4 text-[13px] font-medium text-zinc-600">
          {isPt ? "Atalhos" : "Shortcuts"}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/tactics"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:bg-accent-muted"
          >
            <GitBranch className="h-4 w-4" strokeWidth={1.75} />
            {isPt ? "Criar tática" : "Create tactic"}
          </Link>
          <Link
            href="/app/calendar"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
          >
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
            {isPt ? "Calendário" : "Calendar"}
          </Link>
          <Link
            href="/app/training"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
            {isPt ? "Treinos" : "Training"}
          </Link>
          <Link
            href="/app/messages"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
            {isPt ? "Mensagens" : "Messages"}
          </Link>
          <Link
            href="/app/sketch"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
          >
            <PenSquare className="h-4 w-4" strokeWidth={1.75} />
            Sketch Area
          </Link>
        </div>
      </section>
    </div>
  );
}
