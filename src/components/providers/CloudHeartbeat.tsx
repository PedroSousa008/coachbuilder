"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";

/** Mantém `lastSeenAt`, `lastRoute` e heartbeats para presença e admin “Pessoas online” (só com cloud). */
export function CloudHeartbeat() {
  const { user, authReady } = useAuth();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!shouldUseCloudClientApis(user) || !authReady || !user?.id) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const ping = () => {
      const p = pathRef.current || "/";
      void fetch("/api/cloud/analytics/ping", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: p }),
      });
    };
    ping();
    timerRef.current = setInterval(ping, 90_000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!shouldUseCloudClientApis(user) || !authReady || !user?.id) return;
    const p = pathname || "/";
    void fetch("/api/cloud/analytics/ping", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname: p }),
    });
  }, [authReady, user, pathname]);

  return null;
}
