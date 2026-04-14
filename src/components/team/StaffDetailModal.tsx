"use client";

import { useEffect, useState } from "react";
import type { StaffMember, TeamDocumentsBundle } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { normalizeTeamDocuments } from "@/lib/team-documents";
import { TeamDocumentsPanel } from "@/components/team/TeamDocumentsPanel";

type Tab = "dados" | "documentos";

export function StaffDetailModal({
  member,
  open,
  onClose,
  onSave,
  onRemove,
}: {
  member: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<StaffMember, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("dados");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [documentsBundle, setDocumentsBundle] = useState<TeamDocumentsBundle>(() => normalizeTeamDocuments());

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setRole(member.role);
    setDateOfBirth(member.dateOfBirth ?? "");
    setDocumentsBundle(normalizeTeamDocuments(member.documents));
    setTab("dados");
  }, [member]);

  if (!open || !member) return null;

  const save = () => {
    const n = name.trim();
    if (!n) return;
    onSave(member.id, {
      name: n,
      role: role.trim() || "Staff",
      dateOfBirth: dateOfBirth || undefined,
      documents: normalizeTeamDocuments(documentsBundle),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="staff-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-[#0f1419] shadow-2xl sm:max-h-[min(90vh,800px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-border px-5 py-4">
          <h3 id="staff-detail-title" className="font-display text-lg font-semibold text-white">
            {member.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">Dados e documentos da equipa técnica</p>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setTab("dados")}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === "dados" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Dados
            </button>
            <button
              type="button"
              onClick={() => setTab("documentos")}
              className={cn(
                "rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === "documentos" ? "bg-accent/20 text-accent" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Documentos
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "dados" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500" htmlFor="sd-name">
                  Nome
                </label>
                <Input id="sd-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500" htmlFor="sd-role">
                  Função
                </label>
                <Input
                  id="sd-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1"
                  placeholder="Treinador adjunto, GR…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500" htmlFor="sd-dob">
                  Data de nascimento
                </label>
                <Input
                  id="sd-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {tab === "documentos" && (
            <TeamDocumentsPanel
              contractTitle="Contrato do treinador"
              bundle={documentsBundle}
              onChange={setDocumentsBundle}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-surface-border px-5 py-4">
          <Button type="button" variant="secondary" className="flex-1 min-w-[120px]" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 min-w-[120px]"
            onClick={() => {
              onRemove(member.id);
              onClose();
            }}
          >
            Remover
          </Button>
          <Button type="button" className="flex-1 min-w-[120px]" onClick={save} disabled={!name.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
