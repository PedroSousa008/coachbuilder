"use client";

import { useMemo } from "react";
import { computeCoachingDevelopmentRows, COACHING_TOPICS } from "@/lib/coaching-development-registry";

type Props = {
  watchedLessonIds: readonly string[];
};

export function CoachingDevelopmentTable({ watchedLessonIds }: Props) {
  const rows = useMemo(() => computeCoachingDevelopmentRows(watchedLessonIds), [watchedLessonIds]);

  const byTopic = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.topic.id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return COACHING_TOPICS.map((t) => ({ topic: t, skills: m.get(t.id) ?? [] })).filter((g) => g.skills.length > 0);
  }, [rows]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
      <div className="mb-6 max-w-3xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent/90">Skill development</p>
        <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">Coaching Development Table</h3>
        <p className="text-sm leading-relaxed text-zinc-400">
          Every lesson you mark as watched contributes <span className="text-zinc-300">partial progress</span> to the
          skills it develops. If a skill appears in <span className="text-zinc-300">N</span> lessons in the catalogue,
          each completed lesson adds <span className="text-zinc-300">100 ÷ N</span> percent toward that skill — so
          knowledge builds over time instead of unlocking instantly.
        </p>
        <p className="text-xs text-zinc-600">
          Catalogue entries use lesson IDs (usually the calendar <code className="text-zinc-500">YYYY-MM-DD</code> when
          a video goes live). Sample lessons in the codebase use <code className="text-zinc-500">example-lesson-*</code>{" "}
          until you replace them with your topics, skills, and per-video mappings.
        </p>
      </div>

      <div className="space-y-10">
        {byTopic.map(({ topic, skills }) => (
          <div key={topic.id}>
            <div className="mb-4 border-b border-white/10 pb-3">
              <h4 className="font-display text-base font-semibold text-white">{topic.label}</h4>
              {topic.summary ? <p className="mt-1 text-xs text-zinc-500">{topic.summary}</p> : null}
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 font-medium">Skill</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="w-40 px-4 py-3 font-medium">Lessons</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((r) => (
                    <tr key={r.skill.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-zinc-200">{r.skill.label}</p>
                        {r.skill.summary ? <p className="mt-0.5 text-xs text-zinc-500">{r.skill.summary}</p> : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500/90 to-accent/90 transition-[width] duration-500"
                              style={{ width: `${r.progressPercent}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right font-mono text-xs text-zinc-400">
                            {r.progressPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-zinc-500">
                        <span className="text-zinc-300">{r.contributingWatchedCount}</span>
                        <span className="text-zinc-600"> / </span>
                        <span>{r.relatedLessonTotal}</span>
                        <span className="ml-1 block text-[10px] uppercase tracking-wider text-zinc-600">in catalogue</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
