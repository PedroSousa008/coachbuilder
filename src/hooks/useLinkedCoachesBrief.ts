"use client";

import { useCallback, useEffect, useState } from "react";
import type { PresidentLinkedCoachBrief } from "@/lib/president-linked-coach-brief";

type BriefMap = Record<string, PresidentLinkedCoachBrief>;

export function useLinkedCoachesBrief(coachUserIds: string[]) {
  const [briefs, setBriefs] = useState<BriefMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = [...new Set(coachUserIds.filter(Boolean))].sort().join(",");

  const refresh = useCallback(async () => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) {
      setBriefs({});
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloud/president/linked-coaches-brief", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachUserIds: ids }),
      });
      const data = (await res.json()) as { ok?: boolean; briefs?: BriefMap; error?: string };
      if (!res.ok || !data.ok || !data.briefs) {
        setError(data.error ?? "Não foi possível carregar dados das equipas.");
        setBriefs({});
        return;
      }
      setBriefs(data.briefs);
    } catch {
      setError("Erro de rede.");
      setBriefs({});
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { briefs, loading, error, refresh };
}
