import {
  deleteCoachExercisePrintImageBlob,
  getCoachExercisePrintImageBlob,
  putCoachExercisePrintImageBlob,
} from "@/lib/coach-exercise-print-image-store";

const objectUrlCache = new Map<string, string>();

function revokeCached(exerciseId: string) {
  const prev = objectUrlCache.get(exerciseId);
  if (prev?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  objectUrlCache.delete(exerciseId);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/** Guarda JPEG do quadro para impressão em PDF (blob em IDB). */
export async function storeCoachExercisePrintImage(
  exerciseId: string,
  jpegDataUrl: string
): Promise<void> {
  if (!jpegDataUrl.startsWith("data:image/")) return;
  const blob = await dataUrlToBlob(jpegDataUrl);
  if (!blob || blob.size < 256) return;
  await putCoachExercisePrintImageBlob(exerciseId, blob);
  revokeCached(exerciseId);
  objectUrlCache.set(exerciseId, URL.createObjectURL(blob));
}

/**
 * URL para `<img>` no PDF — só exercícios do quadro tático.
 * Catálogo built-in deve usar sempre `training-exercises/` por título.
 */
export async function getCoachExercisePrintImageSrc(
  exerciseId: string,
  fallbackDataUrl?: string
): Promise<string | undefined> {
  const cached = objectUrlCache.get(exerciseId);
  if (cached) return cached;

  let blob = await getCoachExercisePrintImageBlob(exerciseId);
  if (!blob && fallbackDataUrl?.startsWith("data:image/")) {
    blob = await dataUrlToBlob(fallbackDataUrl);
    if (blob) {
      await putCoachExercisePrintImageBlob(exerciseId, blob).catch(() => {});
    }
  }
  if (!blob) {
    if (fallbackDataUrl?.startsWith("data:image/")) return fallbackDataUrl;
    return undefined;
  }

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(exerciseId, url);
  return url;
}

export async function deleteCoachExercisePrintImage(exerciseId: string): Promise<void> {
  revokeCached(exerciseId);
  await deleteCoachExercisePrintImageBlob(exerciseId).catch(() => {});
}
