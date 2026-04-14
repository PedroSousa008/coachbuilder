import { Suspense } from "react";
import { TeamAccentSettings } from "@/components/settings/TeamAccentSettings";
import { DataPersistenceNotice } from "@/components/settings/DataPersistenceNotice";
import { CloudAccountSettings } from "@/components/settings/CloudAccountSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <TeamAccentSettings />

      <DataPersistenceNotice />

      <Suspense fallback={<p className="text-sm text-zinc-500">A carregar subscrição…</p>}>
        <SubscriptionSettings />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-400">
          <CloudAccountSettings />
          <p>
            Email e palavra-passe da conta estão guardados neste dispositivo. Para alterar a palavra-passe, contacta o
            suporte ou aguarda a opção na app.
          </p>
          <a href="/app/profile" className="inline-flex text-accent hover:underline">
            Edit profile →
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <p className="text-sm text-zinc-500">Choose what reaches your phone on matchday.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "n1", label: "New squad messages", desc: "Group chat and DMs" },
            { id: "n2", label: "Session reminders", desc: "24h before training" },
            { id: "n3", label: "Matchday brief", desc: "Lineup & set-piece PDF (soon)" },
          ].map((n) => (
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
