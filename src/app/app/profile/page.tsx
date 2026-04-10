"use client";

import { useMemo, useState } from "react";
import { mockCoach } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function initialsFromName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export default function ProfilePage() {
  const [name, setName] = useState(mockCoach.name);
  const [club, setClub] = useState(mockCoach.club);
  const [role, setRole] = useState(mockCoach.role);
  const [email, setEmail] = useState(mockCoach.email);

  const avatarLetters = useMemo(() => initialsFromName(name), [name]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-zinc-800 font-display text-2xl font-bold text-white">
          {avatarLetters}
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">
            {name.trim() || "Your name"}
          </h2>
          <p className="text-sm text-zinc-500">
            {club.trim() || "Your club"} · {role}
          </p>
          <div className="mt-3">
            <Badge variant={mockCoach.plan === "pro" ? "accent" : "default"}>
              {mockCoach.plan === "pro" ? "Coach Pro" : "Free plan"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Tactics created", value: mockCoach.tacticsCreated },
          { label: "Sessions planned", value: mockCoach.sessionsPlanned },
          { label: "Matches analyzed", value: mockCoach.matchesAnalyzed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-border bg-surface-raised/50 p-4 text-center">
            <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <p className="text-sm text-zinc-500">Editable fields — saves when you connect a backend.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-club">
              Club
            </label>
            <input
              id="p-club"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-role">
              Role
            </label>
            <input
              id="p-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="p-email">
              Email
            </label>
            <input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Button type="button" variant="secondary" disabled>
            Save changes (demo)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
