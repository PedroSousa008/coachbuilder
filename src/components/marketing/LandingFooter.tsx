import Link from "next/link";
import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="border-t border-surface-border bg-[#080a0c]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-border/70 bg-white">
                <Image src="/icon.svg" alt="CoachBuilder logo" width={36} height={36} className="h-full w-full object-cover" />
              </span>
              <span className="font-display font-semibold text-white">CoachBuilder</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-zinc-500">
              The operating system for football coaches — tactics, training, and squad comms in one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-10 text-sm">
            <div>
              <p className="font-medium text-white">Product</p>
              <ul className="mt-3 space-y-2 text-zinc-500">
                <li>
                  <Link href="/app/tactics" className="hover:text-accent">
                    Tactics
                  </Link>
                </li>
                <li>
                  <Link href="/app/training" className="hover:text-accent">
                    Training
                  </Link>
                </li>
                <li>
                  <Link href="/app/messages" className="hover:text-accent">
                    Messages
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-white">Company</p>
              <ul className="mt-3 space-y-2 text-zinc-500">
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <span className="cursor-default">Privacy (soon)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-12 border-t border-surface-border pt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} CoachBuilder. Demo UI — no data leaves your browser.
        </p>
      </div>
    </footer>
  );
}
