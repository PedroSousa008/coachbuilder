import type { TeamAttachedDocument, TeamDocumentsBundle, TeamDocumentKind } from "@/types";

export const TEAM_DOCUMENT_KIND_LABELS: Record<TeamDocumentKind, string> = {
  contract: "Contrato",
  medical: "Médico / atestado",
  identity: "Identificação",
  authorization: "Autorização",
  insurance: "Seguro",
  video: "Vídeo",
  image: "Imagem",
  pdf: "PDF",
  link: "Link",
  other: "Outro",
};

export function emptyTeamDocuments(): TeamDocumentsBundle {
  return { items: [] };
}

export function normalizeTeamDocuments(d?: TeamDocumentsBundle | null): TeamDocumentsBundle {
  return {
    contract: d?.contract?.url || d?.contract?.notes || d?.contract?.fileName ? { ...d.contract } : undefined,
    items: Array.isArray(d?.items) ? d.items.filter((x) => x && typeof x.id === "string") : [],
  };
}

export function newDocumentId(): string {
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Máx. ~600 KB em base64 para não estourar o localStorage. */
export const MAX_ATTACHMENT_BYTES = 600_000;

export async function readFileAsDataUrl(file: File): Promise<{ ok: true; dataUrl: string; fileName: string } | { ok: false; error: string }> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `Ficheiro demasiado grande (${Math.round(file.size / 1024)} KB). Máximo ~${Math.round(MAX_ATTACHMENT_BYTES / 1024)} KB ou cola um link (Drive, Dropbox, etc.).`,
    };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:")) {
        resolve({ ok: false, error: "Não foi possível ler o ficheiro." });
        return;
      }
      resolve({ ok: true, dataUrl, fileName: file.name });
    };
    reader.onerror = () => resolve({ ok: false, error: "Erro ao ler o ficheiro." });
    reader.readAsDataURL(file);
  });
}

export function presetQuickAdd(kind: TeamDocumentKind, title: string): TeamAttachedDocument {
  return {
    id: newDocumentId(),
    title,
    kind,
    addedAt: new Date().toISOString(),
  };
}
