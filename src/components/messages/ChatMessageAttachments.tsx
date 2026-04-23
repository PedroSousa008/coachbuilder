"use client";

import Link from "next/link";
import { FileText, ExternalLink, Download } from "lucide-react";
import type { ChatAttachment } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrainingVideoEmbed } from "@/components/training/TrainingVideoEmbed";
import {
  isImageMime,
  isLikelyPdf,
  isVideoMime,
  parseSavedExercisePayload,
  parseTrainingSessionPayload,
  resolveAttachmentVideoUrl,
  sanitizeDownloadFileName,
} from "@/lib/chat-attachment-ui";

function labelFor(a: ChatAttachment, isPt: boolean): string {
  if (a.name?.trim()) return a.name.trim();
  switch (a.kind) {
    case "training_session":
      return isPt ? "Treino" : "Training";
    case "saved_exercise":
      return isPt ? "Exercício" : "Exercise";
    case "training_catalog":
      return isPt ? "Vídeo do catálogo" : "Catalog video";
    case "sketch_board":
      return isPt ? "Sketch (tudo)" : "Sketch (full)";
    case "sketch_note":
      return isPt ? "Nota (Sketch)" : "Sketch note";
    case "sketch_saved_file":
      return isPt ? "Ficheiro (Sketch)" : "Sketch file";
    case "sketch_board_draft":
      return isPt ? "Quadro (Sketch)" : "Sketch board";
    case "sketch_task":
      return isPt ? "Tarefa (Sketch)" : "Sketch task";
    case "sketch_calendar_event":
      return isPt ? "Evento (Sketch)" : "Sketch event";
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

  /** MP4/YouTube via URL pública (catálogo, exercício guardado com vídeo) — todos veem o mesmo stream. */
  const playUrl = resolveAttachmentVideoUrl(a);
  if (playUrl) {
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        <div className="mt-2">
          <TrainingVideoEmbed videoUrl={playUrl} title={name} />
        </div>
        {a.kind === "training_catalog" || a.kind === "saved_exercise" || a.kind === "training_session" ? (
          <Link
            href="/app/training"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {trainingCta}
          </Link>
        ) : null}
      </div>
    );
  }

  /** Vídeo carregado como ficheiro (data URL). */
  if (a.kind === "file" && a.dataUrl && isVideoMime(a.mimeType)) {
    const safe = sanitizeDownloadFileName(a.name);
    return (
      <div className={card}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-200">{name}</p>
            {sizeStr ? <p className="mt-0.5 text-[10px] text-zinc-500">{sizeStr}</p> : null}
          </div>
          <FileText className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        </div>
        <video
          className="mt-2 w-full max-h-[min(360px,50vh)] rounded-lg bg-black"
          controls
          playsInline
          preload="metadata"
          title={name}
        >
          <source src={a.dataUrl} type={a.mimeType || "video/mp4"} />
        </video>
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
            download={safe.endsWith(".mp4") ? safe : `${safe}.mp4`}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800/80"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {downloadLabel}
          </a>
        </div>
      </div>
    );
  }

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

        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.dataUrl} alt="" className="mt-2 max-h-56 w-full rounded-lg object-contain" />
        ) : pdf ? (
          <>
            <p className="mt-2 text-[11px] leading-snug text-zinc-500 sm:hidden">
              {isPt
                ? "Em telemóvel ou iPad, usa «Abrir» se o PDF não aparecer em baixo."
                : "On phone or iPad, tap Open if the preview does not show below."}
            </p>
            <iframe
              title={safe}
              src={a.dataUrl}
              className="mt-2 hidden h-52 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/40 sm:block"
            />
            <object
              data={a.dataUrl}
              type={a.mimeType || "application/pdf"}
              className="mt-2 h-48 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/40 sm:hidden"
              aria-label={safe}
            >
              <span className="sr-only">PDF</span>
            </object>
          </>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-zinc-500">{unavailable}</p>
        )}
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

  if (a.kind === "training_catalog") {
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {isPt ? "Vídeo do catálogo sem URL (mensagem antiga)." : "Catalog video URL missing (old message)."}
        </p>
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

  if (
    a.kind === "sketch_note" ||
    a.kind === "sketch_saved_file" ||
    a.kind === "sketch_board_draft" ||
    a.kind === "sketch_task" ||
    a.kind === "sketch_calendar_event"
  ) {
    const typeLabel =
      a.kind === "sketch_note"
        ? isPt
          ? "Nota"
          : "Note"
        : a.kind === "sketch_saved_file"
          ? isPt
            ? "Ficheiro"
            : "File"
          : a.kind === "sketch_board_draft"
            ? isPt
              ? "Quadro táctico"
              : "Tactics board"
            : a.kind === "sketch_task"
              ? isPt
                ? "Tarefa"
                : "Task"
              : isPt
                ? "Evento"
                : "Event";
    return (
      <div className={card}>
        <p className="font-medium text-zinc-200">{name}</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{typeLabel}</p>
        <p className="mt-1 text-[11px] text-zinc-500">{appSnapshotHint}</p>
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
