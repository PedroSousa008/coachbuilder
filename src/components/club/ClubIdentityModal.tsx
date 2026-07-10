"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { ClubCrestBadge } from "@/components/club/ClubCrestBadge";
import { imageFileToCompressedJpegDataUrl } from "@/lib/profile-avatar-compress";
import { cn } from "@/lib/utils";

export function ClubIdentityModal({
  open,
  onClose,
  clubName,
  crestDataUrl,
  onSaveCrest,
  onRemoveCrest,
  isPt,
}: {
  open: boolean;
  onClose: () => void;
  clubName: string;
  crestDataUrl?: string;
  onSaveCrest: (dataUrl: string) => void;
  onRemoveCrest: () => void;
  isPt: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const pickFile = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await imageFileToCompressedJpegDataUrl(file, {
        initialMaxSide: 512,
        maxOutputBytes: 400_000,
      });
      onSaveCrest(dataUrl);
      onClose();
    } catch {
      setErr(isPt ? "Não foi possível carregar a imagem." : "Could not load the image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-identity-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[22px] border border-white/[0.08] bg-[#111111] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="club-identity-title" className="font-display text-lg font-semibold text-white">
              {isPt ? "Identidade do clube" : "Club identity"}
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">
              {isPt
                ? "O brasão aparece no dashboard e em toda a aplicação."
                : "Your crest appears on the dashboard and throughout the app."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white"
            aria-label={isPt ? "Fechar" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <ClubCrestBadge crestDataUrl={crestDataUrl} clubName={clubName} size="lg" />
          {clubName.trim() ? (
            <p className="text-[15px] font-medium text-zinc-300">{clubName.trim()}</p>
          ) : null}
        </div>

        {err ? <p className="mt-4 text-sm text-red-400/90">{err}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={pickFile}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-zinc-950 transition-colors hover:bg-accent-muted disabled:opacity-60"
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {crestDataUrl
              ? isPt
                ? "Substituir brasão"
                : "Replace crest"
              : isPt
                ? "Carregar brasão"
                : "Upload crest"}
          </button>
          {crestDataUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onRemoveCrest();
                onClose();
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-zinc-300 hover:border-red-500/30 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              {isPt ? "Remover" : "Remove"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
