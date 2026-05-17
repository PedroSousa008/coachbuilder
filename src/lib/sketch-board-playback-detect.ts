/** Deteta se o browser consegue gravar E reproduzir o mesmo formato de vídeo. */

export function isAppleMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const ipadOs =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return ios || ipadOs;
}

export function canPlayVideoMime(mime: string): boolean {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  const base = mime.split(";")[0]!.trim();
  const full = v.canPlayType(mime);
  const plain = v.canPlayType(base);
  return full === "probably" || full === "maybe" || plain === "probably" || plain === "maybe";
}

/** MIME suportado pelo MediaRecorder e reproduzível neste dispositivo (prioriza MP4 em iOS). */
export function pickRecordablePlayableMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = isAppleMobileDevice()
    ? [
        "video/mp4",
        "video/mp4;codecs=avc1.42E01E",
        'video/mp4;codecs="avc1.42E01E, mp4a.40.2"',
        "video/webm;codecs=vp8",
        "video/webm",
      ]
    : [
        "video/webm;codecs=vp8",
        "video/webm;codecs=vp9",
        "video/webm",
        "video/mp4",
        "video/mp4;codecs=avc1.42E01E",
      ];

  for (const mime of candidates) {
    if (!MediaRecorder.isTypeSupported(mime)) continue;
    if (canPlayVideoMime(mime)) return mime;
  }

  if (isAppleMobileDevice()) return null;

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function shouldPreferFramePlayback(): boolean {
  return pickRecordablePlayableMimeType() === null;
}
