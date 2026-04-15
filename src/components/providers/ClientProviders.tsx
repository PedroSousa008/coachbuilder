"use client";

import type { ReactNode } from "react";
import { AccentProvider } from "@/components/providers/AccentProvider";
import { CloudHeartbeat } from "@/components/providers/CloudHeartbeat";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

/** Remount ao mudar de conta para não gravar estado vazio sobre o storage do utilizador. */
function AppDataScoped({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const k = user?.id ?? "__guest__";
  return <AppDataProvider key={k}>{children}</AppDataProvider>;
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AccentProvider>
      <AuthProvider>
        <LanguageProvider>
          <CloudHeartbeat />
          <AppDataScoped>{children}</AppDataScoped>
        </LanguageProvider>
      </AuthProvider>
    </AccentProvider>
  );
}
