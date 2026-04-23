"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { resolveNextMatchForCoach } from "@/lib/next-match";
import { collectUniqueTeamNames, pickBestTeamMatch } from "@/lib/team-match";

export function AppHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadMessagesCount, conversations, fixtures, leagueMatches, leagueCompetitionName, coachProfile, leagueTableRows, sketchArea } =
    useAppData();
  const { t } = useLanguage();
  const nowMs = useScheduleNow();

  const teamCandidateNames = useMemo(
    () => collectUniqueTeamNames({ tableRows: leagueTableRows, matches: leagueMatches }),
    [leagueTableRows, leagueMatches]
  );
  const canonicalClub = useMemo(() => {
    const c = coachProfile.club.trim();
    if (!c || teamCandidateNames.length === 0) return null;
    return pickBestTeamMatch(c, teamCandidateNames);
  }, [coachProfile.club, teamCandidateNames]);
  const nextMatch = useMemo(
    () =>
      resolveNextMatchForCoach({
        coachClub: coachProfile.club,
        coachClubCanonical: canonicalClub?.name ?? null,
        leagueCompetitionName,
        leagueMatches,
        manualFixtures: fixtures,
        teamCandidateNames,
        nowMs,
      }),
    [coachProfile.club, canonicalClub?.name, leagueCompetitionName, leagueMatches, fixtures, teamCandidateNames, nowMs]
  );

  const nextMatchFromCalendar = useMemo(() => {
    const rows = fixtures
      .map((f) => ({ title: `vs ${f.opponent}`, kickoff: f.kickoff, t: new Date(f.kickoff).getTime(), source: "calendar" as const }))
      .filter((r) => Number.isFinite(r.t) && r.t > nowMs)
      .sort((a, b) => a.t - b.t);
    return rows[0] ?? null;
  }, [fixtures, nowMs]);

  const nextMatchFromSketch = useMemo(() => {
    const rows = sketchArea.calendarEvents
      .filter((e) => e.category === "match")
      .map((e) => {
        const iso = e.timeStart ? `${e.date}T${e.timeStart}:00` : `${e.date}T12:00:00`;
        return { title: e.title, kickoff: iso, t: new Date(iso).getTime(), source: "sketch" as const };
      })
      .filter((r) => Number.isFinite(r.t) && r.t > nowMs)
      .sort((a, b) => a.t - b.t);
    return rows[0] ?? null;
  }, [sketchArea.calendarEvents, nowMs]);

  const nextMatchNotification = useMemo(() => {
    if (nextMatchFromCalendar) return nextMatchFromCalendar;
    if (nextMatchFromSketch) return nextMatchFromSketch;
    const fromResolved = nextMatch
      ? { title: `vs ${nextMatch.opponent}`, kickoff: nextMatch.kickoff, t: new Date(nextMatch.kickoff).getTime(), source: "calendar" as const }
      : null;
    return fromResolved;
  }, [nextMatch, nextMatchFromCalendar, nextMatchFromSketch]);

  const nextMatchDaysLeft = useMemo(() => {
    if (!nextMatchNotification) return null;
    const kickoff = new Date(nextMatchNotification.kickoff);
    const now = new Date(nowMs);
    const startKickoffDay = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate()).getTime();
    const startNowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((startKickoffDay - startNowDay) / (24 * 60 * 60 * 1000));
    return Math.max(0, diffDays);
  }, [nextMatchNotification, nowMs]);

  const sketchTimeReminders = useMemo(() => {
    const reminders: { id: string; title: string; whenLabel: string; startsAt: string }[] = [];
    for (const ev of sketchArea.calendarEvents) {
      const startIso = ev.timeStart ? `${ev.date}T${ev.timeStart}:00` : `${ev.date}T12:00:00`;
      const startMs = new Date(startIso).getTime();
      if (Number.isNaN(startMs) || startMs <= nowMs) continue;
      const diff = startMs - nowMs;
      const whenLabel =
        diff <= 30 * 60 * 1000 ? "em 30 min" : diff <= 2 * 60 * 60 * 1000 ? "em 2 horas" : diff <= 24 * 60 * 60 * 1000 ? "em 1 dia" : null;
      if (!whenLabel) continue;
      reminders.push({
        id: `${ev.id}:${whenLabel}`,
        title: ev.title,
        whenLabel,
        startsAt: startIso,
      });
    }
    reminders.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return reminders;
  }, [sketchArea.calendarEvents, nowMs]);

  const calendarTimeReminders = useMemo(() => {
    const reminders: { id: string; title: string; whenLabel: string; startsAt: string }[] = [];
    for (const f of fixtures) {
      const startMs = new Date(f.kickoff).getTime();
      if (!Number.isFinite(startMs) || startMs <= nowMs) continue;
      const diff = startMs - nowMs;
      const whenLabel =
        diff <= 30 * 60 * 1000 ? "em 30 min" : diff <= 2 * 60 * 60 * 1000 ? "em 2 horas" : diff <= 24 * 60 * 60 * 1000 ? "em 1 dia" : null;
      if (!whenLabel) continue;
      reminders.push({
        id: `fixture:${f.id}:${whenLabel}`,
        title: `Jogo vs ${f.opponent}`,
        whenLabel,
        startsAt: f.kickoff,
      });
    }
    reminders.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return reminders;
  }, [fixtures, nowMs]);

  const unreadConversations = useMemo(
    () => conversations.filter((c) => (c.unread ?? 0) > 0),
    [conversations]
  );
  const notificationBadgeCount =
    (nextMatchNotification ? 1 : 0) + sketchTimeReminders.length + calendarTimeReminders.length + unreadConversations.length;

  const mobileLinks = useMemo(() => {
    const mobileLinksBase = [
      { href: "/app", label: t("nav.home") },
      { href: "/app/tactics", label: t("nav.tactics") },
      { href: "/app/training", label: t("nav.training") },
      { href: "/app/messages", label: t("nav.messages") },
      { href: "/app/sketch", label: t("nav.sketch") },
      { href: "/app/team", label: t("nav.team") },
      { href: "/app/calendar", label: t("nav.calendar") },
      { href: "/app/profile", label: t("nav.profile") },
      { href: "/app/settings", label: t("nav.settings") },
    ] as const;
    const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
    const full = hasFullWorkspaceAccess(user, ownerListed);
    const baseList = full
      ? mobileLinksBase
      : mobileLinksBase.filter((l) => l.href === "/app/messages" || l.href === "/app/settings");
    const base = baseList.map((l) => ({ href: l.href, label: l.label }));
    const showAdmin =
      user?.role === "admin" || (user?.email ? clientEmailShowsAdminNav(user.email) : false);
    if (showAdmin) {
      return [
        { href: "/app/admin", label: t("nav.admin") },
        { href: "/app/admin/database", label: t("nav.database") },
        ...base,
      ];
    }
    return base;
  }, [user?.role, user?.email, user, t]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-surface-border bg-[#0a0d10]/85 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-300 lg:hidden"
          aria-label={t("header.openMenu")}
          onClick={() => setOpen((o) => !o)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight text-white">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-zinc-400 transition-colors hover:text-white"
            aria-label={t("header.notifications")}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {notificationBadgeCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-zinc-950">
                {notificationBadgeCount > 9 ? "+9" : notificationBadgeCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-12 z-50 w-[360px] rounded-2xl border border-surface-border bg-[#0c1014] p-3 shadow-2xl">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Notificações</p>
              <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
                {nextMatchNotification ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs text-zinc-500">Próximo jogo</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {nextMatchNotification.title} · faltam {nextMatchDaysLeft ?? 0} dia(s)
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {new Date(nextMatchNotification.kickoff).toLocaleString("pt-PT")} ·{" "}
                      {nextMatchNotification.source === "sketch" ? "Sketch" : "Calendário"}
                    </p>
                  </div>
                ) : null}

                {calendarTimeReminders.map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs text-zinc-500">Calendário</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {r.title} · lembrete {r.whenLabel}
                    </p>
                  </div>
                ))}

                {sketchTimeReminders.map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs text-zinc-500">Sketch com data</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {r.title} · lembrete {r.whenLabel}
                    </p>
                  </div>
                ))}

                {unreadConversations.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs text-zinc-500">
                      {c.type === "group" ? `Novas mensagens no grupo: ${c.title}` : "Nova mensagem direta"}
                    </p>
                    <p className="text-sm font-medium text-zinc-200">{c.lastMessagePreview}</p>
                  </div>
                ))}

                {notificationBadgeCount === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-sm text-zinc-500">
                    Sem notificações no momento.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <Link
          href="/app/messages"
          className={cn(
            "relative hidden h-9 items-center justify-center rounded-xl border border-surface-border bg-surface-raised px-4 pr-5 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 sm:inline-flex"
          )}
        >
          {t("header.openChat")}
          {unreadMessagesCount > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-zinc-950"
              aria-hidden
            >
              {unreadMessagesCount > 9 ? "+9" : unreadMessagesCount}
            </span>
          ) : null}
        </Link>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-50 border-b border-surface-border bg-[#0c1014] p-4 shadow-xl lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1">
          {mobileLinks.map((l) => {
            const showUnread = l.href === "/app/messages" && unreadMessagesCount > 0;
            const unreadLabel = unreadMessagesCount > 9 ? "+9" : String(unreadMessagesCount);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  l.href === "/app/admin"
                    ? pathname === "/app/admin" || pathname === "/app/admin/"
                    : pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                    ? "bg-accent/10 text-accent"
                    : "text-zinc-400 hover:bg-white/5"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                {showUnread ? (
                  <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-zinc-950">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
