import type { SketchBoardFrame } from "@/types";
import type { BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";
import type { SketchBoardPlaybackSpeed } from "@/lib/sketch-board";
import {
  putCoachExercisePlayback,
  type CoachExerciseFramesPlaybackRecord,
  type CoachExerciseVideoPlaybackRecord,
} from "@/lib/coach-exercise-playback-store";
import { recordBoardFramesToVideoBlob } from "@/lib/sketch-board-video-record";
import {
  pickRecordablePlayableMimeType,
  shouldPreferFramePlayback,
} from "@/lib/sketch-board-playback-detect";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function verifyVideoBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 1024) return false;
  const url = URL.createObjectURL(blob);
  try {
    return await Promise.race([
      new Promise<boolean>((resolve) => {
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("webkit-playsinline", "true");
        v.preload = "auto";
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          v.removeAttribute("src");
          v.load();
          resolve(ok);
        };
        v.onloadeddata = () => {
          if (v.videoWidth > 0) finish(true);
        };
        v.onloadedmetadata = () => {
          if (v.videoWidth > 0 && (Number.isFinite(v.duration) ? v.duration > 0 : true)) finish(true);
        };
        v.oncanplay = () => {
          if (v.videoWidth > 0) finish(true);
        };
        v.onerror = () => finish(false);
        v.src = url;
        v.load();
      }),
      sleep(6000).then(() => false),
    ]);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function storeVideoPlayback(exerciseId: string, blob: Blob): Promise<void> {
  const mime = blob.type || pickRecordablePlayableMimeType()?.split(";")[0] || "video/mp4";
  const record: CoachExerciseVideoPlaybackRecord = {
    id: exerciseId,
    kind: "video",
    blob,
    mime,
    size: blob.size,
    savedAt: new Date().toISOString(),
  };
  await putCoachExercisePlayback(record);
}

async function storeFramesPlayback(
  exerciseId: string,
  frames: SketchBoardFrame[],
  renderOpts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<void> {
  const record: CoachExerciseFramesPlaybackRecord = {
    id: exerciseId,
    kind: "frames",
    frames,
    renderOpts,
    speed,
    savedAt: new Date().toISOString(),
  };
  await putCoachExercisePlayback(record);
}

/**
 * Guarda demonstração do quadro: vídeo MP4/WebM quando o dispositivo suporta;
 * senão animação por frames (100% fiável em iPhone/iPad).
 */
export async function saveBoardExercisePlayback(
  exerciseId: string,
  frames: SketchBoardFrame[],
  renderOpts: BoardRenderOptions,
  speed: SketchBoardPlaybackSpeed
): Promise<"video" | "frames"> {
  if (!shouldPreferFramePlayback()) {
    try {
      const blob = await recordBoardFramesToVideoBlob(frames, renderOpts, speed);
      const ok = await verifyVideoBlob(blob);
      if (ok) {
        await storeVideoPlayback(exerciseId, blob);
        return "video";
      }
    } catch {
      /* fallback abaixo */
    }
  }

  await storeFramesPlayback(exerciseId, frames, renderOpts, speed);
  return "frames";
}
