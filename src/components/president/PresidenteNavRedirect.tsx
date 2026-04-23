"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isClubPresident, isPresidentAppPath } from "@/lib/president-mode";

/**
 * Presidente só navega em `/app/president/*`.
 * Treinadores e restantes perfis não acedem ao modo clube.
 */
export function PresidenteNavRedirect() {
  const { user, authReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || !user) return;
    const president = isClubPresident(user);
    if (president && pathname.startsWith("/app") && !isPresidentAppPath(pathname)) {
      router.replace("/app/president");
      return;
    }
    if (!president && isPresidentAppPath(pathname)) {
      router.replace("/app");
    }
  }, [authReady, user, pathname, router]);

  return null;
}
