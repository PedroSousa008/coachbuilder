import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TeamAccentSettings } from "@/components/settings/TeamAccentSettings";
import { mockCoach } from "@/data/mock";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <TeamAccentSettings />

      <div>
        <h2 className="font-display text-lg font-semibold text-white">Subscription</h2>
        <p className="text-sm text-zinc-500">
          Messages stay free forever. Unlock the full coaching workspace with Coach Pro at €5/month (billing not
          connected in this MVP).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-sm text-zinc-500">€0 — squad communication</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-300">
              {["Team group chat", "Direct messages"].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-600">You are on: {mockCoach.plan === "free" ? "Free" : "Coach Pro"}</p>
          </CardContent>
        </Card>

        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Coach Pro
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-zinc-950">€5/mo</span>
            </CardTitle>
            <p className="text-sm text-zinc-500">Tactics, training, video, roster & more</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-zinc-300">
              {[
                "Tactics board & saved ideas",
                "Training plan builder",
                "Video analysis workspace",
                "Team roster & availability",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
            <Button type="button" className="w-full">
              Upgrade (demo — no charge)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-400">
          <p>Authentication, password, and connected devices will appear here.</p>
          <Link href="/app/profile" className="inline-flex text-accent hover:underline">
            Edit profile →
          </Link>
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
