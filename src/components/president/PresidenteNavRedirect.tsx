"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { clientEmailShowsAdminNav } from "@/lib/bootstrap-admin-client";
import { isPresidentPremiumLocked } from "@/lib/president-premium-client";
import { isClubPresident, isPresidentAppPath } from "@/lib/president-mode";

/**
 * Presidente só navega em `/app/president/*`.
 * Treinadores e restantes perfis não acedem ao modo clube.
 * Presidente cloud sem PresidentPro activo: só `/app/president/definicoes` (pagamento em Definições).
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
      return;
    }
    if (president && isPresidentAppPath(pathname)) {
      const ownerListed = Boolean(user.email && clientEmailShowsAdminNav(user.email));
      if (isPresidentPremiumLocked(user, ownerListed) && !pathname.startsWith("/app/president/definicoes")) {
        router.replace("/app/president/definicoes");
      }
    }
  }, [authReady, user, pathname, router]);

  return null;
}
