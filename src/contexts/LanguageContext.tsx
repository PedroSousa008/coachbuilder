"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  tFor,
  type AppLanguage,
  type TranslationKey,
} from "@/lib/i18n";

const STORAGE_KEY = "coachbuilder-language-v1";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  t: (key: TranslationKey) => string;
  languageOptions: Array<{ id: AppLanguage; label: string }>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (isSupportedLanguage(raw)) setLanguageState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key) => tFor(language, key),
      languageOptions: SUPPORTED_LANGUAGES.map((id) => ({ id, label: LANGUAGE_LABELS[id] })),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
