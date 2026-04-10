import type { LeagueTableRow } from "@/types";
import * as cheerio from "cheerio";

/**
 * Extract the largest HTML table and map rows to standings (best-effort).
 * Many league sites use different markup; we surface raw cells when unsure.
 */
export function parseStandingsFromHtml(html: string): LeagueTableRow[] {
  const $ = cheerio.load(html);
  let best: { rows: string[][]; n: number } = { rows: [], n: 0 };

  $("table").each((_, table) => {
    const rows: string[][] = [];
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells: string[] = [];
        $(tr)
          .find("th, td")
          .each((___, cell) => {
            cells.push($(cell).text().trim().replace(/\s+/g, " "));
          });
        if (cells.length >= 2) rows.push(cells);
      });
    if (rows.length > best.n) {
      best = { rows, n: rows.length };
    }
  });

  if (best.rows.length === 0) return [];

  let start = 0;
  const headerJoin = best.rows[0].join(" ").toLowerCase();
  if (/pos|team|club|#/i.test(headerJoin) || best.rows[0].some((c) => /^team$/i.test(c))) {
    start = 1;
  }

  const out: LeagueTableRow[] = [];
  for (let i = start; i < best.rows.length; i++) {
    const cells = best.rows[i].filter((c) => c.length > 0);
    if (cells.length < 2) continue;

    const posRaw = cells[0].replace(/[^\d]/g, "");
    const position = posRaw ? parseInt(posRaw, 10) : out.length + 1;
    const team =
      cells.find(
        (c, idx) =>
          idx > 0 &&
          /^[A-Za-zÀ-ÿ]/.test(c) &&
          c.length > 2 &&
          !/^-?\d+$/.test(c) &&
          !/^\d{1,2}:\d{1,2}$/.test(c)
      ) ?? cells[1];

    const intCells = cells
      .map((c) => {
        const m = c.match(/^-?\d+$/);
        return m ? parseInt(m[0], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    const points = intCells.length >= 1 ? intCells[intCells.length - 1] : undefined;

    if (team && team.length > 1) {
      out.push({
        position: Number.isFinite(position) ? position : out.length + 1,
        team: team.slice(0, 80),
        points,
        cells,
      });
    }
  }

  return out.slice(0, 30);
}

export function isAllowedLeagueTableUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost")) return false;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}
