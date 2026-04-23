import Link from "next/link";
import Image from "next/image";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0a0d10]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-border/70 bg-white">
            <Image src="/icon.svg" alt="CoachBuilder logo" width={36} height={36} className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-sm font-semibold text-white">CoachBuilder</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#win" className="hover:text-white">
            Why coaches
          </a>
          <a href="#pricing" className="hover:text-white">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-xl px-3 py-2 text-sm text-zinc-400 hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-accent-muted"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
