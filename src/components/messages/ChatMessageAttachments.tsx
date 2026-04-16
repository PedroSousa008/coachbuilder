"use client";

import Link from "next/link";
import { FileText, ExternalLink, Download } from "lucide-react";
import type { ChatAttachment } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  isImageMime,
  isLikelyPdf,
  parseSavedExercisePayload,
  parseTrainingSessionPayload,
  sanitizeDownloadFileName,
} from "@/lib/chat-attachment-ui";

function labelFor(a: ChatAttachment, isPt: boolean): string {
  if (a.name?.trim()) return a.name.trim();
  switch (a.kind) {
    case "training_session":
      return isPt ? "Treino" : "Training";
    case "saved_exercise":
      return isPt ? "Exercício" : "Exercise";
    case "sketch_board":
      return "Sketch";
    default:
      return isPt ? "Ficheiro" : "File";
  }
}

function formatBytes(n: number | undefined, isPt: boolean): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMessageAttachments({
  attachments,
  mine,
}: {
  attachments: ChatAttachment[];
  mine: boolean;
}) {
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const openLabel = isPt ? "Abrir" : "Open";
  const downloadLabel = isPt ? "Descarregar" : "Download";
  const trainingCta = isPt ? "Ver em Treinos" : "View in Training";
  const sketchCta = isPt ? "Abrir área de sketch" : "Open sketch board";
  const unavailable = isPt ? "Pré-visualização indisponível para este tipo de ficheiro." : "No preview for this file type.";
  const appSnapshotHint = isPt ? "Conteúdo guardado na tua área de trabalho." : "Saved workspace snapshot.";

  if (!attachments.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a) => (
        <AttachmentRow
          key={a.id}
          a={a}
          mine={mine}
          isPt={isPt}
          label={(att) => labelFor(att, isPt)}
          openLabel={openLabel}
          downloadLabel={downloadLabel}
          trainingCta={trainingCta}
          sketchCta={sketchCta}
          unavailable={unavailable}
          appSnapshotHint={appSnapshotHint}
        />
      ))}
    </div>
  );
}

function AttachmentRow({
  a,
  mine,
  isPt,
  label,
  openLabel,
  downloadLabel,
  trainingCta,
  sketchCta,
  unavailable,
  appSnapshotHint,
}: {
  a: ChatAttachment;
  mine: boolean;
  isPt: boolean;
  label: (att: ChatAttachment) => string;
  openLabel: string;
  downloadLabel: string;
  trainingCta: string;
  sketchCta: string;
  unavailable: string;
  appSnapshotHint: string;
}) {
  const card = cn(
    "rounded-xl border px-3 py-2 text-xs",
    mine ? "border-zinc-800/80 bg-zinc-950/25" : "border-zinc-600/50 bg-black/20"
  );
  const name = label(a);
  const sizeStr = formatBytes(a.sizeBytes, isPt);

  if (a.kind === "file" && a.dataUrl) {
    const safe = sanitizeDownloadFileName(a.name);
    const img = isImageMime(a.mimeType);
    const pdf = isLikelyPdf(a.mimeType, a.name);

    return (
      <div className={card}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-200">{name}</p>
            {sizeStr ? <p className="mt-0.5 text-[10px] text-zinc-500">{sizeStr}</p> : null}
          </div>
          <FileText className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        </div>

        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.dataUrl} alt="" className="mt-2 max-h-56 w-full rounded-lg object-contain" />
        ) : pdf ? (
          <iframe
            title={safe}
            src={a.dataUrl}
            className="mt-2 h-52 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/40"
          />
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-zinc-500">{unavailable}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={a.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-zinc-800/80"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {openLabel}
          </a>
          <a
            href={a.dataUrl}
            download={safe}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800/80"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {downloadLabel}
          </a>
        </div>
      </div>
    );
  }

  if (a.kind === "training_session") {
    const p = parseTrainingSessionPayload(a.payloadJson);
    const displayTitle = p?.title ?? a.name?.trim();
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        {displayTitle ? <p className="mt-1 text-[11px] text-zinc-400">{displayTitle}</p> : null}
        {p?.date ? (
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {isPt ? "Data: " : "Date: "}
            {p.date}
          </p>
        ) : null}
        <Link
          href="/app/training"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {trainingCta}
        </Link>
      </div>
    );
  }

  if (a.kind === "saved_exercise") {
    const p = parseSavedExercisePayload(a.payloadJson);
    const displayTitle = p?.title ?? a.name?.trim();
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        {displayTitle ? <p className="mt-1 text-[11px] text-zinc-400">{displayTitle}</p> : null}
        {p?.category ? (
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {isPt ? "Categoria: " : "Category: "}
            {p.category}
          </p>
        ) : null}
        <Link
          href="/app/training"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {trainingCta}
        </Link>
      </div>
    );
  }

  if (a.kind === "sketch_board") {
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        {a.payloadJson ? <p className="mt-1 text-[11px] text-zinc-500">{appSnapshotHint}</p> : null}
        <Link
          href="/app/sketch"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {sketchCta}
        </Link>
      </div>
    );
  }

  if (a.kind === "file" && !a.dataUrl) {
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {isPt
            ? "O ficheiro não está disponível para abrir (mensagem antiga ou dados em falta)."
            : "This file cannot be opened (old message or missing data)."}
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className="font-medium text-zinc-200">{name}</p>
      <p className="mt-1 text-[11px] text-zinc-500">
        {isPt ? "Este anexo não tem dados para abrir." : "No data to open this attachment."}
      </p>
    </div>
  );
}
