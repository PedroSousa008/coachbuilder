"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { mockCoach } from "@/data/mock";
import type { CoachProfileState } from "@/types";
import { computeCoachPerformance, tacticLabel } from "@/lib/tactics-match-stats";

function initialsFromName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function ProfilePage() {
  const { coachProfile, setCoachProfile, hydrated, savedTactics, tacticMatches, trainingSessions, players } =
    useAppData();

  const coachPerf = useMemo(
    () => computeCoachPerformance(savedTactics, tacticMatches, players),
    [savedTactics, tacticMatches, players]
  );
  const [draft, setDraft] = useState<CoachProfileState>(coachProfile);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) setDraft(coachProfile);
  }, [hydrated, coachProfile]);

  const avatarLetters = useMemo(() => initialsFromName(draft.name), [draft.name]);

  const handleSave = () => {
    setCoachProfile(draft);
    setSaveHint("Saved on this device");
    window.setTimeout(() => setSaveHint(null), 2800);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-zinc-800 font-display text-2xl font-bold text-white">
          {avatarLetters}
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">{draft.name.trim() || "Your name"}</h2>
          <p className="text-sm text-zinc-500">
            {draft.club.trim() || "Your club"} · {draft.role}
          </p>
          <div className="mt-3">
            <Badge variant={mockCoach.plan === "pro" ? "accent" : "default"}>
              {mockCoach.plan === "pro" ? "Coach Pro" : "Free plan"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Táticas guardadas", value: savedTactics.length },
          { label: "Sessões planeadas", value: trainingSessions.length },
          { label: "Jogos registados", value: tacticMatches.length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-border bg-surface-raised/50 p-4 text-center">
            <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho do treinador</CardTitle>
          <p className="text-sm text-zinc-500">
            Agregado de todos os jogos registados nas táticas. Atualiza automaticamente quando adicionas ou editas
            resultados.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PerfCell label="Vitórias" value={coachPerf.wins} accent />
            <PerfCell label="Empates" value={coachPerf.draws} />
            <PerfCell label="Derrotas" value={coachPerf.losses} danger />
            <PerfCell label="% vitórias" value={`${coachPerf.winRate}%`} accent />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PerfCell label="Golos marcados" value={coachPerf.goalsFor} />
            <PerfCell label="Golos sofridos" value={coachPerf.goalsAgainst} />
            <PerfCell label="Diferença" value={coachPerf.goalDiff >= 0 ? `+${coachPerf.goalDiff}` : coachPerf.goalDiff} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PerfCell label="Jogos sem sofrer" value={coachPerf.cleanSheets} />
            <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Forma (últimos 5)</p>
              <p className="mt-2 font-medium text-white">
                {coachPerf.formLast5.length ? coachPerf.formLast5.join(" · ") : "—"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tática mais utilizada</p>
              <p className="mt-2 text-sm font-medium leading-snug text-zinc-200">
                {coachPerf.mostUsedTactic ? tacticLabel(coachPerf.mostUsedTactic.tactic) : "—"}
              </p>
              {coachPerf.mostUsedTactic ? (
                <p className="mt-1 text-xs text-zinc-500">{coachPerf.mostUsedTactic.matches} jogos</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Melhor taxa de vitória (mín. 1 jogo)</p>
              <p className="mt-2 text-sm font-medium leading-snug text-zinc-200">
                {coachPerf.bestTacticByWinRate ? tacticLabel(coachPerf.bestTacticByWinRate.tactic) : "—"}
              </p>
              {coachPerf.bestTacticByWinRate ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {coachPerf.bestTacticByWinRate.winRate}% · {coachPerf.bestTacticByWinRate.matches} jogos
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Melhor marcador (soma em todas as táticas)</p>
            <p className="mt-2 text-sm font-medium text-white">
              {coachPerf.topScorer
                ? `${coachPerf.topScorer.player.name} — ${coachPerf.topScorer.goals} golos`
                : "Ainda sem golos registados"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <p className="text-sm text-zinc-500">
            Edit your details, then press <span className="text-zinc-400">Save</span> to store them on this device. Your
            club name is matched against imported standings and fixtures (including small typos like “Dumiense” → “Ad
            Ninense”).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-club">
              Club (your team name)
            </label>
            <input
              id="p-club"
              value={draft.club}
              onChange={(e) => setDraft((d) => ({ ...d, club: e.target.value }))}
              placeholder="e.g. Dumiense, Fafe, Moreirense"
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              We resolve this against every team name on your league page so highlights and “next match” follow the right
              club.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-role">
              Role
            </label>
            <input
              id="p-role"
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-email">
              Email
            </label>
            <input
              id="p-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" className="sm:min-w-[140px]" onClick={handleSave}>
              Save
            </Button>
            {saveHint && <p className="text-sm text-accent">{saveHint}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerfCell({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={`mt-2 font-display text-xl font-semibold tabular-nums ${
          danger ? "text-red-400/90" : accent ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
