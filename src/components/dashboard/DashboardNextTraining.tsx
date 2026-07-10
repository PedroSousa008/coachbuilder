"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/contexts/AppDataContext";
import { formatRelativeDay } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export function DashboardNextTraining() {
  const { trainingSessions } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";

  const upcomingSession = useMemo(() => {
    if (trainingSessions.length === 0) return null;
    const future = trainingSessions
      .filter((s) => new Date(s.date).getTime() >= Date.now() - 86400000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return future[0] ?? trainingSessions[0] ?? null;
  }, [trainingSessions]);

  return (
    <section className="flex h-full flex-col rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/[0.08]">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {isPt ? "Próximo treino" : "Next training session"}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {upcomingSession
            ? formatRelativeDay(upcomingSession.date)
            : isPt
              ? "Sem sessões planeadas"
              : "No sessions planned"}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {upcomingSession ? (
          <>
            <p className="text-base font-medium text-white">{upcomingSession.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {upcomingSession.categories.map((c) => (
                <Badge key={c} variant="muted">
                  {c}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-zinc-500">
              {upcomingSession.durationMin} {isPt ? "min" : "min"} · {isPt ? "intensidade" : "intensity"}{" "}
              {upcomingSession.intensity}
            </p>
            <div className="mt-auto pt-6">
              <Link
                href="/app/training"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-accent-muted"
              >
                {isPt ? "Ver treinos" : "View training"}
              </Link>
            </div>
          </>
        ) : (
          <DashboardEmptyState
            icon={Dumbbell}
            title={isPt ? "Sem treinos planeados" : "No training planned"}
            description={
              isPt
                ? "Adiciona a primeira sessão para planear exercícios, intensidade e ritmo semanal."
                : "Add your first session to plan drills, intensity, and weekly rhythm."
            }
            actionLabel={isPt ? "Planear treino" : "Plan training"}
            actionHref="/app/training"
            className="flex-1"
          />
        )}
      </div>
    </section>
  );
}
