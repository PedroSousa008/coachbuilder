import type { ChatAttachment } from "@/types";

/** URL reproduzível (campo directo ou dentro de `payloadJson`). */
export function resolveAttachmentVideoUrl(a: ChatAttachment): string | undefined {
  if (a.videoUrl?.trim()) return a.videoUrl.trim();
  if (!a.payloadJson) return undefined;
  try {
    const p = JSON.parse(a.payloadJson) as { videoUrl?: string };
    if (typeof p.videoUrl === "string" && p.videoUrl.trim()) return p.videoUrl.trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Nome seguro para o atributo `download` (evita path traversal). */
export function sanitizeDownloadFileName(name: string | undefined): string {
  const n = (name ?? "document")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return n || "document";
}

export function isLikelyPdf(mime: string | undefined, name: string | undefined): boolean {
  if (mime?.toLowerCase().includes("pdf")) return true;
  return (name ?? "").toLowerCase().endsWith(".pdf");
}

export function isImageMime(mime: string | undefined): boolean {
  return Boolean(mime?.toLowerCase().startsWith("image/"));
}

export function isVideoMime(mime: string | undefined): boolean {
  return Boolean(mime?.toLowerCase().startsWith("video/"));
}

export function parseTrainingSessionPayload(
  payloadJson: string | undefined
): { sessionId?: string; title?: string; date?: string } | null {
  if (!payloadJson) return null;
  try {
    const o = JSON.parse(payloadJson) as Record<string, unknown>;
    return {
      sessionId: typeof o.sessionId === "string" ? o.sessionId : undefined,
      title: typeof o.title === "string" ? o.title : undefined,
      date: typeof o.date === "string" ? o.date : undefined,
    };
  } catch {
    return null;
  }
}

export function parseSavedExercisePayload(
  payloadJson: string | undefined
): { exerciseId?: string; title?: string; category?: string } | null {
  if (!payloadJson) return null;
  try {
    const o = JSON.parse(payloadJson) as Record<string, unknown>;
    return {
      exerciseId: typeof o.exerciseId === "string" ? o.exerciseId : undefined,
      title: typeof o.title === "string" ? o.title : undefined,
      category: typeof o.category === "string" ? o.category : undefined,
    };
  } catch {
    return null;
  }
}
