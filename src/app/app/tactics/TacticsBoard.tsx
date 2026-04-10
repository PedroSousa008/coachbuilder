"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormationId, PitchPlayer, Player, Tactic, TacticMatch } from "@/types";
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
import { playerEligibleForTacticsSlot } from "@/lib/tactics-slot-positions";
import { lastMatchesSorted, tallyForTactic, winRatePercent } from "@/lib/tactics-match-stats";
import { PlayerTacticInsightModal } from "@/components/tactics/PlayerTacticInsightModal";
import { TacticMatchEditorModal } from "@/components/tactics/TacticMatchEditorModal";

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

function noteKey(tacticId: string, playerId: string) {
  return `${tacticId}::${playerId}`;
}

export function TacticsBoard() {
  const {
    players: roster,
    savedTactics: tactics,
    upsertTactic,
    deleteTactic,
    hydrated,
    tacticMatches,
    upsertTacticMatch,
    removeTacticMatch,
    tacticPlayerNotes,
    setTacticPlayerAnalysisNote,
  } = useAppData();
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
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightSlot, setInsightSlot] = useState<PitchPlayer | null>(null);
  const [matchEditorOpen, setMatchEditorOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<TacticMatch | null>(null);

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
    setPickerOpen(false);
    setPickerSlotId(null);
  };

  const openPickerForSlot = (slot: PitchPlayer) => {
    setPickerSlotId(slot.id);
    setPickerOpen(true);
  };

  const handleSlotTap = (slot: PitchPlayer) => {
    if (slot.playerId) {
      setInsightSlot(slot);
      setInsightOpen(true);
      return;
    }
    openPickerForSlot(slot);
  };

  const pickerSlot = useMemo(
    () => (pickerSlotId ? players.find((s) => s.id === pickerSlotId) ?? null : null),
    [pickerSlotId, players]
  );

  const pickerPlayers = useMemo(() => {
    if (!pickerSlot) return roster;
    const usedElsewhere = new Set(
      players.filter((s) => s.id !== pickerSlot.id && s.playerId).map((s) => s.playerId as string)
    );
    return roster.filter(
      (p) => !usedElsewhere.has(p.id) && playerEligibleForTacticsSlot(pickerSlot.formationLabel, p)
    );
  }, [roster, players, pickerSlot]);

  const pickerTitle = pickerSlot
    ? `Assign ${pickerSlot.formationLabel}`
    : "Assign player to position";

  const pickerEmptyHint =
    roster.length === 0
      ? "Add players from Team → Add player, then return here."
      : "No players available for this position, or they are already placed on another slot.";

  const assignPlayerToSlot = (player: Player) => {
    if (!pickerSlotId || !pickerSlot) return;
    if (!playerEligibleForTacticsSlot(pickerSlot.formationLabel, player)) return;
    const usedElsewhere = players.some(
      (s) => s.id !== pickerSlotId && s.playerId && s.playerId === player.id
    );
    if (usedElsewhere) return;
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

  const allSlotsFilled = players.length === 11 && players.every((p) => p.playerId);

  const handleSave = () => {
    if (!allSlotsFilled) return;
    const id = activeId === DRAFT_ID ? newTacticId() : active.id;
    const tally = tallyForTactic(tacticMatches, id);
    const tactic: Tactic = {
      id,
      name: name.trim() || "Formação",
      formation: safeFormationId(formation),
      opponent: opponent.trim(),
      notes,
      matchesUsed: tally.matchesUsed,
      wins: tally.wins,
      losses: tally.losses,
      draws: tally.draws,
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

  const record = useMemo(() => tallyForTactic(tacticMatches, active.id), [tacticMatches, active.id]);
  const winRate = winRatePercent(record.wins, record.matchesUsed);
  const isDraft = active.id === DRAFT_ID;

  const matchesForActive = useMemo(
    () => lastMatchesSorted(tacticMatches.filter((m) => m.tacticId === active.id)),
    [tacticMatches, active.id]
  );

  const lineupPlayerIds = useMemo(
    () => players.map((s) => s.playerId).filter(Boolean) as string[],
    [players]
  );

  const insightPlayer = insightSlot?.playerId ? roster.find((p) => p.id === insightSlot.playerId) ?? null : null;
  const insightTacticId = !isDraft ? active.id : null;
  const insightNotesInitial =
    insightTacticId && insightSlot?.playerId
      ? (tacticPlayerNotes[noteKey(insightTacticId, insightSlot.playerId)]?.notes ?? "")
      : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 lg:space-y-0">
      <PlayerPickerModal
        open={pickerOpen}
        title={pickerTitle}
        players={pickerPlayers}
        onClose={() => {
          setPickerOpen(false);
          setPickerSlotId(null);
        }}
        onSelect={assignPlayerToSlot}
        onClear={pickerSlotId ? clearSlot : undefined}
        emptyHint={pickerEmptyHint}
      />

      <PlayerTacticInsightModal
        open={insightOpen}
        slot={insightSlot}
        player={insightPlayer}
        tacticId={insightTacticId}
        tacticMatches={tacticMatches}
        initialAnalysisNotes={insightNotesInitial}
        onClose={() => {
          setInsightOpen(false);
          setInsightSlot(null);
        }}
        onSaveAnalysis={(text) => {
          if (insightTacticId && insightSlot?.playerId) {
            setTacticPlayerAnalysisNote(insightTacticId, insightSlot.playerId, text);
          }
        }}
        onChangePlayer={() => {
          const s = insightSlot;
          setInsightOpen(false);
          setInsightSlot(null);
          if (s) openPickerForSlot(s);
        }}
      />

      {!isDraft ? (
        <TacticMatchEditorModal
          open={matchEditorOpen}
          tacticId={active.id}
          roster={roster}
          suggestedPlayerIds={lineupPlayerIds}
          existing={editingMatch}
          onClose={() => {
            setMatchEditorOpen(false);
            setEditingMatch(null);
          }}
          onSave={upsertTacticMatch}
          onDelete={removeTacticMatch}
        />
      ) : null}

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
              <Button type="button" variant="primary" size="sm" onClick={handleSave} className="min-w-[7rem]">
                Guardar equipa
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
          onSlotTap={handleSlotTap}
          className="max-h-[min(70vh,640px)]"
        />

        {!isDraft ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Registo de jogos</CardTitle>
                <p className="mt-1 text-xs text-zinc-500">
                  Resultados, marcadores e assistências — atualizam estatísticas em toda a app.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingMatch(null);
                  setMatchEditorOpen(true);
                }}
              >
                + Jogo
              </Button>
            </CardHeader>
            <CardContent>
              {matchesForActive.length === 0 ? (
                <p className="text-sm text-zinc-500">Ainda não há jogos registados para esta tática.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {matchesForActive.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMatch(m);
                          setMatchEditorOpen(true);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised/40 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-600"
                      >
                        <span className="text-zinc-200">
                          {new Date(m.date).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {m.opponent}
                        </span>
                        <span className="shrink-0 font-semibold text-white">
                          {m.teamGoals}–{m.opponentGoals}
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            {m.outcome === "win" ? "V" : m.outcome === "loss" ? "D" : "E"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

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
            <p className="text-xs text-zinc-500">
              {isDraft
                ? "Guarda a equipa para registar jogos e ver vitórias e % aqui."
                : "Baseado nos jogos registados para esta tática."}
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Jogos</p>
              <p className="mt-1 text-lg font-semibold text-white">{record.matchesUsed}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">% vitórias</p>
              <p className="mt-1 text-lg font-semibold text-accent">{winRate}%</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Vitórias</p>
              <p className="mt-1 text-lg font-semibold text-accent">{record.wins}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Empates</p>
              <p className="mt-1 text-lg font-semibold text-zinc-300">{record.draws}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-zinc-900/60 p-3 text-center">
              <p className="text-[10px] uppercase text-zinc-500">Derrotas</p>
              <p className="mt-1 text-lg font-semibold text-red-400/90">{record.losses}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Saved tactics</p>
          {tactics.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border px-3 py-6 text-center text-xs text-zinc-500">
              No saved tactics yet. Fill all 11 positions and tap Guardar equipa.
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
