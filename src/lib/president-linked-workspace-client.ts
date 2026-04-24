"use client";

export async function patchLinkedCoachWorkspace(body: {
  coachUserId: string;
  playerId?: string;
  playerPatch?: Record<string, unknown>;
  coachProfilePatch?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/cloud/president/linked-workspace-patch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error ?? `Erro ${res.status}` };
  }
  return { ok: true };
}
