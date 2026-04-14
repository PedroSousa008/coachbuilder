"use client";

import { useCallback } from "react";
import { ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import type { TeamAttachedDocument, TeamDocumentsBundle, TeamDocumentKind } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  newDocumentId,
  normalizeTeamDocuments,
  presetQuickAdd,
  readFileAsDataUrl,
  TEAM_DOCUMENT_KIND_LABELS,
} from "@/lib/team-documents";

const QUICK_PRESETS: { kind: TeamDocumentKind; title: string }[] = [
  { kind: "medical", title: "Atestado médico" },
  { kind: "authorization", title: "Autorização parental / RGPD" },
  { kind: "insurance", title: "Seguro desportivo" },
  { kind: "video", title: "Vídeo de análise" },
  { kind: "image", title: "Foto / registo visual" },
  { kind: "pdf", title: "Relatório / PDF" },
];

type Props = {
  contractTitle: string;
  bundle: TeamDocumentsBundle;
  onChange: (next: TeamDocumentsBundle) => void;
};

export function TeamDocumentsPanel({ contractTitle, bundle, onChange }: Props) {
  const b = normalizeTeamDocuments(bundle);
  const contract = b.contract ?? {};

  const setContract = useCallback(
    (patch: Partial<NonNullable<TeamDocumentsBundle["contract"]>>) => {
      onChange(
        normalizeTeamDocuments({
          ...b,
          contract: { ...contract, ...patch, updatedAt: new Date().toISOString() },
        })
      );
    },
    [b, contract, onChange]
  );

  const setItems = useCallback(
    (items: TeamAttachedDocument[]) => {
      onChange(normalizeTeamDocuments({ ...b, items }));
    },
    [b, onChange]
  );

  const addBlank = () => {
    const doc: TeamAttachedDocument = {
      id: newDocumentId(),
      title: "Novo documento",
      kind: "other",
      addedAt: new Date().toISOString(),
    };
    setItems([...b.items, doc]);
  };

  const addPreset = (kind: TeamDocumentKind, title: string) => {
    setItems([...b.items, presetQuickAdd(kind, title)]);
  };

  const patchItem = (id: string, patch: Partial<TeamAttachedDocument>) => {
    setItems(b.items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeItem = (id: string) => {
    setItems(b.items.filter((x) => x.id !== id));
  };

  const onContractFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = await readFileAsDataUrl(file);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    setContract({ url: res.dataUrl, fileName: res.fileName });
  };

  const onItemFile = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = await readFileAsDataUrl(file);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    patchItem(id, { url: res.dataUrl, fileName: res.fileName });
  };

  const contractUrl = contract.url?.trim() ?? "";
  const showContractLink = contractUrl.startsWith("http");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/35 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">{contractTitle}</h4>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Liga o PDF do contrato (Google Drive, Dropbox, OneDrive) ou anexa um ficheiro leve. Para ficheiros
              grandes, usa sempre um link.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="td-contract-url">
              Link do documento
            </label>
            <Input
              id="td-contract-url"
              className="mt-1"
              placeholder="https://…"
              value={contractUrl.startsWith("data:") ? "" : contractUrl}
              onChange={(e) => setContract({ url: e.target.value.trim() || undefined, fileName: undefined })}
            />
            {contractUrl.startsWith("data:") ? (
              <p className="mt-1 text-xs text-emerald-400/90">
                Anexo local: {contract.fileName ?? "ficheiro"} ·{" "}
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => setContract({ url: undefined, fileName: undefined })}
                >
                  remover
                </button>
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="td-contract-notes">
              Notas (opcional)
            </label>
            <textarea
              id="td-contract-notes"
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              placeholder="Observações sobre a validade, cláusulas, etc."
              value={contract.notes ?? ""}
              onChange={(e) => setContract({ notes: e.target.value.trim() || undefined })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Anexar ficheiro (PDF, imagem, vídeo curto)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*,video/*"
              className="mt-1 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent"
              onChange={(e) => void onContractFile(e)}
            />
            <p className="mt-1 text-[11px] text-zinc-600">máx. ~600 KB em anexo; acima disso usa um link.</p>
          </div>
          {showContractLink ? (
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir link do contrato
            </a>
          ) : null}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white">Outros documentos</h4>
        <p className="mt-1 text-xs text-zinc-500">
          Adiciona atestados, autorizações, vídeos de análise, relatórios ou qualquer referência útil.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => addPreset(p.kind, p.title)}
              className="rounded-lg border border-surface-border bg-black/30 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-accent/40 hover:text-zinc-200"
            >
              + {p.title}
            </button>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3 flex items-center gap-2" onClick={addBlank}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Documento em branco
        </Button>
      </div>

      <ul className="space-y-4">
        {b.items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-surface-border bg-black/25 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-500">Título</label>
                  <Input
                    className="mt-1"
                    value={item.title}
                    onChange={(e) => patchItem(item.id, { title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Tipo</label>
                  <select
                    value={item.kind}
                    onChange={(e) => patchItem(item.id, { kind: e.target.value as TeamDocumentKind })}
                    className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
                  >
                    {(Object.keys(TEAM_DOCUMENT_KIND_LABELS) as TeamDocumentKind[]).map((k) => (
                      <option key={k} value={k}>
                        {TEAM_DOCUMENT_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Link (opcional)</label>
                  <Input
                    className="mt-1"
                    placeholder="https://…"
                    value={item.url?.startsWith("data:") ? "" : (item.url ?? "")}
                    onChange={(e) =>
                      patchItem(item.id, { url: e.target.value.trim() || undefined, fileName: undefined })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-500">Notas</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white"
                    value={item.notes ?? ""}
                    onChange={(e) => patchItem(item.id, { notes: e.target.value.trim() || undefined })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-500">Anexar ficheiro</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*,video/*"
                    className="mt-1 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent"
                    onChange={(e) => void onItemFile(item.id, e)}
                  />
                  {item.url?.startsWith("data:") ? (
                    <p className="mt-1 text-xs text-emerald-400/90">
                      Anexo: {item.fileName ?? "ficheiro"}{" "}
                      <button
                        type="button"
                        className="text-accent underline"
                        onClick={() => patchItem(item.id, { url: undefined, fileName: undefined })}
                      >
                        remover
                      </button>
                    </p>
                  ) : null}
                </div>
                {item.url?.startsWith("http") ? (
                  <div className="sm:col-span-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir link
                    </a>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                aria-label="Remover documento"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {b.items.length === 0 ? (
        <p className="text-center text-xs text-zinc-600">Ainda não há outros documentos. Usa os atalhos acima ou «Documento em branco».</p>
      ) : null}
    </div>
  );
}
