"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCENT_PRESETS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
  getAccentPreset,
  isAccentPresetId,
  type AccentPresetId,
} from "@/lib/accent-presets";

function applyCssVars(preset: (typeof ACCENT_PRESETS)[number]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent-rgb", preset.rgb.join(" "));
  root.style.setProperty("--accent-muted-rgb", preset.mutedRgb.join(" "));
}

type AccentContextValue = {
  presetId: AccentPresetId;
  setPresetId: (id: AccentPresetId) => void;
  presets: typeof ACCENT_PRESETS;
  hydrated: boolean;
};

const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: ReactNode }) {
  const [presetId, setPresetIdState] = useState<AccentPresetId>(DEFAULT_ACCENT_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(ACCENT_STORAGE_KEY);
    const next = raw && isAccentPresetId(raw) ? raw : DEFAULT_ACCENT_ID;
    setPresetIdState(next);
    applyCssVars(getAccentPreset(next));
    setHydrated(true);
  }, []);

  const setPresetId = useCallback((id: AccentPresetId) => {
    const preset = getAccentPreset(id);
    setPresetIdState(preset.id);
    localStorage.setItem(ACCENT_STORAGE_KEY, preset.id);
    applyCssVars(preset);
  }, []);

  const value = useMemo(
    () => ({ presetId, setPresetId, presets: ACCENT_PRESETS, hydrated }),
    [presetId, setPresetId, hydrated]
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    throw new Error("useAccent must be used within AccentProvider");
  }
  return ctx;
}
