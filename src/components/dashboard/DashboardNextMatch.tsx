"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/contexts/AppDataContext";
import { formatKickoff } from "@/lib/format";

export function DashboardNextMatch() {
  const { fixtures, hydrated } = useAppData();

  const next = useMemo(() => {
    const t = Date.now() - 3600000;
    const upcoming = fixtures
      .filter((f) => new Date(f.kickoff).getTime() >= t)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    return upcoming[0];
  }, [fixtures]);

  if (!hydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!next) {
    return (
      <>
        <p className="text-sm text-zinc-400">No upcoming fixture yet.</p>
        <Link href="/app/calendar" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Add fixtures in Calendar
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-lg font-semibold text-white">{next.opponent}</p>
      <p className="mt-1 text-sm text-zinc-500">{next.competition}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="accent">{next.venue === "home" ? "Home" : "Away"}</Badge>
        <Badge variant="default">{formatKickoff(next.kickoff)}</Badge>
      </div>
      <div className="mt-6 flex flex-wrap gap-4 gap-y-2">
        <Link href="/app/tactics" className="text-sm font-medium text-accent hover:underline">
          Open match tactics
        </Link>
        <Link href="/app/calendar" className="text-sm font-medium text-zinc-500 hover:text-zinc-300">
          Calendar
        </Link>
      </div>
    </>
  );
}
