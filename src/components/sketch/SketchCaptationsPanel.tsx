"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  GitCompare,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import type {
  FormationId,
  PitchPlayer,
  Player,
  Position,
  PreferredFoot,
  SketchScoutingObservationStatus,
  SketchScoutingProfile,
  SketchScoutingBoardState,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { FootballPitch } from "@/components/tactics/FootballPitch";
import {
  FORMATION_LAYOUTS,
  formationDisplayLabel,
  MORE_FORMATION_IDS,
  PRIMARY_FORMATION_IDS,
} from "@/data/formations";
import { playerEligibleForTacticsSlot } from "@/lib/tactics-slot-positions";
import { formatPlayerPositions, primaryPositionFromList } from "@/lib/player-positions";
import { computeAgeFromDateOfBirth } from "@/lib/player-age";
import { imageFileToCompressedJpegDataUrl } from "@/lib/profile-avatar-compress";
import { cn } from "@/lib/utils";
import {
  cloneFormationPitchPlayers,
  createDefaultScoutingProfile,
  daysSinceObservation,
  emptyScoutingBoard,
  scoutingAttributeLabelPt,
  scoutingProfilePillars,
  scoutingProfileToPickerPlayer,
  SCOUTING_MENTAL_KEYS,
  SCOUTING_PHYSICAL_KEYS,
  SCOUTING_STATUS_LABELS_PT,
  SCOUTING_TACTICAL_KEYS,
  SCOUTING_TECHNIQUE_KEYS,
  squadPlayerComparablePillars,
  TACTICAL_ROLE_PRESETS_PT,
} from "@/lib/sketch-scouting";

const ALL_POSITIONS: Position[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

const POS_SHORT: Record<Position, string> = {
  GK: "GR",
  CB: "DC",
  LB: "LE",
  RB: "LD",
  CDM: "MCD",
  CM: "MC",
  CAM: "MO",
  LW: "EE",
  RW: "ED",
  ST: "PL",
};

const BIRTH_MONTHS_PT: { value: string; label: string }[] = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function parseStoredDob(iso?: string): { d: string; m: string; y: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return { d: "", m: "", y: "" };
  return { y: iso.slice(0, 4), m: iso.slice(5, 7), d: iso.slice(8, 10) };
}

function tryIsoFromParts(d: string, m: string, y: string): string | undefined {
  const di = Number(d);
  const mi = Number(m);
  const yi = Number(y);
  if (!Number.isFinite(di) || !Number.isFinite(mi) || !Number.isFinite(yi)) return undefined;
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return undefined;
  const maxY = new Date().getFullYear();
  if (yi < 1920 || yi > maxY) return undefined;
  const dt = new Date(yi, mi - 1, di);
  if (dt.getFullYear() !== yi || dt.getMonth() !== mi - 1 || dt.getDate() !== di) return undefined;
  return `${String(yi).padStart(4, "0")}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`;
}

function ScoutingDobTriplet({
  storedIso,
  onCommit,
}: {
  storedIso?: string;
  onCommit: (iso: string | undefined) => void;
}) {
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");

  useEffect(() => {
    const p = parseStoredDob(storedIso);
    setD(p.d);
    setM(p.m);
    setY(p.y);
  }, [storedIso]);

  const push = (nextD: string, nextM: string, nextY: string) => {
    setD(nextD);
    setM(nextM);
    setY(nextY);
    if (!nextD.trim() && !nextM.trim() && !nextY.trim()) {
      onCommit(undefined);
      return;
    }
    const iso = tryIsoFromParts(nextD.trim(), nextM.trim(), nextY.trim());
    if (iso) onCommit(iso);
  };

  const age = storedIso ? computeAgeFromDateOfBirth(storedIso) : null;
  const invalidFilled = Boolean(d.trim() && m.trim() && y.trim() && !tryIsoFromParts(d.trim(), m.trim(), y.trim()));

  return (
    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
      <div className="text-xs text-zinc-500">Data de nascimento</div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[5rem] flex-1">
          <label className="text-[10px] text-zinc-500">Dia</label>
          <Input
            inputMode="numeric"
            autoComplete="bday-day"
            placeholder="Dia"
            maxLength={2}
            className="mt-0.5"
            value={d}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
              push(raw, m, y);
            }}
          />
        </div>
        <div className="min-w-[9rem] flex-[1.25]">
          <label className="text-[10px] text-zinc-500">Mês</label>
          <select
            className="mt-0.5 h-10 w-full rounded-lg border border-surface-border bg-surface-raised px-2 text-sm text-white"
            value={m}
            onChange={(e) => push(d, e.target.value, y)}
          >
            <option value="">—</option>
            {BIRTH_MONTHS_PT.map((mo) => (
              <option key={mo.value} value={mo.value}>
                {mo.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[5.5rem] flex-1">
          <label className="text-[10px] text-zinc-500">Ano</label>
          <Input
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="Ano"
            maxLength={4}
            className="mt-0.5"
            value={y}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
              push(d, m, raw);
            }}
          />
        </div>
        <p className="pb-2 text-sm tabular-nums text-zinc-300">
          Idade: <span className="font-medium text-white">{age != null ? age : "—"}</span>
        </p>
      </div>
      {invalidFilled ? (
        <p className="text-[11px] text-amber-200/90">Esta combinação dia/mês/ano não é válida no calendário.</p>
      ) : null}
    </div>
  );
}

function safeFormationId(f: FormationId | string): FormationId {
  return f in FORMATION_LAYOUTS ? (f as FormationId) : "4-3-3";
}

function noteUid() {
  return `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase();
}

function statusBadgeClass(s: SketchScoutingObservationStatus) {
  switch (s) {
    case "priority":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "analyzing":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "interested":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "rejected":
      return "border-zinc-600 bg-zinc-800/80 text-zinc-400";
    case "signed":
      return "border-violet-500/40 bg-violet-500/15 text-violet-200";
    default:
      return "border-zinc-600 bg-zinc-800/60 text-zinc-300";
  }
}

function AttrBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(99, Math.round(value)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-zinc-300">{v}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-900/80 via-emerald-500/70 to-teal-400/80 transition-[width] duration-500 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function PillarMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 px-3 py-2 text-center shadow-inner">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

type CompareSide = { kind: "scout" | "squad"; id: string } | null;

function radarPolygon(values: number[], cx: number, cy: number, r: number): string {
  const n = values.length;
  if (!n) return "";
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, values[i]! / 99));
    const ang = (-Math.PI / 2 + (i * 2 * Math.PI) / n) % (2 * Math.PI);
    const x = cx + r * v * Math.cos(ang);
    const y = cy + r * v * Math.sin(ang);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function CompareRadar({
  labels,
  aVals,
  bVals,
}: {
  labels: string[];
  aVals: number[];
  bVals: number[];
}) {
  const cx = 90;
  const cy = 90;
  const r = 72;
  const grid = [0.25, 0.5, 0.75, 1].map((g) => (
    <polygon
      key={g}
      fill="none"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth={1}
      points={labels
        .map((_, i) => {
          const ang = (-Math.PI / 2 + (i * 2 * Math.PI) / labels.length) % (2 * Math.PI);
          const x = cx + r * g * Math.cos(ang);
          const y = cy + r * g * Math.sin(ang);
          return `${x},${y}`;
        })
        .join(" ")}
    />
  ));
  return (
    <svg viewBox="0 0 180 180" className="mx-auto h-48 w-full max-w-[220px] text-zinc-500">
      {grid}
      {labels.map((_, i) => {
        const ang = (-Math.PI / 2 + (i * 2 * Math.PI) / labels.length) % (2 * Math.PI);
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        );
      })}
      <polygon
        fill="rgba(16,185,129,0.12)"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.5}
        points={radarPolygon(aVals, cx, cy, r)}
      />
      <polygon
        fill="rgba(251,191,36,0.08)"
        stroke="rgba(251,191,36,0.85)"
        strokeWidth={1.5}
        points={radarPolygon(bVals, cx, cy, r)}
      />
    </svg>
  );
}

export function SketchCaptationsPanel() {
  const { players: roster, sketchArea, setSketchArea } = useAppData();
  const profiles = sketchArea.scoutingProfiles ?? [];
  const board = sketchArea.scoutingBoard ?? emptyScoutingBoard("4-3-3");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fPos, setFPos] = useState<"" | Position>("");
  const [fStatus, setFStatus] = useState<"" | SketchScoutingObservationStatus>("");
  const [fFoot, setFFoot] = useState<"" | PreferredFoot>("");
  const [fAgeMin, setFAgeMin] = useState("");
  const [fAgeMax, setFAgeMax] = useState("");
  const [fCat, setFCat] = useState("");
  const [fMinOverall, setFMinOverall] = useState("");

  const [newObs, setNewObs] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [sideA, setSideA] = useState<CompareSide>(null);
  const [sideB, setSideB] = useState<CompareSide>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [moreFormationsOpen, setMoreFormationsOpen] = useState(false);

  const [formation, setFormation] = useState<FormationId>(() => safeFormationId(board.formation));
  const [pitchPlayers, setPitchPlayers] = useState<PitchPlayer[]>(() => board.players);

  useEffect(() => {
    setFormation(safeFormationId(board.formation));
    setPitchPlayers(board.players);
  }, [board.formation, board.updatedAt]);

  const selected = useMemo(
    () => (selectedId ? profiles.find((p) => p.id === selectedId) ?? null : null),
    [profiles, selectedId]
  );

  const filteredProfiles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const amin = fAgeMin.trim() ? Number(fAgeMin) : null;
    const amax = fAgeMax.trim() ? Number(fAgeMax) : null;
    const minOv = fMinOverall.trim() ? Number(fMinOverall) : null;
    return profiles.filter((p) => {
      if (t) {
        const hay = `${p.fullName} ${p.currentClub ?? ""} ${formatPlayerPositions(scoutingProfileToPickerPlayer(p))}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (fPos && !p.positions.includes(fPos)) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fFoot && p.preferredFoot !== fFoot) return false;
      if (fCat.trim() && !(p.ageCategory ?? "").toLowerCase().includes(fCat.trim().toLowerCase())) return false;
      const age = p.dateOfBirth ? computeAgeFromDateOfBirth(p.dateOfBirth) : null;
      if (amin != null && Number.isFinite(amin) && (age == null || age < amin)) return false;
      if (amax != null && Number.isFinite(amax) && (age == null || age > amax)) return false;
      if (minOv != null && Number.isFinite(minOv) && scoutingProfilePillars(p).overall < minOv) return false;
      return true;
    });
  }, [profiles, q, fPos, fStatus, fFoot, fAgeMin, fAgeMax, fCat, fMinOverall]);

  const priorityWatchlist = useMemo(
    () => profiles.filter((p) => p.status === "priority" || p.watchlistPriority),
    [profiles]
  );

  const alerts = useMemo(() => {
    const out: string[] = [];
    for (const p of profiles) {
      if (p.status !== "priority") continue;
      const d = daysSinceObservation(p);
      if (d == null || d > 10) {
        out.push(`${p.fullName}: prioridade sem observação recente (${d == null ? "nunca" : `${d} d`}).`);
      }
    }
    return out.slice(0, 6);
  }, [profiles]);

  const patchBoard = useCallback(
    (next: SketchScoutingBoardState) => {
      setSketchArea((s) => ({
        ...s,
        scoutingBoard: { ...next, updatedAt: new Date().toISOString() },
      }));
    },
    [setSketchArea]
  );

  const applyFormation = useCallback(
    (f: FormationId) => {
      if (!FORMATION_LAYOUTS[f]) return;
      setFormation(f);
      const fresh = cloneFormationPitchPlayers(f);
      setPitchPlayers(fresh);
      patchBoard({ formation: f, players: fresh, updatedAt: new Date().toISOString() });
      setPickerOpen(false);
      setPickerSlotId(null);
      setMoreFormationsOpen(false);
    },
    [patchBoard]
  );

  const persistPitchPlayers = useCallback(
    (next: PitchPlayer[]) => {
      setPitchPlayers(next);
      patchBoard({ formation, players: next, updatedAt: new Date().toISOString() });
    },
    [formation, patchBoard]
  );

  const scoutingAsPlayers = useMemo(() => profiles.map(scoutingProfileToPickerPlayer), [profiles]);

  const pickerSlot = useMemo(
    () => (pickerSlotId ? pitchPlayers.find((s) => s.id === pickerSlotId) ?? null : null),
    [pickerSlotId, pitchPlayers]
  );

  const pickerPlayers = useMemo(() => {
    if (!pickerSlot) return [...roster, ...scoutingAsPlayers];
    const usedElsewhere = new Set(
      pitchPlayers.filter((s) => s.id !== pickerSlot.id && s.playerId).map((s) => s.playerId as string)
    );
    const merged = [...roster, ...scoutingAsPlayers];
    return merged.filter(
      (p) => !usedElsewhere.has(p.id) && playerEligibleForTacticsSlot(pickerSlot.formationLabel, p)
    );
  }, [roster, scoutingAsPlayers, pitchPlayers, pickerSlot]);

  const openPickerForSlot = (slot: PitchPlayer) => {
    setPickerSlotId(slot.id);
    setPickerOpen(true);
  };

  const assignPlayerToSlot = (player: Player) => {
    if (!pickerSlotId || !pickerSlot) return;
    if (!playerEligibleForTacticsSlot(pickerSlot.formationLabel, player)) return;
    const usedElsewhere = pitchPlayers.some(
      (s) => s.id !== pickerSlotId && s.playerId && s.playerId === player.id
    );
    if (usedElsewhere) return;
    const label = player.number > 0 ? String(player.number) : initials(player.name);
    persistPitchPlayers(
      pitchPlayers.map((s) =>
        s.id === pickerSlotId
          ? { ...s, playerId: player.id, label, playerName: player.name.trim() }
          : s
      )
    );
    setPickerSlotId(null);
    setPickerOpen(false);
  };

  const clearSlot = () => {
    if (!pickerSlotId) return;
    persistPitchPlayers(
      pitchPlayers.map((s) =>
        s.id === pickerSlotId
          ? { ...s, playerId: null, label: s.formationLabel, playerName: null }
          : s
      )
    );
    setPickerSlotId(null);
    setPickerOpen(false);
  };

  const addProfile = () => {
    const p = createDefaultScoutingProfile();
    setSketchArea((s) => ({
      ...s,
      scoutingProfiles: [...(s.scoutingProfiles ?? []), p],
    }));
    setSelectedId(p.id);
  };

  const deleteProfile = (id: string) => {
    setSketchArea((s) => ({
      ...s,
      scoutingProfiles: (s.scoutingProfiles ?? []).filter((x) => x.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  };

  const updateProfile = (id: string, patch: Partial<SketchScoutingProfile>) => {
    setSketchArea((s) => ({
      ...s,
      scoutingProfiles: (s.scoutingProfiles ?? []).map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      ),
    }));
  };

  const resolveCompare = useCallback(
    (side: CompareSide) => {
      if (!side) return null;
      if (side.kind === "scout") {
        const p = profiles.find((x) => x.id === side.id);
        return p ? { type: "scout" as const, profile: p, pillars: scoutingProfilePillars(p) } : null;
      }
      const pl = roster.find((x) => x.id === side.id);
      return pl ? { type: "squad" as const, player: pl, pillars: squadPlayerComparablePillars(pl) } : null;
    },
    [profiles, roster]
  );

  const cmpA = resolveCompare(sideA);
  const cmpB = resolveCompare(sideB);

  const titularMatch = useMemo(() => {
    if (!selected) return null;
    const pos = primaryPositionFromList(selected.positions);
    return roster.find((p) => primaryPositionFromList(p.positions ?? [p.position]) === pos) ?? roster[0] ?? null;
  }, [selected, roster]);

  const recommendations = useMemo(() => {
    if (!selected) return [];
    const pill = scoutingProfilePillars(selected);
    const lines: string[] = [];
    if (pill.tactical >= pill.technical && pill.tactical >= pill.physical) {
      lines.push("Perfil com peso tático — valoriza leitura e posicionamento no teu modelo.");
    }
    if (pill.physical >= 75) lines.push("Base física forte para ritmos intensos e transições.");
    if (pill.mental >= 75) lines.push("Mental competitivo: útil em momentos decisivos e mudanças de estado.");
    if (selected.tacticalRoleTags.length) {
      lines.push(`Encaixe sugerido: ${selected.tacticalRoleTags.slice(0, 3).join(", ")}.`);
    }
    if (pill.technical < 60) lines.push("Área técnica com margem — cruzar com vídeo-análise no último terço.");
    return lines.slice(0, 5);
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-white/5 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400/90">
            <UserRoundSearch className="h-5 w-5" strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Captações</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-white">Centro de scouting</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Observação estruturada, comparação com o plantel e encaixe táctico no mesmo espaço de trabalho.
          </p>
        </div>
        <Button type="button" variant="primary" className="gap-2 shrink-0" onClick={addProfile}>
          <Plus className="h-4 w-4" />
          Adicionar observado
        </Button>
      </div>

      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <span className="font-semibold text-amber-200">Alertas</span>
            {alerts.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        {/* 1 — Lista */}
        <Card className="border-white/10 bg-zinc-950/40 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jogadores observados</CardTitle>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="mt-2" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={fPos}
                onChange={(e) => setFPos(e.target.value as Position | "")}
                className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-xs text-white"
              >
                <option value="">Posição</option>
                {ALL_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {POS_SHORT[p]}
                  </option>
                ))}
              </select>
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as SketchScoutingObservationStatus | "")}
                className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-xs text-white"
              >
                <option value="">Estado</option>
                {(Object.keys(SCOUTING_STATUS_LABELS_PT) as SketchScoutingObservationStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {SCOUTING_STATUS_LABELS_PT[k]}
                  </option>
                ))}
              </select>
              <select
                value={fFoot}
                onChange={(e) => setFFoot(e.target.value as PreferredFoot | "")}
                className="h-9 rounded-lg border border-surface-border bg-surface-raised px-2 text-xs text-white"
              >
                <option value="">Pé</option>
                <option value="right">Direito</option>
                <option value="left">Esquerdo</option>
                <option value="both">Ambos</option>
              </select>
              <Input
                value={fCat}
                onChange={(e) => setFCat(e.target.value)}
                placeholder="Escalão (texto)"
                className="h-9 text-xs"
              />
              <Input
                value={fAgeMin}
                onChange={(e) => setFAgeMin(e.target.value)}
                placeholder="Idade min"
                className="h-9 text-xs"
                inputMode="numeric"
              />
              <Input
                value={fAgeMax}
                onChange={(e) => setFAgeMax(e.target.value)}
                placeholder="Idade máx"
                className="h-9 text-xs"
                inputMode="numeric"
              />
              <Input
                value={fMinOverall}
                onChange={(e) => setFMinOverall(e.target.value)}
                placeholder="Nota mín."
                className="h-9 text-xs col-span-2"
                inputMode="numeric"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[min(70vh,560px)] space-y-2 overflow-y-auto pr-1">
            {filteredProfiles.length === 0 ? (
              <p className="text-sm text-zinc-500">Sem resultados. Ajusta filtros ou adiciona um perfil.</p>
            ) : (
              filteredProfiles.map((p) => {
                const age = p.dateOfBirth ? computeAgeFromDateOfBirth(p.dateOfBirth) : null;
                const pill = scoutingProfilePillars(p);
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "flex w-full gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                      active
                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                        : "border-white/5 bg-zinc-900/40 hover:border-emerald-500/25 hover:bg-zinc-900/70 hover:shadow-md"
                    )}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" src={p.photoUrl} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                          {initials(p.fullName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-medium text-white">{p.fullName}</span>
                        <span className="shrink-0 font-mono text-[11px] text-emerald-300/90">{pill.overall}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                        <span>{age != null ? `${age}a` : "—"}</span>
                        <span>·</span>
                        <span>{p.heightCm ? `${p.heightCm} cm` : "—"}</span>
                        <span>·</span>
                        <span>{p.weightKg ? `${p.weightKg} kg` : "—"}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {p.positions.map((x) => POS_SHORT[x]).join(" / ")} · {p.currentClub?.trim() || "Clube —"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge className={cn("text-[10px]", statusBadgeClass(p.status))}>
                          {SCOUTING_STATUS_LABELS_PT[p.status]}
                        </Badge>
                        {p.watchlistPriority ? (
                          <Badge className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-200">Watchlist</Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 min-w-0">
          {/* Watchlist rápida */}
          {priorityWatchlist.length > 0 ? (
            <Card className="border-amber-500/20 bg-amber-500/[0.03]">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-100/90">
                  <Target className="h-4 w-4" />
                  Prioridades (watchlist)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                {priorityWatchlist.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="rounded-full border border-amber-500/30 bg-zinc-900/60 px-3 py-1 text-xs text-amber-50 transition hover:bg-zinc-800"
                  >
                    {p.fullName}
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* 2 — Perfil */}
          {selected ? (
            <Card className="border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/30">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-white/5">
                <div>
                  <CardTitle className="text-lg">{selected.fullName}</CardTitle>
                  <p className="mt-1 text-xs text-zinc-500">
                    Histórico de observações: {selected.observations.length} notas
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => deleteProfile(selected.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSideA({ kind: "scout", id: selected.id });
                      setCompareOpen(true);
                    }}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                    Comparar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs text-zinc-500 sm:col-span-2 lg:col-span-3">
                    Nome
                    <Input
                      className="mt-1"
                      value={selected.fullName}
                      onChange={(e) => updateProfile(selected.id, { fullName: e.target.value })}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                    {selected.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL do upload local
                      <img
                        src={selected.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-zinc-500">{initials(selected.fullName)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Fotografia</p>
                    <p className="text-[11px] text-zinc-500">Carrega uma imagem do dispositivo (como na Observação / equipa).</p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="block w-full text-xs text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:text-zinc-300"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file || !file.type.startsWith("image/")) return;
                        try {
                          const s = await imageFileToCompressedJpegDataUrl(file, {
                            maxOutputBytes: 340_000,
                            initialMaxSide: 480,
                          });
                          if (s) updateProfile(selected.id, { photoUrl: s });
                        } catch {
                          /* ignore */
                        }
                      }}
                    />
                    {selected.photoUrl ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => updateProfile(selected.id, { photoUrl: undefined })}
                      >
                        Remover foto
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ScoutingDobTriplet
                  storedIso={selected.dateOfBirth}
                  onCommit={(iso) => updateProfile(selected.id, { dateOfBirth: iso })}
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs text-zinc-500">
                    Nacionalidade
                    <Input
                      className="mt-1"
                      value={selected.nationality ?? ""}
                      onChange={(e) => updateProfile(selected.id, { nationality: e.target.value || undefined })}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Altura (cm)
                    <Input
                      className="mt-1"
                      type="number"
                      value={selected.heightCm ?? ""}
                      onChange={(e) =>
                        updateProfile(selected.id, {
                          heightCm: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Peso (kg)
                    <Input
                      className="mt-1"
                      type="number"
                      value={selected.weightKg ?? ""}
                      onChange={(e) =>
                        updateProfile(selected.id, {
                          weightKg: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Pé dominante
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-surface-border bg-surface-raised px-3 text-sm text-white"
                      value={selected.preferredFoot ?? ""}
                      onChange={(e) =>
                        updateProfile(selected.id, {
                          preferredFoot: (e.target.value as PreferredFoot) || undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="right">Direito</option>
                      <option value="left">Esquerdo</option>
                      <option value="both">Ambos</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500 sm:col-span-2">
                    Clube atual
                    <Input
                      className="mt-1"
                      value={selected.currentClub ?? ""}
                      onChange={(e) => updateProfile(selected.id, { currentClub: e.target.value || undefined })}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Estado
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-surface-border bg-surface-raised px-3 text-sm text-white"
                      value={selected.status}
                      onChange={(e) =>
                        updateProfile(selected.id, { status: e.target.value as SketchScoutingObservationStatus })
                      }
                    >
                      {(Object.keys(SCOUTING_STATUS_LABELS_PT) as SketchScoutingObservationStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {SCOUTING_STATUS_LABELS_PT[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500">
                    Escalão
                    <Input
                      className="mt-1"
                      value={selected.ageCategory ?? ""}
                      onChange={(e) => updateProfile(selected.id, { ageCategory: e.target.value || undefined })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.watchlistPriority)}
                      onChange={(e) => updateProfile(selected.id, { watchlistPriority: e.target.checked })}
                    />
                    Watchlist de prioridade
                  </label>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Posições</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ALL_POSITIONS.map((pos) => {
                      const on = selected.positions.includes(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? selected.positions.filter((x) => x !== pos)
                              : [...selected.positions, pos];
                            updateProfile(selected.id, {
                              positions: next.length ? next : [pos],
                            });
                          }}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-xs transition",
                            on
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
                              : "border-white/10 text-zinc-400 hover:border-white/20"
                          )}
                        >
                          {POS_SHORT[pos]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  const pill = scoutingProfilePillars(selected);
                  return (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <PillarMini label="Geral" value={pill.overall} />
                      <PillarMini label="Téc." value={pill.technical} />
                      <PillarMini label="Tát." value={pill.tactical} />
                      <PillarMini label="Fís." value={pill.physical} />
                      <PillarMini label="Men." value={pill.mental} />
                    </div>
                  );
                })()}

                <div className="grid gap-6 lg:grid-cols-2">
                  {(
                    [
                      ["technique", SCOUTING_TECHNIQUE_KEYS, selected.technique],
                      ["tactical", SCOUTING_TACTICAL_KEYS, selected.tactical],
                      ["physical", SCOUTING_PHYSICAL_KEYS, selected.physical],
                      ["mental", SCOUTING_MENTAL_KEYS, selected.mental],
                    ] as const
                  ).map(([block, keys, scores]) => (
                    <div key={block} className="rounded-xl border border-white/5 bg-zinc-950/50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {block === "technique"
                          ? "Técnicos"
                          : block === "tactical"
                            ? "Táticos"
                            : block === "physical"
                              ? "Físicos"
                              : "Mentais"}
                      </h4>
                      <div className="mt-3 space-y-2.5">
                        {keys.map((k) => (
                          <div key={k}>
                            <AttrBar label={scoutingAttributeLabelPt(block, k)} value={scores[k] ?? 60} />
                            <input
                              type="range"
                              min={40}
                              max={95}
                              value={scores[k] ?? 62}
                              className="mt-1 w-full accent-emerald-500"
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                updateProfile(selected.id, {
                                  [block]: { ...selected[block], [k]: v },
                                } as Partial<SketchScoutingProfile>);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Perfil tático</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TACTICAL_ROLE_PRESETS_PT.map((role) => {
                      const on = selected.tacticalRoleTags.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? selected.tacticalRoleTags.filter((x) => x !== role.id)
                              : [...selected.tacticalRoleTags, role.id];
                            updateProfile(selected.id, { tacticalRoleTags: next });
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            on
                              ? "border-sky-500/50 bg-sky-500/15 text-sky-100"
                              : "border-white/10 text-zinc-400 hover:border-white/25"
                          )}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Notas de observação</h4>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newObs}
                      onChange={(e) => setNewObs(e.target.value)}
                      placeholder="Ex.: Excelente leitura entre linhas…"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!newObs.trim()}
                      onClick={() => {
                        const note = { id: noteUid(), text: newObs.trim(), createdAt: new Date().toISOString() };
                        updateProfile(selected.id, { observations: [...selected.observations, note] });
                        setNewObs("");
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                    {[...selected.observations]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((o) => (
                        <li
                          key={o.id}
                          className="rounded-lg border border-white/5 bg-zinc-900/50 px-3 py-2 text-zinc-200"
                        >
                          <div className="text-[10px] text-zinc-500">
                            {new Date(o.createdAt).toLocaleString("pt-PT")}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap text-zinc-300">{o.text}</div>
                        </li>
                      ))}
                  </ul>
                </div>

                {titularMatch ? (
                  <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      vs titular sugerido ({titularMatch.name})
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      {(() => {
                        const a = scoutingProfilePillars(selected);
                        const b = squadPlayerComparablePillars(titularMatch);
                        const rows = [
                          ["Overall", a.overall, b.overall],
                          ["Téc.", a.technical, b.technical],
                          ["Tát.", a.tactical, b.tactical],
                          ["Fís.", a.physical, b.physical],
                          ["Men.", a.mental, b.mental],
                        ] as const;
                        return rows.map(([lab, va, vb]) => (
                          <div key={lab} className="rounded-lg bg-black/20 px-2 py-2">
                            <div className="text-zinc-500">{lab}</div>
                            <div className="mt-1 flex justify-between gap-2 font-mono text-white">
                              <span>{va}</span>
                              <span className="text-zinc-600">|</span>
                              <span>{vb}</span>
                            </div>
                            <div
                              className={cn(
                                "mt-1 text-[10px]",
                                va > vb ? "text-emerald-400" : va < vb ? "text-amber-300" : "text-zinc-500"
                              )}
                            >
                              {va > vb ? "Vantagem observado" : va < vb ? "Vantagem plantel" : "Equilíbrio"}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSideA({ kind: "scout", id: selected.id });
                        setSideB({ kind: "squad", id: titularMatch.id });
                        setCompareOpen(true);
                      }}
                    >
                      Abrir comparação completa
                    </Button>
                  </div>
                ) : null}

                {recommendations.length > 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-sm text-emerald-50/90">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
                      Recomendações tácticas
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {recommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-white/15 bg-zinc-950/30">
              <CardContent className="py-12 text-center text-sm text-zinc-500">
                Seleciona um jogador na lista ou cria um novo perfil de captação.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 3 — Comparação resumo */}
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCompare className="h-4 w-4" />
                  Comparação
                </CardTitle>
                <p className="text-xs text-zinc-500">Observado vs observado, vs plantel ou plantel vs plantel.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="button" variant="secondary" className="w-full" onClick={() => setCompareOpen(true)}>
                  Comparar jogadores
                </Button>
                {cmpA && cmpB ? (
                  <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3 text-xs text-zinc-300">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium text-white">
                        {cmpA.type === "scout" ? cmpA.profile.fullName : cmpA.player.name}
                      </span>
                      <span className="text-zinc-600">vs</span>
                      <span className="truncate font-medium text-white">
                        {cmpB.type === "scout" ? cmpB.profile.fullName : cmpB.player.name}
                      </span>
                    </div>
                    <CompareRadar
                      labels={["Ov.", "Téc.", "Tát.", "Fís.", "Men."]}
                      aVals={[
                        cmpA.pillars.overall,
                        cmpA.pillars.technical,
                        cmpA.pillars.tactical,
                        cmpA.pillars.physical,
                        cmpA.pillars.mental,
                      ]}
                      bVals={[
                        cmpB.pillars.overall,
                        cmpB.pillars.technical,
                        cmpB.pillars.tactical,
                        cmpB.pillars.physical,
                        cmpB.pillars.mental,
                      ]}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Escolhe dois perfis no modal de comparação.</p>
                )}
              </CardContent>
            </Card>

            {/* 4 — Quadro táctico */}
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="text-base">Quadro táctico</CardTitle>
                <p className="text-xs text-zinc-500">Mesmas formações que em Táticas — plantel e observados.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRIMARY_FORMATION_IDS.map((f) => (
                    <Button
                      key={f}
                      type="button"
                      size="sm"
                      variant={formation === f ? "primary" : "secondary"}
                      onClick={() => applyFormation(f)}
                    >
                      {formationDisplayLabel(f)}
                    </Button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMoreFormationsOpen(true)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors",
                      MORE_FORMATION_IDS.includes(formation)
                        ? "border-accent/60 bg-accent/15 text-accent"
                        : "border-surface-border bg-surface-raised text-zinc-400 hover:text-white"
                    )}
                  >
                    + formações
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <FootballPitch
                  players={pitchPlayers}
                  roster={[...roster, ...scoutingAsPlayers]}
                  onPlayersChange={persistPitchPlayers}
                  onSlotTap={(slot) => {
                    if (slot.playerId) openPickerForSlot(slot);
                    else openPickerForSlot(slot);
                  }}
                  className="max-h-[min(56vh,520px)]"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PlayerPickerModal
        open={pickerOpen}
        title={pickerSlot ? `Posição ${pickerSlot.formationLabel}` : "Escolher jogador"}
        players={pickerPlayers}
        onClose={() => {
          setPickerOpen(false);
          setPickerSlotId(null);
        }}
        onSelect={assignPlayerToSlot}
        onClear={pickerSlotId ? clearSlot : undefined}
        emptyHint={
          roster.length === 0 && scoutingAsPlayers.length === 0
            ? "Adiciona jogadores na Equipa ou perfis em Captações."
            : "Nenhum jogador elegível para esta posição ou já colocado."
        }
      />

      {moreFormationsOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setMoreFormationsOpen(false)}
        >
          <div
            className="max-h-[min(85vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Formações</h3>
              <button
                type="button"
                onClick={() => setMoreFormationsOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[min(70vh,480px)] overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MORE_FORMATION_IDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => applyFormation(f)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-colors",
                      formation === f
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-surface-border bg-surface-raised/60 text-zinc-300 hover:border-zinc-600"
                    )}
                  >
                    {formationDisplayLabel(f)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {compareOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setCompareOpen(false)}
        >
          <div
            className="max-h-[min(90vh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-surface-border bg-[#0b0f14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="font-display text-lg font-semibold text-white">Comparar jogadores</h3>
              <p className="mt-1 text-xs text-zinc-500">Dois lados: A vs B (observado ou plantel).</p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">Jogador A</div>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-surface-border bg-surface-raised px-2 text-sm text-white"
                  value={sideA ? `${sideA.kind}:${sideA.id}` : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setSideA(null);
                      return;
                    }
                    const i = v.indexOf(":");
                    const kind = v.slice(0, i) as "scout" | "squad";
                    const id = v.slice(i + 1);
                    setSideA({ kind, id });
                  }}
                >
                  <option value="">—</option>
                  <optgroup label="Observados">
                    {profiles.map((p) => (
                      <option key={p.id} value={`scout:${p.id}`}>
                        {p.fullName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Plantel">
                    {roster.map((p) => (
                      <option key={p.id} value={`squad:${p.id}`}>
                        {p.name} (#{p.number})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Jogador B</div>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-surface-border bg-surface-raised px-2 text-sm text-white"
                  value={sideB ? `${sideB.kind}:${sideB.id}` : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setSideB(null);
                      return;
                    }
                    const i = v.indexOf(":");
                    const kind = v.slice(0, i) as "scout" | "squad";
                    const id = v.slice(i + 1);
                    setSideB({ kind, id });
                  }}
                >
                  <option value="">—</option>
                  <optgroup label="Observados">
                    {profiles.map((p) => (
                      <option key={`b-${p.id}`} value={`scout:${p.id}`}>
                        {p.fullName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Plantel">
                    {roster.map((p) => (
                      <option key={`b-${p.id}`} value={`squad:${p.id}`}>
                        {p.name} (#{p.number})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
            {cmpA && cmpB ? (
              <div className="grid gap-6 border-t border-white/5 px-5 pb-6 pt-4 lg:grid-cols-2">
                <div>
                  <CompareRadar
                    labels={["Ov.", "Téc.", "Tát.", "Fís.", "Men."]}
                    aVals={[
                      cmpA.pillars.overall,
                      cmpA.pillars.technical,
                      cmpA.pillars.tactical,
                      cmpA.pillars.physical,
                      cmpA.pillars.mental,
                    ]}
                    bVals={[
                      cmpB.pillars.overall,
                      cmpB.pillars.technical,
                      cmpB.pillars.tactical,
                      cmpB.pillars.physical,
                      cmpB.pillars.mental,
                    ]}
                  />
                  <div className="mt-2 flex justify-center gap-6 text-[10px] text-zinc-500">
                    <span className="text-emerald-400">■ A</span>
                    <span className="text-amber-300">■ B</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {(() => {
                    const a = cmpA.pillars;
                    const b = cmpB.pillars;
                    const diff = (ka: keyof typeof a, kb: keyof typeof b) => a[ka] - b[kb];
                    const rows: { label: string; va: number; vb: number }[] = [
                      { label: "Overall", va: a.overall, vb: b.overall },
                      { label: "Técnica", va: a.technical, vb: b.technical },
                      { label: "Tática", va: a.tactical, vb: b.tactical },
                      { label: "Física", va: a.physical, vb: b.physical },
                      { label: "Mental", va: a.mental, vb: b.mental },
                    ];
                    return (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-zinc-500">
                            <th className="py-1">Métrica</th>
                            <th className="py-1">A</th>
                            <th className="py-1">B</th>
                            <th className="py-1">Δ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.label} className="border-t border-white/5">
                              <td className="py-2 text-zinc-400">{r.label}</td>
                              <td className="font-mono text-emerald-200">{r.va}</td>
                              <td className="font-mono text-amber-200">{r.vb}</td>
                              <td
                                className={cn(
                                  "font-mono",
                                  r.va - r.vb > 0 ? "text-emerald-400" : r.va - r.vb < 0 ? "text-amber-300" : "text-zinc-500"
                                )}
                              >
                                {r.va - r.vb > 0 ? `+${r.va - r.vb}` : r.va - r.vb}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                  <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-3 text-xs text-zinc-300">
                    <div className="font-semibold text-white">Análise visual</div>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {(() => {
                        const a = cmpA.pillars;
                        const b = cmpB.pillars;
                        const lines: string[] = [];
                        if (a.technical > b.technical + 3) lines.push("A superior no bloco técnico.");
                        if (b.technical > a.technical + 3) lines.push("B superior no bloco técnico.");
                        if (a.tactical > b.tactical + 3) lines.push("A lê melhor o jogo posicional.");
                        if (b.tactical > a.tactical + 3) lines.push("B com vantagem tática.");
                        if (a.physical > b.physical + 3) lines.push("A impõe mais físico.");
                        if (b.physical > a.physical + 3) lines.push("B com mais recursos físicos.");
                        if (a.mental > b.mental + 3) lines.push("A com perfil mental mais agressivo/composto.");
                        if (b.mental > a.mental + 3) lines.push("B com margem no plano mental.");
                        if (!lines.length) lines.push("Perfil equilibrado — decisão por contexto táctico e minutos.");
                        const fav =
                          a.overall > b.overall + 2 ? "A" : b.overall > a.overall + 2 ? "B" : "Equilibrado";
                        lines.push(`Vantagem global: ${fav}.`);
                        return lines.map((l) => <li key={l}>{l}</li>);
                      })()}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="px-5 pb-6 text-sm text-zinc-500">Selecciona dois jogadores para ver radar e deltas.</p>
            )}
            <div className="flex justify-end gap-2 border-t border-white/5 px-5 py-3">
              <Button type="button" variant="secondary" onClick={() => setCompareOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
