export const ACCENT_PRESETS = [
  {
    id: "red",
    label: "Red",
    rgb: [220, 38, 38] as const,
    mutedRgb: [185, 28, 28] as const,
  },
  {
    id: "blue",
    label: "Blue",
    rgb: [37, 99, 235] as const,
    mutedRgb: [29, 78, 216] as const,
  },
  {
    id: "yellow",
    label: "Yellow",
    rgb: [234, 179, 8] as const,
    mutedRgb: [202, 138, 4] as const,
  },
  {
    id: "white",
    label: "White",
    rgb: [245, 245, 245] as const,
    mutedRgb: [212, 212, 216] as const,
  },
  {
    id: "green",
    label: "Green",
    rgb: [34, 197, 94] as const,
    mutedRgb: [22, 163, 74] as const,
  },
  {
    id: "orange",
    label: "Orange",
    rgb: [249, 115, 22] as const,
    mutedRgb: [234, 88, 12] as const,
  },
  {
    id: "purple",
    label: "Purple",
    rgb: [147, 51, 234] as const,
    mutedRgb: [126, 34, 206] as const,
  },
] as const;

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]["id"];

export const DEFAULT_ACCENT_ID: AccentPresetId = "red";

export const ACCENT_STORAGE_KEY = "coachbuilder-accent";

export function getAccentPreset(id: string | null | undefined) {
  if (!id) return ACCENT_PRESETS.find((p) => p.id === DEFAULT_ACCENT_ID)!;
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS.find((p) => p.id === DEFAULT_ACCENT_ID)!;
}

export function isAccentPresetId(id: string): id is AccentPresetId {
  return ACCENT_PRESETS.some((p) => p.id === id);
}
