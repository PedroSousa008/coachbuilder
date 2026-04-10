"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormationId, PitchPlayer, Player, Tactic } from "@/types";
import {
  FORMATION_LAYOUTS,
  formationDisplayLabel,
  MORE_FORMATION_IDS,
  PRIMARY_FORMATION_IDS,
} from "@/data/formations";
import { FootballPitch } from "@/components/tactics/FootballPitch";
import { TacticCard } from "@/components/tactics/TacticCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { useAppData } from "@/contexts/AppDataContext";

const DRAFT_ID = "draft";

function safeFormationId(f: FormationId | string): FormationId {
  return f in FORMATION_LAYOUTS ? (f as FormationId) : "4-3-3";
}

function newTacticId() {
  return `tactic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePitchPlayers(ps: PitchPlayer[]): PitchPlayer[] {
  return ps.map((p) => ({
    ...p,
    formationLabel: p.formationLabel ?? p.label,
    playerId: p.playerId ?? null,
    playerName: p.playerName ?? null,
  }));
}

function clonePlayers(formation: FormationId, prefix: string): PitchPlayer[] {
  return FORMATION_LAYOUTS[formation].map((p, i) => ({
    ...p,
    id: `${prefix}-live-${i}`,
    playerName: null,
  }));
}

function buildDraftTactic(): Tactic {
  return {
    id: DRAFT_ID,
    name: "",
    formation: "4-3-3",
    opponent: "",
    notes: "",
    matchesUsed: 0,
    wins: 0,
    losses: 0,
    players: clonePlayers("4-3-3", DRAFT_ID),
    updatedAt: new Date().toISOString(),
  };
}

export function TacticsBoard() {
  const { players: roster, savedTactics: tactics, upsertTactic, deleteTactic, hydrated } = useAppData();
  const draftTactic = useMemo(() => buildDraftTactic(), []);
  const [activeId, setActiveId] = useState<string>(() => DRAFT_ID);

  const active = useMemo(() => {
    const saved = tactics.find((t) => t.id === activeId);
    if (saved) return saved;
    if (activeId === DRAFT_ID) return draftTactic;
    return tactics[0] ?? draftTactic;
  }, [tactics, activeId, draftTactic]);

  const initialSnapshot = tactics[0] ?? draftTactic;
  const [name, setName] = useState(() => initialSnapshot.name);
  const [opponent, setOpponent] = useState(() => initialSnapshot.opponent);
  const [notes, setNotes] = useState(() => initialSnapshot.notes);
  const [formation, setFormation] = useState<FormationId>(() => safeFormationId(initialSnapshot.formation));
  const [players, setPlayers] = useState<PitchPlayer[]>(() => normalizePitchPlayers(initialSnapshot.players));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [moreFormationsOpen, setMoreFormationsOpen] = useState(false);

  const syncFromTactic = useCallback((t: Tactic) => {
    setName(t.name);
    setOpponent(t.opponent);
    setNotes(t.notes);
    setFormation(safeFormationId(t.formation));
    setPlayers(normalizePitchPlayers(t.players));
  }, []);

  const selectTactic = (t: Tactic) => {
    setActiveId(t.id);
    syncFromTactic(t);
  };

  const applyFormation = (f: FormationId) => {
    if (!FORMATION_LAYOUTS[f]) return;
    setFormation(f);
    setPlayers(clonePlayers(f, active.id));
  };

  const openPickerForSlot = (slot: PitchPlayer) => {
    setPickerSlotId(slot.id);
    setPickerOpen(true);
  };

  const assignPlayerToSlot = (player: Player) => {
    if (!pickerSlotId) return;
    setPlayers((prev) =>
      prev.map((s) =>
        s.id === pickerSlotId
          ? {
              ...s,
              playerId: player.id,
              label: String(player.number),
              playerName: player.name.trim(),
            }
          : s
      )
    );
    setPickerSlotId(null);
  };

  const clearSlot = () => {
    if (!pickerSlotId) return;
    setPlayers((prev) =>
      prev.map((s) =>
        s.id === pickerSlotId
          ? {
              ...s,
              playerId: null,
              label: s.formationLabel,
              playerName: null,
            }
          : s
      )
    );
    setPickerSlotId(null);
  };

  const allSlotsFilled = players.length > 0 && players.every((p) => p.playerId);

  const handleSave = () => {
    if (!allSlotsFilled) return;
    const id = activeId === DRAFT_ID ? newTacticId() : active.id;
    const tactic: Tactic = {
      id,
      name: name.trim() || "Formação",
      formation: safeFormationId(formation),
      opponent: opponent.trim(),
      notes,
      matchesUsed: active.matchesUsed,
      wins: active.wins,
      losses: active.losses,
      players,
      updatedAt: new Date().toISOString(),
    };
    upsertTactic(tactic);
    setActiveId(id);
    syncFromTactic(tactic);
  };

  const handleDeleteTactic = (id: string) => {
    deleteTactic(id);
    if (activeId === id) {
      const fresh = buildDraftTactic();
      setActiveId(DRAFT_ID);
      syncFromTactic(fresh);
    }
  };

  const denom = active.wins + active.losses;
  const winRate = denom > 0 ? Math.round((active.wins / denom) * 100) : 0;
  const isDraft = active.id === DRAFT_ID;

  return (
    <div className="mx-auto max-w-7xl space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 lg:space-y-0">
      <PlayerPickerModal
        open={pickerOpen}
        title="Assign player to position"
        players={roster}
        onClose={() => {
          setPickerOpen(false);
          setPickerSlotId(null);
        }}
        onSelect={assignPlayerToSlot}
        onClear={pickerSlotId ? clearSlot : undefined}
        emptyHint="Add players from Team → Add player, then return here."
      />

      <div className="space-y-6">
        {isDraft && tactics.length === 0 && hydrated && (
          <p className="rounded-xl border border-dashed border-surface-border bg-surface-raised/40 px-4 py-3 text-sm text-zinc-400">
            Tap a position on the pitch to link someone from your roster. Drag chips to fine-tune positions.
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500" htmlFor="tname">
                Tactic name
              </label>
              <input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="e.g. vs Riverside — high press"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500" htmlFor="opp">
                Opponent
              </label>
              <input
                id="opp"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Opponent name"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRIMARY_FORMATION_IDS.map((f) => (
              <Button
                key={f}
                type="button"
                variant={formation === f ? "primary" : "secondary"}
                size="sm"
                onClick={() => applyFormation(f)}
              >
                {formationDisplayLabel(f)}
              </Button>
            ))}
            <button
              type="button"
              onClick={() => setMoreFormationsOpen(true)}
              title="More formations"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                MORE_FORMATION_IDS.includes(formation)
                  ? "border-accent/60 bg-accent/15 text-accent shadow-glow"
                  : "border-surface-border bg-surface-raised text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              More
            </button>
            {allSlotsFilled && (
              <Button type="button" variant="primary" size="sm" onClick={handleSave} className="min-w-[5.5rem]">
                Guardar
              </Button>
            )}
          </div>

          {moreFormationsOpen && (
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
              role="dialog"
              aria-modal
              aria-labelledby="more-formations-title"
              onClick={() => setMoreFormationsOpen(false)}
            >
              <div
                className="max-h-[min(85vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                  <h3 id="more-formations-title" className="text-sm font-semibold text-white">
                    Formations
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMoreFormationsOpen(false)}
                    className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white/5 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-[min(70vh,480px)] overflow-y-auto p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MORE_FORMATION_IDS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          applyFormation(f);
                          setMoreFormationsOpen(false);
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-colors ${
                          formation === f
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-surface-border bg-surface-raised/60 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        {formationDisplayLabel(f)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <FootballPitch
          players={players}
          roster={roster}
          onPlayersChange={setPlayers}
          onSlotTap={openPickerForSlot}
          className="max-h-[min(70vh,640px)]"
        />

        <Card>
          <CardHeader>
            <CardTitle>Match strategy notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-xl border border-surface-border bg-surface-raised/80 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Rest defence, set pieces, pressing triggers, build-up rules..."
            />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
            <p className="text-xs text-zinc-500">Log match results to see wins and win rate here.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Matches</p>
              <p className="mt-1 text-lg font-semibold text-white">{active.matchesUsed}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Win rate</p>
              <p className="mt-1 text-lg font-semibold text-accent">{winRate}%</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Wins</p>
              <p className="mt-1 text-lg font-semibold text-accent">{active.wins}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Losses</p>
              <p className="mt-1 text-lg font-semibold text-red-400/90">{active.losses}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Saved tactics</p>
          {tactics.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border px-3 py-6 text-center text-xs text-zinc-500">
              No saved tactics yet. Fill every position and tap Guardar.
            </p>
          ) : (
            <div className="flex max-h-[min(50vh,420px)] flex-col gap-2 overflow-y-auto pr-1">
              {tactics.map((t) => (
                <TacticCard
                  key={t.id}
                  tactic={t}
                  active={t.id === active.id}
                  onSelect={() => selectTactic(t)}
                  onDelete={() => handleDeleteTactic(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
