"use client";

import { useEffect, useState } from "react";
import type { MatchFixture } from "@/types";
import type { NewFixtureInput } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function FixtureFormModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewFixtureInput) => void;
  initial?: MatchFixture | null;
}) {
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [kickoffLocal, setKickoffLocal] = useState("");
  const [venue, setVenue] = useState<"home" | "away">("home");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setOpponent(initial.opponent);
      setCompetition(initial.competition);
      const d = new Date(initial.kickoff);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setKickoffLocal(d.toISOString().slice(0, 16));
      setVenue(initial.venue);
      setNotes(initial.notes ?? "");
    } else {
      setOpponent("");
      setCompetition("");
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setKickoffLocal(d.toISOString().slice(0, 16));
      setVenue("home");
      setNotes("");
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = () => {
    const o = opponent.trim();
    const c = competition.trim();
    if (!o || !c || !kickoffLocal) return;
    onSave({
      opponent: o,
      competition: c,
      kickoff: new Date(kickoffLocal).toISOString(),
      venue,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-[#0f1419] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-white">
          {initial ? "Edit fixture" : "Add fixture"}
        </h3>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="fx-opp">
              Opponent
            </label>
            <Input id="fx-opp" value={opponent} onChange={(e) => setOpponent(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="fx-comp">
              Competition
            </label>
            <Input
              id="fx-comp"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="mt-1"
              placeholder="League or cup name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="fx-when">
              Kick-off
            </label>
            <Input
              id="fx-when"
              type="datetime-local"
              value={kickoffLocal}
              onChange={(e) => setKickoffLocal(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Venue</label>
            <div className="mt-2 flex gap-2">
              {(["home", "away"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVenue(v)}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm font-medium capitalize",
                    venue === v ? "bg-accent/15 text-accent" : "bg-surface-raised text-zinc-400"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="fx-notes">
              Notes (optional)
            </label>
            <textarea
              id="fx-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={!opponent.trim() || !competition.trim() || !kickoffLocal}>
            {initial ? "Save" : "Add fixture"}
          </Button>
        </div>
      </div>
    </div>
  );
}
