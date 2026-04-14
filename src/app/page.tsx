import Link from "next/link";
import {
  GitBranch,
  CalendarDays,
  MessageSquare,
  PenSquare,
  Users,
  Trophy,
  Zap,
  ArrowRight,
} from "lucide-react";
import { LandingNav } from "@/components/marketing/LandingNav";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PricingCard } from "@/components/marketing/PricingCard";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for real touchlines &amp; training grounds
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Plan smarter. Train better.{" "}
              <span className="text-accent">Communicate faster.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              CoachBuilder is your club-grade workspace for formations, session planning, squad chat, and a daily sketch
              workspace — so you spend less time in spreadsheets and more time winning football matches.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-zinc-950 transition-colors hover:bg-accent-muted"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-600 px-6 text-base font-medium text-zinc-200 transition-colors hover:border-accent/40 hover:text-white"
              >
                Log in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Session plans drafted", value: "34+" },
                { label: "Tactics on file", value: "12" },
                { label: "Avg. time to share a lineup", value: "< 2 min" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-surface-border bg-surface-raised/40 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-surface-border bg-[#0c1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything you need between matches
              </h2>
              <p className="mt-4 text-zinc-400">
                One calm interface for how modern staffs actually work: clear visuals, fast messaging, and structured
                prep — from U15s to senior football.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={GitBranch}
                title="Tactical board"
                description="Save formations, opponent notes, and match triggers. Drag players on a pitch that looks like your notebook — only sharper."
              />
              <FeatureCard
                icon={CalendarDays}
                title="Training micro-cycle"
                description="Map rondos, pressing blocks, and finishing circuits across the week with intensity and duration at a glance."
              />
              <FeatureCard
                icon={MessageSquare}
                title="Squad messaging"
                description="Group thread for announcements and DMs for individual detail — the channel stays professional and searchable."
              />
              <FeatureCard
                icon={PenSquare}
                title="Sketch Area"
                description="Plan the day, typed notes, tasks, files, tactical sketches, and a player watchlist — your private staff hub without leaving the app."
              />
              <FeatureCard
                icon={Users}
                title="Roster & availability"
                description="Positions, minutes, and matchday status in one roster built for coaching decisions — not fantasy stats."
              />
              <FeatureCard
                icon={Trophy}
                title="Performance habits"
                description="Track which tactical ideas actually get minutes, and which sessions your group responds to best."
              />
            </div>
          </div>
        </section>

        <section id="win" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <Zap className="h-3.5 w-3.5" />
                  Why staffs switch
                </div>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Win more duels in the details
                </h2>
                <ul className="mt-8 space-y-5 text-zinc-400">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Aligned language:</strong> everyone sees the same shape, same
                      pressing cues, same set-piece roles — before you walk to the dressing room.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Faster feedback loops:</strong> jot a note, set a reminder,
                      sketch a pattern — without losing context in five different apps.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Respect for your time:</strong> fewer scattered notes, cleaner
                      handovers between coaches, and a history you can revisit next season.
                    </span>
                  </li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-3xl border border-surface-border bg-gradient-to-br from-surface-raised to-[#0a0d10] p-8 shadow-card">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Matchday snapshot
                </p>
                <p className="mt-4 text-2xl font-semibold text-white">Northbridge FC U19 vs Riverside Athletic</p>
                <p className="mt-2 text-sm text-zinc-500">Regional Youth League · Home</p>
                <div className="mt-8 space-y-4 border-t border-surface-border pt-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Active tactic</span>
                    <span className="font-medium text-accent">4-3-3 wide overload</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Next session</span>
                    <span className="text-zinc-200">Pressing triggers · High</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Unread squad messages</span>
                    <span className="text-zinc-200">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-surface-border bg-[#0c1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Simple pricing for serious coaches
              </h2>
              <p className="mt-4 text-zinc-400">
                Start with free messaging. Upgrade when you want the full bench: tactics, training, sketch workspace, and
                roster tools for €6.99/month (7-day Pro trial on signup).
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2">
              <PricingCard
                name="Free"
                price="€0"
                description="Keep the squad connected."
                features={["Team group chat", "Direct messages", "Basic notifications (soon)"]}
                ctaHref="/signup"
                ctaLabel="Sign up free"
              />
              <PricingCard
                name="Coach Pro"
                price="€6.99"
                description="Full operating system for your staff."
                features={[
                  "Everything in Free",
                  "Tactics board & saved ideas",
                  "Training plan builder",
                  "Sketch Area (notes, tasks, files & board)",
                  "Roster, availability & performance view",
                ]}
                highlighted
                ctaHref="/app/settings"
                ctaLabel="Upgrade (demo)"
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-accent/20 bg-accent/5 px-8 py-10 sm:flex-row">
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Ready for your next matchweek?</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Cria uma conta com email e palavra-passe — os teus dados ficam guardados neste dispositivo.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-accent-muted"
              >
                Enter CoachBuilder
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
