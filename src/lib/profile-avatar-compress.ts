export type JpegCompressOpts = {
  /** Tamanho máximo do data URL (bytes aprox. em base64). */
  maxOutputBytes?: number;
  /** Lado máximo inicial (px) antes de reduzir. */
  initialMaxSide?: number;
};

/** Alvo conservador para data URL em localStorage / payload JSON. */
const DEFAULT_MAX_OUTPUT_BYTES = 950_000;
const DEFAULT_INITIAL_MAX_SIDE = 640;

function dataUrlByteLength(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  if (i < 0) return 0;
  const b64 = dataUrl.slice(i + 1);
  return Math.floor((b64.length * 3) / 4);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("load-failed"));
    };
    img.src = objectUrl;
  });
}

/**
 * Redimensiona e exporta JPEG até caber no limite (por omissão ~950 KB).
 * Usado para fotos de perfil e cartas de jogador.
 */
export async function imageFileToCompressedJpegDataUrl(
  file: File,
  opts?: JpegCompressOpts
): Promise<string> {
  const MAX_OUTPUT_BYTES = opts?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const INITIAL_MAX_SIDE = opts?.initialMaxSide ?? DEFAULT_INITIAL_MAX_SIDE;

  const img = await loadImageFromFile(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) throw new Error("invalid-dimensions");

  let maxSide = INITIAL_MAX_SIDE;

  for (let round = 0; round < 8; round++) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const cw = Math.max(1, Math.round(width * scale));
    const ch = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");

    if (file.type === "image/png" || file.type === "image/webp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(img, 0, 0, cw, ch);

    for (let q = 0.9; q >= 0.38; q -= 0.07) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      if (dataUrlByteLength(dataUrl) <= MAX_OUTPUT_BYTES) {
        return dataUrl;
      }
    }

    maxSide = Math.max(96, Math.floor(maxSide * 0.72));
  }

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 96, 96);
  ctx.drawImage(img, 0, 0, 96, 96);
  return canvas.toDataURL("image/jpeg", 0.38);
}
