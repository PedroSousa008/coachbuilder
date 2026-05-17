"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeLocalPublicPath } from "@/lib/public-asset-url";
import {
  getCoachExerciseVideoDataUrl,
  isCoachExerciseVideoUrl,
  parseCoachExerciseVideoId,
} from "@/lib/training-exercise-media";

function youtubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/")[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      const v = u.searchParams.get("v");
      return v && /^[\w-]{11}$/.test(v) ? v : null;
    }
  } catch {
    return null;
  }
  return null;
}

function mimeFromDataUrl(dataUrl: string): string | undefined {
  const m = /^data:([^;,]+)/.exec(dataUrl);
  return m?.[1];
}

export function TrainingVideoEmbed({
  videoUrl,
  fallbackVideoDataUrl,
  title = "Vídeo do exercício",
}: {
  videoUrl: string;
  /** Cópia guardada no exercício (fallback se a chave local falhar). */
  fallbackVideoDataUrl?: string;
  title?: string;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const [coachVideoSrc, setCoachVideoSrc] = useState<string | null>(null);
  const [coachVideoLoading, setCoachVideoLoading] = useState(false);
  const ytId = useMemo(() => youtubeVideoId(videoUrl), [videoUrl]);
  const isYoutube = ytId !== null;
  const isCoachVideo = isCoachExerciseVideoUrl(videoUrl);

  useEffect(() => {
    if (!isCoachVideo) {
      setCoachVideoSrc(null);
      setCoachVideoLoading(false);
      return;
    }
    const exerciseId = parseCoachExerciseVideoId(videoUrl);
    if (!exerciseId) {
      setCoachVideoSrc(fallbackVideoDataUrl ?? null);
      return;
    }
    let cancelled = false;
    setCoachVideoLoading(true);
    setMediaFailed(false);
    void getCoachExerciseVideoDataUrl(exerciseId).then((dataUrl) => {
      if (cancelled) return;
      const src = dataUrl ?? fallbackVideoDataUrl ?? null;
      setCoachVideoSrc(src);
      setCoachVideoLoading(false);
      if (!src) setMediaFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [videoUrl, isCoachVideo, fallbackVideoDataUrl]);

  if (isYoutube) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-surface-border bg-black/40">
        <div className="relative aspect-video w-full">
          <iframe
            title={title}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  const raw = isCoachVideo
    ? coachVideoSrc
    : videoUrl.startsWith("http://") || videoUrl.startsWith("https://") || videoUrl.startsWith("data:")
      ? videoUrl.trim()
      : encodeLocalPublicPath(videoUrl.startsWith("/") ? videoUrl.trim() : `/${videoUrl.trim()}`);
  const src = raw;
  const isLocalFile = !isCoachVideo && src?.startsWith("/");
  const videoMime = src?.startsWith("data:") ? mimeFromDataUrl(src) : undefined;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-raised/30 p-3">
      <p className="text-xs font-medium text-zinc-400">Vídeo de explicação</p>
      {coachVideoLoading ? (
        <p className="py-8 text-center text-sm text-zinc-500">A carregar vídeo…</p>
      ) : mediaFailed || !src ? (
        <p className="text-sm text-amber-200/90">
          {isCoachVideo
            ? "Vídeo do exercício não encontrado neste dispositivo. Volta ao quadro tático e carrega outra vez em Guardar Treino."
            : "Não foi possível carregar o ficheiro. Coloca o MP4 na pasta public ou substitui por um link YouTube."}
        </p>
      ) : (
        <video
          className="w-full max-h-[360px] rounded-lg bg-black"
          controls
          playsInline
          preload="metadata"
          title={title}
          onError={() => setMediaFailed(true)}
        >
          <source src={src} type={videoMime} />
        </video>
      )}
      {src && !isCoachVideo ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-accent hover:underline"
        >
          {isLocalFile ? "Abrir vídeo noutro separador" : "Abrir vídeo"}
        </a>
      ) : null}
    </div>
  );
}
