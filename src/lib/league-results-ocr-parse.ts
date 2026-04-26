import type { ParsedMatchEvent } from "@/types";

/** Home score away — tolerates OCR line breaks and odd spacing. */
const RESULT_RE =
  /([A-Za-zÀ-ÿ0-9 .'\-()]+?)\s+(\d{1,2})\s*[-–:xX]\s*(\d{1,2})\s+([A-Za-zÀ-ÿ0-9 .'\-()]+)/g;

/** Same pattern on a single line with spaces collapsed. */
function normalizeOcrBlock(s: string): string {
  return s.replace(/\r/g, "\n").replace(/[\t\f\v]+/g, " ").replace(/ *\n */g, "\n");
}

export function parseMatchEventsFromOcrText(ocrText: string): ParsedMatchEvent[] {
  const text = normalizeOcrBlock(ocrText);
  const out: ParsedMatchEvent[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  RESULT_RE.lastIndex = 0;
  while ((m = RESULT_RE.exec(text)) !== null) {
    const homeTeam = (m[1] ?? "").replace(/\s+/g, " ").trim();
    const awayTeam = (m[4] ?? "").replace(/\s+/g, " ").trim();
    if (!homeTeam || !awayTeam) continue;
    const homeGoals = Number(m[2]);
    const awayGoals = Number(m[3]);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
    const key = `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}|${homeGoals}-${awayGoals}`;
    if (seen.has(key)) continue;
    seen.add(key);
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
