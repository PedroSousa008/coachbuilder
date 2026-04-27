"use client";

import { useMemo, useState } from "react";
import { encodeLocalPublicPath } from "@/lib/public-asset-url";

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

export function TrainingVideoEmbed({
  videoUrl,
  title = "Vídeo do exercício",
}: {
  videoUrl: string;
  title?: string;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const ytId = useMemo(() => youtubeVideoId(videoUrl), [videoUrl]);
  const isYoutube = ytId !== null;

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

  const raw =
    videoUrl.startsWith("http://") || videoUrl.startsWith("https://")
      ? videoUrl.trim()
      : encodeLocalPublicPath(videoUrl.startsWith("/") ? videoUrl.trim() : `/${videoUrl.trim()}`);
  const src = raw;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-raised/30 p-3">
      <p className="text-xs font-medium text-zinc-400">Vídeo de explicação</p>
      {mediaFailed ? (
        <p className="text-sm text-amber-200/90">
          Não foi possível carregar o ficheiro. Coloca o MP4 na pasta{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-300">
            public{src.startsWith("/") ? src : `/${src}`}
          </code>{" "}
          (URL na app: <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">{src}</code>) ou substitui por um link
          YouTube no código.
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
          <source src={src} />
        </video>
      )}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-accent hover:underline"
      >
        Abrir vídeo noutro separador
      </a>
    </div>
  );
}
