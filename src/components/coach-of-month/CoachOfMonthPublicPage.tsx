"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { CoachOfMonthBoard } from "@/components/coach-of-month/CoachOfMonthBoard";
import { CoachOfMonthAdminEditor } from "@/components/admin/CoachOfMonthAdminEditor";
import {
  defaultCoachOfMonthContent,
  normalizeCoachOfMonthContent,
  type CoachOfMonthContent,
} from "@/lib/coach-of-month";
import { canUseOwnerCoachTools } from "@/lib/owner-coach-tools-client";

type ListedCoach = { id: string; name: string; email: string; nametag: string | null };

export function CoachOfMonthPublicPage() {
  const { user, authReady } = useAuth();
  const owner = canUseOwnerCoachTools(user?.email);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CoachOfMonthContent>(defaultCoachOfMonthContent());
  const [published, setPublished] = useState<CoachOfMonthContent>(defaultCoachOfMonthContent());
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [coachOptions, setCoachOptions] = useState<ListedCoach[]>([]);
  const [boardKey, setBoardKey] = useState(0);

  const dirty = JSON.stringify(draft) !== JSON.stringify(published);

  const loadAdminPayload = useCallback(async () => {
    const res = await fetch("/api/cloud/admin/coach-of-month", { credentials: "include" });
    const j = (await res.json()) as { ok?: boolean; payload?: unknown };
    if (res.ok && j.ok) {
      const n = normalizeCoachOfMonthContent(j.payload);
      setDraft(n);
      setPublished(n);
    }
  }, []);

  const loadCoachOptions = useCallback(async () => {
    const res = await fetch("/api/cloud/admin/users", { credentials: "include" });
    const j = (await res.json()) as {
      ok?: boolean;
      users?: { id: string; name: string; email: string; role: string; nametag: string | null }[];
    };
    if (!res.ok || !j.ok || !j.users) return;
    setCoachOptions(
      j.users
        .filter((u) => u.role !== "admin")
        .map((u) => ({ id: u.id, name: u.name, email: u.email, nametag: u.nametag ?? null }))
    );
  }, []);

  useEffect(() => {
    if (!authReady || !owner) return;
    void loadAdminPayload();
  }, [authReady, owner, loadAdminPayload]);

  useEffect(() => {
    if (!authReady || !owner || !editing) return;
    void loadCoachOptions();
  }, [authReady, owner, editing, loadCoachOptions]);

  const save = async () => {
    setSaving(true);
    setSaveHint(null);
    try {
      const res = await fetch("/api/cloud/admin/coach-of-month", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: draft }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; payload?: unknown };
      if (!res.ok || !j.ok) {
        setSaveHint(j.error ?? "Não foi possível guardar.");
        return;
      }
      const n = normalizeCoachOfMonthContent(j.payload);
      setDraft(n);
      setPublished(n);
      setEditing(false);
      setBoardKey((k) => k + 1);
    } catch {
      setSaveHint("Erro de rede ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  return (
    <div className="space-y-6">
      {owner ? (
        <div className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-[var(--background)]/95 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Modo editor: só a tua conta vê estes controlos. <strong className="text-zinc-400">Guardar</strong> publica
              para toda a app.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-4 text-xs"
                onClick={() => {
                  setEditing(true);
                  setDraft(published);
                  setSaveHint(null);
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                className="h-9 px-4 text-xs"
                disabled={!editing || !dirty || saving}
                onClick={() => void save()}
              >
                {saving ? "A guardar…" : "Guardar"}
              </Button>
            </div>
          </div>
          {saveHint ? <p className="mx-auto mt-2 max-w-6xl text-xs text-red-400">{saveHint}</p> : null}
        </div>
      ) : null}

      {owner && editing ? (
        <div className="space-y-6">
          <CoachOfMonthAdminEditor
            value={draft}
            editable
            coachOptions={coachOptions}
            onChange={setDraft}
          />
          <div>
            <h3 className="mb-3 font-display text-lg font-semibold text-white">Pré-visualização</h3>
            <CoachOfMonthBoard adminPreview={draft} />
          </div>
        </div>
      ) : (
        <CoachOfMonthBoard refetchKey={boardKey} />
      )}
    </div>
  );
}
