import type { SavedTrainingExercise, SketchBoardDraft, Tactic, TacticMatch } from "@/types";

export type ContinueWorkItem = {
  id: string;
  kind: "tactic" | "board" | "exercise" | "match";
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

export function buildContinueWorkItems(params: {
  savedTactics: Tactic[];
  boardDrafts: SketchBoardDraft[];
  savedTrainingExercises: SavedTrainingExercise[];
  tacticMatches: TacticMatch[];
  isPt: boolean;
  limit?: number;
}): ContinueWorkItem[] {
  const { savedTactics, boardDrafts, savedTrainingExercises, tacticMatches, isPt, limit = 4 } = params;
  const items: ContinueWorkItem[] = [];

  for (const t of savedTactics) {
    if (!t.updatedAt) continue;
    items.push({
      id: `tactic-${t.id}`,
      kind: "tactic",
      title: t.name,
      subtitle: isPt ? `Formação ${t.formation.replace(/-/g, "–")}` : `Formation ${t.formation}`,
      href: "/app/tactics",
      updatedAt: t.updatedAt,
    });
  }

  for (const d of boardDrafts) {
    if (!d.updatedAt) continue;
    items.push({
      id: `board-${d.id}`,
      kind: "board",
      title: d.title.trim() || (isPt ? "Quadro tático" : "Tactical board"),
      subtitle: isPt ? "Sketch Area · rascunho" : "Sketch Area · draft",
      href: "/app/sketch",
      updatedAt: d.updatedAt,
    });
  }

  for (const e of savedTrainingExercises) {
    items.push({
      id: `exercise-${e.id}`,
      kind: "exercise",
      title: e.title,
      subtitle: isPt ? "Exercício guardado" : "Saved exercise",
      href: "/app/training",
      updatedAt: e.updatedAt,
    });
  }

  for (const m of tacticMatches) {
    const stamp = m.updatedAt || m.createdAt;
    if (!stamp) continue;
    items.push({
      id: `match-${m.id}`,
      kind: "match",
      title: isPt ? `Jogo vs ${m.opponent}` : `Match vs ${m.opponent}`,
      subtitle: isPt ? "Registo tático" : "Tactic match log",
      href: "/app/tactics",
      updatedAt: stamp,
    });
  }

  return items
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
