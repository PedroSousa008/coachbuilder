"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSettings() {
  const { language, setLanguage, languageOptions, t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.language.title")}</CardTitle>
        <p className="text-sm text-zinc-500">{t("settings.language.description")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="block text-sm text-zinc-400" htmlFor="language-select">
          {t("settings.language.current")}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as typeof language)}
          className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-200"
        >
          {languageOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">{t("settings.language.note")}</p>
      </CardContent>
    </Card>
  );
}
