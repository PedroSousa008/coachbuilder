"use client";

import { useEffect, useState } from "react";

/**
 * Current time that advances on an interval so “next vs previous” fixture lists move as kick-offs pass,
 * without waiting for a new league import. Also refreshes when the tab becomes visible again.
 */
export function useScheduleNow(intervalMs = 60_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);

  return nowMs;
}
