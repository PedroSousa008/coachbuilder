import type { ChatAttachment, ChatAttachmentKind } from "@/types";

export const CHAT_ATTACHMENT_MAX_BYTES = 2_500_000;
export const CHAT_ATTACHMENTS_MAX_JSON_CHARS = 3_500_000;

export function uidAttachment(prefix = "att"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function estimateAttachmentSize(a: ChatAttachment): number {
  let n = 0;
  if (a.dataUrl) n += a.dataUrl.length * 2;
  if (a.payloadJson) n += a.payloadJson.length * 2;
  if (a.name) n += a.name.length * 2;
  if (a.mimeType) n += a.mimeType.length * 2;
  return n;
}

export function validateAttachmentPayload(attachments: ChatAttachment[] | undefined): string | null {
  if (!attachments?.length) return null;
  let totalChars = 0;
  for (const a of attachments) {
    totalChars += estimateAttachmentSize(a);
    if (totalChars > CHAT_ATTACHMENTS_MAX_JSON_CHARS) {
      return "Anexos demasiado grandes.";
    }
    if (a.dataUrl && a.dataUrl.length > CHAT_ATTACHMENT_MAX_BYTES) {
      return "Um ficheiro anexo é demasiado grande.";
    }
    if (a.payloadJson && a.payloadJson.length > CHAT_ATTACHMENT_MAX_JSON_CHARS) {
      return "Dados do anexo demasiado grandes.";
    }
  }
  return null;
}

export function messagePreviewLine(body: string, attachments?: ChatAttachment[] | undefined): string {
  const t = body.trim();
  if (t) return t;
  if (!attachments?.length) return "";
  if (attachments.length === 1) {
    const n = attachments[0]!.name?.trim();
    return n ? `📎 ${n}` : "📎 Anexo";
  }
  return `📎 ${attachments.length} anexos`;
}

export function clipPreviewLine(line: string, max = 72): string {
  if (line.length <= max) return line;
  return `${line.slice(0, max)}…`;
}

export function parseChatAttachmentsFromApi(raw: unknown): ChatAttachment[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const kind = o.kind as ChatAttachmentKind;
    if (!id || !isChatAttachmentKind(kind)) continue;
    out.push({
      id,
      kind,
      name: typeof o.name === "string" ? o.name : undefined,
      mimeType: typeof o.mimeType === "string" ? o.mimeType : undefined,
      sizeBytes: typeof o.sizeBytes === "number" && Number.isFinite(o.sizeBytes) ? o.sizeBytes : undefined,
      dataUrl: typeof o.dataUrl === "string" ? o.dataUrl : undefined,
      payloadJson: typeof o.payloadJson === "string" ? o.payloadJson : undefined,
    });
  }
  return out.length ? out : undefined;
}

function isChatAttachmentKind(k: unknown): k is ChatAttachmentKind {
  return k === "file" || k === "training_session" || k === "saved_exercise" || k === "sketch_board";
}

export async function buildChatAttachmentFromFile(file: File): Promise<ChatAttachment | null> {
  if (file.size > CHAT_ATTACHMENT_MAX_BYTES) return null;
  const id = uidAttachment();
  const mimeType = file.type || "application/octet-stream";
  const dataUrl = await readFileAsDataUrl(file);
  return { id, kind: "file", name: file.name, mimeType, sizeBytes: file.size, dataUrl };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}
