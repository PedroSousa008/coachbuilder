 "use client";

import { Suspense } from "react";
import { TeamAccentSettings } from "@/components/settings/TeamAccentSettings";
import { DataPersistenceNotice } from "@/components/settings/DataPersistenceNotice";
import { CloudAccountSettings } from "@/components/settings/CloudAccountSettings";
import { ClubPresidentLinkSettings } from "@/components/settings/ClubPresidentLinkSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();
  const notifications = [
    {
      id: "n1",
      label: t("settings.notif.newMessages.label"),
      desc: t("settings.notif.newMessages.desc"),
    },
    {
      id: "n2",
      label: t("settings.notif.sessionReminder.label"),
      desc: t("settings.notif.sessionReminder.desc"),
    },
    {
      id: "n3",
      label: t("settings.notif.matchday.label"),
      desc: t("settings.notif.matchday.desc"),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Suspense fallback={<p className="text-sm text-zinc-500">A carregar subscrição…</p>}>
        <SubscriptionSettings />
      </Suspense>

      <LanguageSettings />

      <TeamAccentSettings />

      <DataPersistenceNotice />

      <ClubPresidentLinkSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-400">
          <CloudAccountSettings />
          <p>{t("settings.accountHelp")}</p>
          <a href="/app/profile" className="inline-flex text-accent hover:underline">
            {t("settings.editProfile")} →
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notifications")}</CardTitle>
          <p className="text-sm text-zinc-500">{t("settings.notificationsDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifications.map((n) => (
            <label
              key={n.id}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-raised/40 p-4"
            >
              <div>
                <p className="font-medium text-zinc-200">{n.label}</p>
                <p className="text-xs text-zinc-500">{n.desc}</p>
              </div>
              <input type="checkbox" defaultChecked={n.id === "n1"} className="mt-1 h-4 w-4 rounded border-zinc-600" />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
