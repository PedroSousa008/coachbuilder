import type { CSSProperties } from "react";
import type { PlayerPhotoFrame } from "@/types";

export const PHOTO_FRAME_DEFAULT: PlayerPhotoFrame = { posX: 50, posY: 50, zoom: 1 };

export function normalizePlayerPhotoFrame(f: Partial<PlayerPhotoFrame> | undefined): PlayerPhotoFrame {
  const posX = Math.min(100, Math.max(0, Math.round(Number(f?.posX) || 50)));
  const posY = Math.min(100, Math.max(0, Math.round(Number(f?.posY) || 50)));
  const zoom = Math.min(2.75, Math.max(1, Math.round((Number(f?.zoom) || 1) * 100) / 100));
  return { posX, posY, zoom };
}

export function photoFrameImgStyle(frame: PlayerPhotoFrame | undefined): CSSProperties {
  const { posX, posY, zoom } = normalizePlayerPhotoFrame(frame);
  return {
    objectFit: "cover",
    objectPosition: `${posX}% ${posY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${posX}% ${posY}%`,
  };
}
