import type { CoachProfileState, Player, Position } from "@/types";
import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";

const POSITIONS: readonly Position[] = [
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
] as const;

const POS_SET = new Set<string>(POSITIONS);

/** Interpreta texto tipo "CB, ST" ou "CB / ST" vindo do modo Presidente. */
export function parsePositionsFromPresidentInput(raw: string): Position[] | null {
  const s = raw.trim();
  if (!s) return null;
  const parts = s
    .split(/[,;/|]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  const out: Position[] = [];
  for (const p of parts) {
    if (POS_SET.has(p)) out.push(p as Position);
  }
  return out.length ? out : null;
}

function injuryStatusToAvailability(
  v: string | undefined
): "available" | "doubt" | "out" | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === "Dúvida") return "doubt";
  if (t === "Indisponível") return "out";
  if (t === "") return "available";
  return undefined;
}

export type PresidentLinkedPlayerPatchInput = {
  name?: string;
  age?: string | number;
  position?: string;
  injuryStatus?: string;
  isTopTalent?: boolean;
  /** Quando preenchido, actualiza `coachProfile.club` do treinador (nome do clube na app). */
  team?: string;
};

export function applyPresidentPatchToPlayer(
  player: Player,
  patch: PresidentLinkedPlayerPatchInput,
  coachProfile: CoachProfileState
): { player: Player; coachProfile: CoachProfileState } {
  let next = { ...player };
  const cp = { ...coachProfile };

  if (patch.name !== undefined) {
    const n = String(patch.name).trim().slice(0, 200);
    if (n) next = { ...next, name: n };
  }
  if (patch.age !== undefined) {
    const n = typeof patch.age === "number" ? patch.age : parseInt(String(patch.age).trim(), 10);
    if (!Number.isNaN(n) && n >= 0 && n < 100) next = { ...next, age: n };
  }
  if (patch.position !== undefined) {
    const parsed = parsePositionsFromPresidentInput(String(patch.position));
    if (parsed) {
      next = {
        ...next,
        position: parsed[0]!,
        positions: parsed.length > 1 ? parsed : undefined,
      };
    }
  }
  const av = injuryStatusToAvailability(patch.injuryStatus);
  if (av !== undefined) next = { ...next, availability: av };
  if (patch.isTopTalent === true) next = { ...next, performance: "up" };
  if (patch.isTopTalent === false) next = { ...next, performance: "steady" };

  if (patch.team !== undefined) {
    const club = String(patch.team).trim().slice(0, 200);
    cp.club = club;
  }

  return { player: next, coachProfile: cp };
}

export type PresidentLinkedCoachProfilePatchInput = {
  name?: string;
  birthDate?: string;
  role?: string;
  team?: string;
  methodology?: string;
  strengths?: string;
};

export function applyPresidentPatchToCoachProfile(
  coachProfile: CoachProfileState,
  patch: PresidentLinkedCoachProfilePatchInput
): CoachProfileState {
  const next: CoachProfileState = { ...coachProfile };
  if (patch.name !== undefined) next.name = String(patch.name).trim().slice(0, 200);
  if (patch.birthDate !== undefined) next.dateOfBirth = String(patch.birthDate).trim().slice(0, 32) || undefined;
  if (patch.role !== undefined) next.role = String(patch.role).trim().slice(0, 120);
  if (patch.team !== undefined) next.club = String(patch.team).trim().slice(0, 200);
  if (patch.methodology !== undefined) next.bio = String(patch.methodology).trim().slice(0, 8000) || undefined;
  if (patch.strengths !== undefined) next.profession = String(patch.strengths).trim().slice(0, 2000) || undefined;
  return next;
}

export function patchSnapshotForPresident(
  snap: WorkspaceSnapshotV1,
  opts:
    | { kind: "player"; playerId: string; patch: PresidentLinkedPlayerPatchInput }
    | { kind: "coachProfile"; patch: PresidentLinkedCoachProfilePatchInput }
): WorkspaceSnapshotV1 {
  if (opts.kind === "coachProfile") {
    return {
      ...snap,
      coachProfile: applyPresidentPatchToCoachProfile(snap.coachProfile, opts.patch),
    };
  }
  const idx = snap.players.findIndex((p) => p.id === opts.playerId);
  if (idx < 0) return snap;
  const player = snap.players[idx]!;
  const { player: updated, coachProfile } = applyPresidentPatchToPlayer(
    player,
    opts.patch,
    snap.coachProfile
  );
  const players = [...snap.players];
  players[idx] = updated;
  return { ...snap, players, coachProfile };
}
