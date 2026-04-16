"use client";

import { useEffect, useRef, useState } from "react";
import type { StaffMember, TeamDocumentsBundle } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { normalizeTeamDocuments } from "@/lib/team-documents";
import { TeamDocumentsPanel } from "@/components/team/TeamDocumentsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";
import { normalizeNametagInput } from "@/lib/user-nametag";

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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dados");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [documentsBundle, setDocumentsBundle] = useState<TeamDocumentsBundle>(() => normalizeTeamDocuments());
  const [linkedNametagDraft, setLinkedNametagDraft] = useState("");
  const [nametagLookup, setNametagLookup] = useState<
    "idle" | "loading" | "linked" | "unlinked" | "need_auth" | "server_off" | "error"
  >("idle");
  const lookupGen = useRef(0);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setRole(member.role);
    setDateOfBirth(member.dateOfBirth ?? "");
    setDocumentsBundle(normalizeTeamDocuments(member.documents));
    setLinkedNametagDraft(member.linkedNametag ?? "");
    setNametagLookup("idle");
    setTab("dados");
  }, [member]);

  useEffect(() => {
    if (!open || !member) return;
    const norm = normalizeNametagInput(linkedNametagDraft);
    if (!norm) {
      setNametagLookup("idle");
      return;
    }
    if (!shouldUseCloudClientApis(user)) {
      setNametagLookup("need_auth");
      return;
    }
    setNametagLookup("loading");
    const gen = ++lookupGen.current;
    const t = window.setTimeout(() => {
      fetch(`/api/cloud/nametag/lookup?tag=${encodeURIComponent(norm)}`, { credentials: "include" })
        .then(async (res) => {
          if (lookupGen.current !== gen) return;
          const data = (await res.json()) as { ok?: boolean; exists?: boolean };
          if (!res.ok) {
            if (res.status === 401) setNametagLookup("need_auth");
            else if (res.status === 503) setNametagLookup("server_off");
            else setNametagLookup("error");
            return;
          }
          if (data.ok && data.exists) setNametagLookup("linked");
          else if (data.ok && data.exists === false) setNametagLookup("unlinked");
          else setNametagLookup("idle");
        })
        .catch(() => {
          if (lookupGen.current === gen) setNametagLookup("error");
        });
    }, 380);
    return () => {
      window.clearTimeout(t);
    };
  }, [linkedNametagDraft, open, member?.id, user?.id]);

  if (!open || !member) return null;

  const save = () => {
    const n = name.trim();
    if (!n) return;
    const ln = normalizeNametagInput(linkedNametagDraft);
    onSave(member.id, {
      name: n,
      role: role.trim() || "Staff",
      dateOfBirth: dateOfBirth || undefined,
      documents: normalizeTeamDocuments(documentsBundle),
      ...(ln ? { linkedNametag: ln } : { linkedNametag: undefined }),
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
          <div className="mt-3 max-w-sm">
            <label
              htmlFor="staff-linked-nametag"
              className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Nametag (conta CoachBuilder)
            </label>
            <div className="mt-1.5 flex items-center gap-0.5 rounded-xl border border-surface-border bg-black/30 px-2 py-1.5 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/25">
              <span className="shrink-0 pl-0.5 font-mono text-sm text-zinc-500" aria-hidden>
                @
              </span>
              <input
                id="staff-linked-nametag"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="ex. pedrosousa"
                value={linkedNametagDraft}
                onChange={(e) => setLinkedNametagDraft(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </div>
            {normalizeNametagInput(linkedNametagDraft) ? (
              <p className="mt-1.5 text-xs" role="status">
                {nametagLookup === "loading" ? (
                  <span className="text-zinc-500">A verificar…</span>
                ) : nametagLookup === "linked" ? (
                  <span className="text-emerald-400/95">Conta encontrada — associação válida.</span>
                ) : nametagLookup === "unlinked" ? (
                  <span className="text-amber-400/95">Ainda não existe conta com este nametag.</span>
                ) : nametagLookup === "need_auth" ? (
                  <span className="text-zinc-500">Inicia sessão na cloud para verificar o nametag.</span>
                ) : nametagLookup === "server_off" ? (
                  <span className="text-zinc-500">Verificação indisponível (servidor).</span>
                ) : (
                  <span className="text-zinc-600">Não foi possível verificar.</span>
                )}
              </p>
            ) : null}
          </div>
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
