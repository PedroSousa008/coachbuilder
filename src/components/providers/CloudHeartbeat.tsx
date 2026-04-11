"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { shouldUseCloudClientApis } from "@/lib/cloud-config";

/** Mantém `lastSeenAt` e heartbeats para estatísticas de presença (só com cloud). */
export function CloudHeartbeat() {
  const { user, authReady } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!shouldUseCloudClientApis(user) || !authReady || !user?.id) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const ping = () => {
      void fetch("/api/cloud/analytics/ping", { method: "POST", credentials: "include" });
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

  return null;
}
