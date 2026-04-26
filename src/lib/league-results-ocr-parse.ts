import type { ParsedMatchEvent } from "@/types";

const RESULT_RE =
  /([A-Za-zÀ-ÿ0-9 .'\-()]+?)\s+(\d{1,2})\s*[-:xX]\s*(\d{1,2})\s+([A-Za-zÀ-ÿ0-9 .'\-()]+)/g;

export function parseMatchEventsFromOcrText(ocrText: string): ParsedMatchEvent[] {
  const text = ocrText.replace(/\r/g, "\n");
  const out: ParsedMatchEvent[] = [];
  let m: RegExpExecArray | null;
  while ((m = RESULT_RE.exec(text)) !== null) {
    const homeTeam = m[1]?.trim() ?? "";
    const awayTeam = m[4]?.trim() ?? "";
    if (!homeTeam || !awayTeam) continue;
    const homeGoals = Number(m[2]);
    const awayGoals = Number(m[3]);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
    out.push({
      homeTeam,
      awayTeam,
      homeGoals,
      awayGoals,
      source: "image",
    });
  }
  return out;
}
