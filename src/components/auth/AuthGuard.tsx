"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      const q = encodeURIComponent(returnTo);
      router.replace(`/login?next=${q}`);
    }
  }, [authReady, user, router, returnTo]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d10]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-accent/20" />
          <p className="mt-4 text-sm text-zinc-500">A carregar…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d10]">
        <p className="text-sm text-zinc-500">A redirecionar…</p>
      </div>
    );
  }

  return <>{children}</>;
}
