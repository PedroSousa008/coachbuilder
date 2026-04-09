import { Upload, Play, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockClips } from "@/data/mock";
import type { AnalysisTag } from "@/types";

const tagPool: AnalysisTag[] = [
  "Defensive mistake",
  "Build-up",
  "Pressing trigger",
  "Chance created",
];

const toneClass = {
  green: "from-accent/25 to-pitch/80",
  slate: "from-zinc-600/30 to-zinc-900/80",
  amber: "from-amber-500/20 to-zinc-900/80",
};

export default function VideoAnalysisPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-white">Match video</h2>
        <p className="text-sm text-zinc-500">
          Upload full games or cut phases — tags and drawings will sync to tactics later.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <p className="text-sm text-zinc-500">MP4 / MOV · up to 90 min per file (demo)</p>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface-raised/40 px-6 py-16 transition-colors hover:border-accent/35 hover:bg-surface-raised/60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Upload className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="mt-4 font-medium text-white">Drop a match file or browse</p>
              <p className="mt-1 text-xs text-zinc-500">No upload in MVP — UI only</p>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tagPool.map((t) => (
              <Badge key={t} variant="accent">
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Match clips</p>
          {mockClips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised/40 p-3 text-left transition-all hover:border-zinc-600"
            >
              <div
                className={`relative flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${toneClass[clip.thumbnailTone]}`}
              >
                <Play className="h-6 w-6 text-white/90" fill="currentColor" />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {clip.durationSec}s
                </span>
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-white">{clip.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {clip.tags.map((t) => (
                    <span key={t} className="text-[10px] text-zinc-500">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Notes & annotations</CardTitle>
              <p className="text-sm text-zinc-500">Selected clip: {mockClips[0]?.title}</p>
            </div>
            <PenLine className="h-5 w-5 text-zinc-500" strokeWidth={1.5} />
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              readOnly
              className="min-h-[120px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised/50 px-4 py-3 text-sm text-zinc-300"
              defaultValue="LB steps early on throw — CB line not shifting. Consider staggering CAM to cover half-space on restart."
            />
            <div className="rounded-2xl border border-dashed border-accent/25 bg-accent/5 p-6 text-center">
              <p className="text-sm font-medium text-zinc-200">Tactical drawing layer</p>
              <p className="mt-2 text-sm text-zinc-500">
                Arrows, cones, and player markers will overlay the video timeline — same language as your tactics
                board. This MVP reserves the canvas area.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
