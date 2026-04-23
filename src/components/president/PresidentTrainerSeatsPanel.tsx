"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PRESIDENT_INCLUDED_COACH_SEATS } from "@/lib/president-constants";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { useAuth } from "@/contexts/AuthContext";

type SlotEmpty = { index: number; status: "empty" };
type SlotActive = { index: number; status: "active"; email: string; name: string; userId: string };
type SlotRevoked = { index: number; status: "revoked"; email: string; name: string; userId: string };
type Slot = SlotEmpty | SlotActive | SlotRevoked;

type Props = {
  onActiveSeatCount?: (count: number) => void;
  onRosterChanged?: () => void;
};

export function PresidentTrainerSeatsPanel({ onActiveSeatCount, onRosterChanged }: Props) {
  const { user } = useAuth();
  const cloud = shouldUseCloudClientApis(user);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowEmail, setRowEmail] = useState<Record<number, string>>({});
  const [rowPassword, setRowPassword] = useState<Record<number, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<number, string | null>>({});

  const load = useCallback(async () => {
    if (!cloud) {
      setSlots([]);
      onActiveSeatCount?.(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloud/president/trainer-seats", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; slots?: Slot[]; error?: string };
      if (!res.ok || !data.ok || !Array.isArray(data.slots)) {
        setError(typeof data.error === "string" ? data.error : "Não foi possível carregar os lugares.");
        setSlots([]);
        onActiveSeatCount?.(0);
        return;
      }
      setSlots(data.slots as Slot[]);
      const active = (data.slots as Slot[]).filter((s) => s.status === "active").length;
      onActiveSeatCount?.(active);
    } catch {
      setError("Falha de rede.");
      onActiveSeatCount?.(0);
    } finally {
      setLoading(false);
    }
  }, [cloud, onActiveSeatCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const setBusy = (index: number, msg: string | null) => {
    setRowBusy((prev) => ({ ...prev, [index]: msg }));
  };

  const saveSeat = async (seatIndex: number) => {
    const email = (rowEmail[seatIndex] ?? "").trim();
    const password = rowPassword[seatIndex] ?? "";
    setBusy(seatIndex, null);
    if (!email || !password) {
      setBusy(seatIndex, "Preenche email e palavra-passe.");
      return;
    }
    setBusy(seatIndex, "A guardar…");
    try {
      const res = await fetch("/api/cloud/president/trainer-seats", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIndex, email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBusy(seatIndex, typeof data.error === "string" ? data.error : "Erro ao guardar.");
        return;
      }
      setRowEmail((prev) => ({ ...prev, [seatIndex]: "" }));
      setRowPassword((prev) => ({ ...prev, [seatIndex]: "" }));
      await load();
      onRosterChanged?.();
    } catch {
      setBusy(seatIndex, "Falha de rede.");
    }
  };

  const changePassword = async (seatIndex: number) => {
    const password = rowPassword[seatIndex] ?? "";
    setBusy(seatIndex, null);
    if (password.length < 8) {
      setBusy(seatIndex, "Nova palavra-passe: mínimo 8 caracteres.");
      return;
    }
    setBusy(seatIndex, "A actualizar…");
    try {
      const res = await fetch(`/api/cloud/president/trainer-seats/${seatIndex}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBusy(seatIndex, typeof data.error === "string" ? data.error : "Erro.");
        return;
      }
      setRowPassword((prev) => ({ ...prev, [seatIndex]: "" }));
      setBusy(seatIndex, "Palavra-passe actualizada.");
      setTimeout(() => setBusy((prev) => ({ ...prev, [seatIndex]: null })), 2500);
    } catch {
      setBusy(seatIndex, "Falha de rede.");
    }
  };

  const revokeSeat = async (seatIndex: number, mode: "revoke-active" | "free-revoked" = "revoke-active") => {
    const msg =
      mode === "free-revoked"
        ? "Libertar definitivamente este lugar na cloud? Depois podes criar uma nova conta aqui."
        : "Revogar este lugar? O treinador deixa de estar ligado ao clube e perde o acesso Pro herdado.";
    if (!globalThis.confirm(msg)) return;
    setBusy(seatIndex, "A revogar…");
    try {
      const res = await fetch(`/api/cloud/president/trainer-seats/${seatIndex}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBusy(seatIndex, typeof data.error === "string" ? data.error : "Erro.");
        return;
      }
      await load();
      onRosterChanged?.();
      setBusy(seatIndex, null);
    } catch {
      setBusy(seatIndex, "Falha de rede.");
    }
  };

  if (!cloud) {
    return (
      <Card id="lugares-treinador" className="scroll-mt-24 border-surface-border bg-surface-raised/30 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base text-white">Lugares de treinador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">Liga uma conta cloud para criares e gerires lugares de treinador.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="lugares-treinador" className="scroll-mt-24 border-surface-border bg-surface-raised/30 lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base text-white">Lugares de treinador</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Cria até {PRESIDENT_INCLUDED_COACH_SEATS} contas com email e palavra-passe. Cada treinador entra como CoachPro
            enquanto a tua subscrição de presidente estiver activa e o lugar não for revogado.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2 font-medium">Lugar</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Palavra-passe</th>
                <th className="px-3 py-2 font-medium">Acções</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const idx = slot.index;
                const busy = rowBusy[idx];
                const isEmpty = slot.status === "empty";
                const isActive = slot.status === "active";
                return (
                  <tr key={idx} className="border-b border-surface-border/80 last:border-0">
                    <td className="px-3 py-3 text-zinc-300">#{idx + 1}</td>
                    <td className="px-3 py-3 text-zinc-400">
                      {isEmpty ? "Livre" : isActive ? "Activo" : "Revogado"}
                      {!isEmpty ? (
                        <div className="mt-0.5 text-xs text-zinc-500">{(slot as SlotActive | SlotRevoked).email}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {isEmpty ? (
                        <Input
                          type="email"
                          autoComplete="off"
                          placeholder="email@clube.pt"
                          value={rowEmail[idx] ?? ""}
                          onChange={(e) => setRowEmail((p) => ({ ...p, [idx]: e.target.value }))}
                          className="min-w-[180px]"
                        />
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={isEmpty ? "mín. 8 caracteres" : "nova palavra-passe"}
                        value={rowPassword[idx] ?? ""}
                        onChange={(e) => setRowPassword((p) => ({ ...p, [idx]: e.target.value }))}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {isEmpty ? (
                          <Button type="button" size="sm" onClick={() => void saveSeat(idx)} disabled={!!busy}>
                            Guardar
                          </Button>
                        ) : isActive ? (
                          <>
                            <Button type="button" size="sm" variant="secondary" onClick={() => void changePassword(idx)} disabled={!!busy}>
                              Nova palavra-passe
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => void revokeSeat(idx, "revoke-active")} disabled={!!busy}>
                              Revogar lugar
                            </Button>
                          </>
                        ) : (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void revokeSeat(idx, "free-revoked")} disabled={!!busy}>
                            Libertar lugar
                          </Button>
                        )}
                      </div>
                      {busy ? <p className="mt-1 text-xs text-zinc-500">{busy}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
