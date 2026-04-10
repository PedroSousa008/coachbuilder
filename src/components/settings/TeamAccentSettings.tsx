"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAccent } from "@/components/providers/AccentProvider";

export function TeamAccentSettings() {
  const { presetId, setPresetId, presets, hydrated } = useAccent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team colour</CardTitle>
        <CardDescription>
          The app stays on a black base; this colour is used for highlights, buttons, and the tactical board tint.
          Pick what matches your club kit or training bibs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {presets.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  active
                    ? "border-accent bg-accent/10 shadow-glow"
                    : "border-surface-border bg-surface-raised/40 hover:border-zinc-600"
                )}
              >
                <span
                  className="h-10 w-10 rounded-full border-2 border-white/20 shadow-inner"
                  style={{ backgroundColor: `rgb(${p.rgb.join(",")})` }}
                  aria-hidden
                />
                <span className={cn("text-xs font-medium", active ? "text-accent" : "text-zinc-400")}>{p.label}</span>
              </button>
            );
          })}
        </div>
        {!hydrated && <p className="mt-3 text-xs text-zinc-600">Loading your saved colour…</p>}
        <p className="mt-4 text-xs text-zinc-600">Saved on this device only until accounts sync to the cloud.</p>
      </CardContent>
    </Card>
  );
}
