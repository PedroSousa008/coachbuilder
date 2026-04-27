"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { isClubPresident } from "@/lib/president-mode";
import { hasFullWorkspaceAccess } from "@/lib/subscription-client";

function pathAllowedInFreeMode(pathname: string): boolean {
  if (pathname === "/app/messages" || pathname.startsWith("/app/messages/")) return true;
  if (pathname === "/app/settings" || pathname.startsWith("/app/settings/")) return true;
  return false;
}

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const ownerListed = Boolean(user?.email && clientEmailShowsAdminNav(user.email));
  const full = hasFullWorkspaceAccess(user, ownerListed);

  useEffect(() => {
    if (!authReady || !user) return;
    if (full) return;
    /** Modo Presidente: o paywall Coach Pro não aplica; só Definições + subscrição (PresidenteNavRedirect). */
    if (isClubPresident(user) && pathname.startsWith("/app/president")) return;
    if (pathAllowedInFreeMode(pathname)) return;
    router.replace("/app/settings?subscription=locked");
  }, [authReady, user, full, pathname, router]);

  if (!authReady || !user) return <>{children}</>;

  if (full) return <>{children}</>;

  if (pathAllowedInFreeMode(pathname)) return <>{children}</>;

  if (isClubPresident(user) && pathname.startsWith("/app/president")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <p className="text-sm text-zinc-500">A redirecionar…</p>
    </div>
  );
}
