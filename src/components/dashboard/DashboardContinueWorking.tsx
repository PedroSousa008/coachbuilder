"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GitBranch, Layout, MessageSquare, Target } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildContinueWorkItems } from "@/lib/dashboard-continue-working";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import type { ContinueWorkItem } from "@/lib/dashboard-continue-working";
import type { LucideIcon } from "lucide-react";

const KIND_ICON: Record<ContinueWorkItem["kind"], LucideIcon> = {
  tactic: GitBranch,
  board: Layout,
  exercise: Target,
  match: Target,
};

function formatEdited(iso: string, isPt: boolean): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return isPt ? "Agora" : "Just now";
  if (mins < 60) return isPt ? `Há ${mins} min` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isPt ? `Há ${hours} h` : `${hours}h ago`;
  return d.toLocaleDateString(isPt ? "pt-PT" : undefined, { day: "numeric", month: "short" });
}

export function DashboardContinueWorking() {
  const { savedTactics, sketchArea, savedTrainingExercises, tacticMatches } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";

  const items = useMemo(
    () =>
      buildContinueWorkItems({
        savedTactics,
        boardDrafts: sketchArea.boardDrafts,
        savedTrainingExercises,
        tacticMatches,
        isPt,
        limit: 4,
      }),
    [savedTactics, sketchArea.boardDrafts, savedTrainingExercises, tacticMatches, isPt]
  );

  return (
    <section className="rounded-[20px] border border-white/[0.06] bg-[#111111] shadow-[0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-white/[0.08]">
      <div className="border-b border-white/[0.06] px-6 py-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {isPt ? "Continuar a trabalhar" : "Continue working"}
        </h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          {isPt ? "O teu trabalho recente" : "Your recent work"}
        </p>
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <DashboardEmptyState
            icon={MessageSquare}
            title={isPt ? "Nada por retomar" : "Nothing to resume"}
            description={
              isPt
                ? "Quando editares táticas, quadros ou exercícios, aparecem aqui para continuares de onde paraste."
                : "When you edit tactics, boards, or exercises, they will appear here so you can pick up where you left off."
            }
            actionLabel={isPt ? "Criar tática" : "Create tactic"}
            actionHref="/app/tactics"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-500 transition-colors duration-200 group-hover:text-accent">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-white">{item.title}</p>
                      <p className="mt-0.5 text-[13px] text-zinc-500">{item.subtitle}</p>
                      <p className="mt-2 text-[12px] text-zinc-600">{formatEdited(item.updatedAt, isPt)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
