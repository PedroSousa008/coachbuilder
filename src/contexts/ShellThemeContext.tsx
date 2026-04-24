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
import { useAuth } from "@/contexts/AuthContext";
import {
  applyShellThemeToDocument,
  readShellTheme,
  writeShellTheme,
  type AppShellTheme,
} from "@/lib/shell-theme";

type ShellThemeContextValue = {
  theme: AppShellTheme;
  setTheme: (t: AppShellTheme) => void;
};

const ShellThemeContext = createContext<ShellThemeContextValue | null>(null);

export function ShellThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [theme, setThemeState] = useState<AppShellTheme>("dark");

  useEffect(() => {
    setThemeState(readShellTheme(uid));
  }, [uid]);

  useEffect(() => {
    applyShellThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback(
    (t: AppShellTheme) => {
      setThemeState(t);
      writeShellTheme(uid, t);
      applyShellThemeToDocument(t);
    },
    [uid]
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ShellThemeContext.Provider value={value}>{children}</ShellThemeContext.Provider>;
}

export function useShellTheme(): ShellThemeContextValue {
  const ctx = useContext(ShellThemeContext);
  if (!ctx) {
    throw new Error("useShellTheme must be used within ShellThemeProvider");
  }
  return ctx;
}
