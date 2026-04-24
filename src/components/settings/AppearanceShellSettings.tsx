"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useShellTheme } from "@/contexts/ShellThemeContext";

export function AppearanceShellSettings() {
  const { t } = useLanguage();
  const { theme, setTheme } = useShellTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.appearance.title")}</CardTitle>
        <CardDescription>{t("settings.appearance.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">{t("settings.appearance.modeLabel")}</p>
            <p className="mt-1 text-xs text-zinc-500">{t("settings.appearance.modeHint")}</p>
          </div>
          <div className="inline-flex rounded-xl border border-surface-border bg-surface-raised/50 p-1">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("settings.appearance.dark")}
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "bg-white text-[#0c1a2e] shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t("settings.appearance.light")}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
