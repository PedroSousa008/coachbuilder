import { prisma } from "@/lib/prisma";
import {
  emptyWorkspaceSnapshot,
  parseWorkspacePayload,
  pickFirstNonEmptyAvatarUrl,
  snapshotHasMeaningfulData,
  type WorkspaceSnapshotV1,
} from "@/lib/workspace-snapshot";
import type { Conversation, Message } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import { mergePlayerRosterById } from "@/lib/workspace-merge-players";
import { mergeSavedTrainingExercises } from "@/lib/merge-saved-training-exercises";

/** União por `id` na BD: o `incoming` atualiza o mesmo id; entidades só no `base` mantêm-se (evita apagar plantel/fotos). */
function mergeEntitiesById<T extends { id: string }>(base: T[], overlay: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of base) {
    if (x?.id) m.set(x.id, x);
  }
  for (const x of overlay) {
    if (x?.id) m.set(x.id, x);
  }
  return Array.from(m.values());
}

function mergeTrainingPlayersMaps(
  existing: Record<string, string[]>,
  incoming: Record<string, string[]>
): Record<string, string[]> {
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  const out: Record<string, string[]> = {};
  for (const k of keys) {
    out[k] = [...new Set([...(existing[k] ?? []), ...(incoming[k] ?? [])])];
  }
  return out;
}

function timeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function titleTime(conv: Conversation | undefined): number {
  if (!conv) return 0;
  return timeMs(conv.titleUpdatedAt);
}

function mergeConversationLists(
  incoming: Conversation[],
  existing: Conversation[],
  actorUserId: string
): Conversation[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const conv of incoming) byId.set(conv.id, conv);
  const groupIds = new Set([...existing, ...incoming].filter((c) => c.type === "group").map((c) => c.id));
  for (const groupId of groupIds) {
    const existingGroup = existing.find((c) => c.id === groupId && c.type === "group");
    const incomingGroup = incoming.find((c) => c.id === groupId && c.type === "group");
    if (!existingGroup) continue;
    const incomingIsNewer = timeMs(incomingGroup?.lastMessageAt) >= timeMs(existingGroup.lastMessageAt);
    const incomingHasNewerTitle = titleTime(incomingGroup) >= titleTime(existingGroup);
    byId.set(groupId, {
      ...existingGroup,
      ...(incomingGroup ?? {}),
      createdById: existingGroup.createdById ?? incomingGroup?.createdById,
      title:
        (existingGroup.createdById ?? incomingGroup?.createdById) &&
        actorUserId !== (existingGroup.createdById ?? incomingGroup?.createdById)
          ? existingGroup.title
          : incomingHasNewerTitle
            ? (incomingGroup?.title ?? existingGroup.title)
            : existingGroup.title,
      titleUpdatedAt: incomingHasNewerTitle
        ? (incomingGroup?.titleUpdatedAt ?? incomingGroup?.lastMessageAt ?? existingGroup.titleUpdatedAt ?? existingGroup.lastMessageAt)
        : (existingGroup.titleUpdatedAt ?? existingGroup.lastMessageAt),
      avatarInitials:
        (existingGroup.createdById ?? incomingGroup?.createdById) &&
        actorUserId !== (existingGroup.createdById ?? incomingGroup?.createdById)
          ? existingGroup.avatarInitials
          : incomingHasNewerTitle
            ? (incomingGroup?.avatarInitials ?? existingGroup.avatarInitials)
            : existingGroup.avatarInitials,
      lastMessageAt: incomingIsNewer ? (incomingGroup?.lastMessageAt ?? existingGroup.lastMessageAt) : existingGroup.lastMessageAt,
      lastMessagePreview: incomingIsNewer
        ? (incomingGroup?.lastMessagePreview ?? existingGroup.lastMessagePreview)
        : existingGroup.lastMessagePreview,
      subtitle: incomingIsNewer ? (incomingGroup?.subtitle ?? existingGroup.subtitle) : existingGroup.subtitle,
      participantIds: Array.from(new Set([...existingGroup.participantIds, ...(incomingGroup?.participantIds ?? [])])),
    });
  }
  return [...byId.values()];
}

function mergeMessageLists(incoming: Message[], existing: Message[]): Message[] {
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) if (!byId.has(msg.id)) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function mergeWorkspacePayloadSafely(
  incoming: WorkspaceSnapshotV1,
  existing: WorkspaceSnapshotV1,
  actorUserId: string
): WorkspaceSnapshotV1 {
  const pickNonEmptyArray = <T>(inc: T[], ex: T[]): T[] => (inc.length > 0 || ex.length === 0 ? inc : ex);
  const pickNonEmptyObject = <T extends object>(inc: T, ex: T): T =>
    Object.keys(inc ?? {}).length > 0 || Object.keys(ex ?? {}).length === 0 ? inc : ex;
  const pickNonEmptyString = (inc: string, ex: string): string => (inc.trim() !== "" || ex.trim() === "" ? inc : ex);

  const mergedConversations = mergeConversationLists(incoming.conversations, existing.conversations, actorUserId);
  const mergedMessages = { ...existing.messages, ...incoming.messages };
  for (const group of mergedConversations.filter((c) => c.type === "group")) {
    mergedMessages[group.id] = mergeMessageLists(incoming.messages[group.id] ?? [], existing.messages[group.id] ?? []);
  }

  const incomingLeague = incoming.league ?? existing.league;
  const existingLeague = existing.league;
  const mergedLeague = {
    ...incomingLeague,
    url: pickNonEmptyString(incomingLeague.url ?? "", existingLeague.url ?? ""),
    rows: pickNonEmptyArray(incomingLeague.rows ?? [], existingLeague.rows ?? []),
    matches: dedupeMatches(
      mergeEntitiesById(existingLeague.matches ?? [], incomingLeague.matches ?? [])
    ),
    pastClubResults: mergeEntitiesById(
      existingLeague.pastClubResults ?? [],
      incomingLeague.pastClubResults ?? []
    ),
    setup: incomingLeague.setup ?? existingLeague.setup ?? null,
    competitionName: incomingLeague.competitionName ?? existingLeague.competitionName ?? null,
    lastFetched: incomingLeague.lastFetched ?? existingLeague.lastFetched ?? null,
    lastError: incomingLeague.lastError ?? existingLeague.lastError ?? null,
  };

  const mergedCoachProfile = {
    ...existing.coachProfile,
    ...incoming.coachProfile,
    name: pickNonEmptyString(incoming.coachProfile.name ?? "", existing.coachProfile.name ?? ""),
    club: pickNonEmptyString(incoming.coachProfile.club ?? "", existing.coachProfile.club ?? ""),
    email: pickNonEmptyString(incoming.coachProfile.email ?? "", existing.coachProfile.email ?? ""),
    avatarDataUrl: pickFirstNonEmptyAvatarUrl(
      incoming.coachProfile.avatarDataUrl,
      existing.coachProfile.avatarDataUrl
    ),
  };

  const mergedTeamCallup =
    Object.values(incoming.teamCallup?.form ?? {}).some((v) => String(v).trim() !== "") ||
    (incoming.teamCallup?.selectedPlayerIds?.length ?? 0) > 0 ||
    Boolean(incoming.teamCallup?.clubLogoDataUrl)
      ? incoming.teamCallup
      : existing.teamCallup;

  const mergedSketchArea =
    (incoming.sketchArea?.calendarEvents?.length ?? 0) > 0 ||
    (incoming.sketchArea?.notes?.length ?? 0) > 0 ||
    (incoming.sketchArea?.tasks?.length ?? 0) > 0 ||
    (incoming.sketchArea?.files?.length ?? 0) > 0 ||
    (incoming.sketchArea?.boardDrafts?.length ?? 0) > 0 ||
    (incoming.sketchArea?.watchlist?.length ?? 0) > 0 ||
    (incoming.sketchArea?.scoutingProfiles?.length ?? 0) > 0 ||
    Boolean(incoming.sketchArea?.scoutingBoard?.players?.some((p) => p.playerId))
      ? incoming.sketchArea
      : existing.sketchArea;

  return {
    ...existing,
    ...incoming,
    players: mergePlayerRosterById(existing.players, incoming.players),
    staff: mergeEntitiesById(existing.staff, incoming.staff),
    teamRoles: pickNonEmptyObject(incoming.teamRoles, existing.teamRoles),
    trainingSessions: mergeEntitiesById(existing.trainingSessions, incoming.trainingSessions),
    trainingPlayers: mergeTrainingPlayersMaps(existing.trainingPlayers, incoming.trainingPlayers),
    fixtures: mergeEntitiesById(existing.fixtures, incoming.fixtures),
    tactics: mergeEntitiesById(existing.tactics, incoming.tactics),
    tacticMatches: mergeEntitiesById(existing.tacticMatches, incoming.tacticMatches),
    tacticPlayerNotes: { ...existing.tacticPlayerNotes, ...incoming.tacticPlayerNotes },
    savedTrainingExercises: mergeSavedTrainingExercises(
      existing.savedTrainingExercises ?? [],
      incoming.savedTrainingExercises ?? []
    ),
    coachProfile: mergedCoachProfile,
    league: mergedLeague,
    sketchArea: mergedSketchArea,
    teamCallup: mergedTeamCallup,
    conversations: mergedConversations,
    messages: mergedMessages,
  };
}

export async function upsertWorkspaceSafely(args: {
  userId: string;
  incomingPayload: WorkspaceSnapshotV1;
  actorUserId: string;
  allowDestructive?: boolean;
}): Promise<WorkspaceSnapshotV1> {
  const existingRow = await prisma.workspace.findUnique({ where: { userId: args.userId } });
  const existingPayload = parseWorkspacePayload(existingRow?.payload) ?? emptyWorkspaceSnapshot();
  const merged = mergeWorkspacePayloadSafely(args.incomingPayload, existingPayload, args.actorUserId);
  if (!args.allowDestructive && snapshotHasMeaningfulData(existingPayload) && !snapshotHasMeaningfulData(merged)) {
    throw new Error("ANTI_LOSS_GUARD_BLOCKED");
  }
  await prisma.workspace.upsert({
    where: { userId: args.userId },
    create: { userId: args.userId, payload: merged as object },
    update: { payload: merged as object },
  });
  return merged;
}
