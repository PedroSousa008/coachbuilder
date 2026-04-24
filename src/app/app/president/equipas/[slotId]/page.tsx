"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { usePresidentClub } from "@/contexts/PresidentClubContext";
import { usePresidentLinkedRoster } from "@/hooks/usePresidentLinkedRoster";
import { useLinkedCoachesBrief } from "@/hooks/useLinkedCoachesBrief";
import { PresidentEquipaDetailView } from "@/components/president/PresidentEquipaDetailView";

export default function PresidentEquipaDetailPage() {
  const params = useParams();
  const slotId = decodeURIComponent(String(params.slotId ?? ""));
  const { state, renameEquipasSlot, setEquipasSlotCoach } = usePresidentClub();
  const roster = usePresidentLinkedRoster();

  const slot = useMemo(() => state.equipasSlots.find((s) => s.id === slotId), [state.equipasSlots, slotId]);

  const coachIdsForBrief = useMemo(
    () => (slot?.linkedCoachUserId ? [slot.linkedCoachUserId] : []),
    [slot?.linkedCoachUserId]
  );
  const { briefs, loading: briefLoading, error: briefError, refresh: refreshBriefs } = useLinkedCoachesBrief(coachIdsForBrief);

  const coachOptions = useMemo(() => {
    return roster.coaches
      .filter((c) => c.coachUserId)
      .map((c) => ({
        id: c.coachUserId!,
        label: `${c.name}${c.coachEmail ? ` · ${c.coachEmail}` : ""}`,
      }));
  }, [roster.coaches]);

  if (!slot) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <p className="text-zinc-400">Esta equipa não existe ou foi removida.</p>
        <Link href="/app/president/equipas" className="text-sm text-amber-400/90 underline-offset-2 hover:underline">
          Voltar às equipas
        </Link>
      </div>
    );
  }

  const brief = slot.linkedCoachUserId ? briefs[slot.linkedCoachUserId] : undefined;

  return (
    <PresidentEquipaDetailView
      title={slot.title}
      linkedCoachUserId={slot.linkedCoachUserId}
      coachOptions={coachOptions}
      brief={brief}
      briefLoading={briefLoading}
      briefError={briefError}
      rosterLoading={roster.loading}
      onTitleChange={(t) => renameEquipasSlot(slot.id, t)}
      onCoachChange={(cid) => setEquipasSlotCoach(slot.id, cid)}
      onRefreshRoster={() => roster.refresh()}
      onRefreshBriefs={() => refreshBriefs()}
    />
  );
}
