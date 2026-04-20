import type { LeagueTableRow } from "@/types";
import * as cheerio from "cheerio";

/**
 * FPF resultados.fpf.pt — standings use `div.game.classification` (no <table>).
 * Pages often contain several mini-tables (Série 1, Série 2…); we return the largest block.
 */
function parseFpfClassificationGrid($: ReturnType<typeof cheerio.load>): LeagueTableRow[] {
  const parsed: LeagueTableRow[] = [];

  $("div.game.classification").each((_, el) => {
    const cells: string[] = [];
    $(el)
      .children("div")
      .each((__, child) => {
        cells.push($(child).text().trim().replace(/\s+/g, " "));
      });
    if (cells.length < 4) return;

    const posRaw = cells[0].replace(/[^\d]/g, "");
    const position = posRaw ? parseInt(posRaw, 10) : NaN;
    const team = cells[1] ?? "";
    if (!team || team.length < 2 || !Number.isFinite(position)) return;

    const nums = cells.slice(2).map((c) => {
      const m = c.match(/^-?\d+$/);
      return m ? parseInt(m[0], 10) : NaN;
    });
    const validNums = nums.filter((n) => !isNaN(n));
    const points = validNums.length >= 1 ? validNums[validNums.length - 1] : undefined;

    let played: number | undefined;
    let won: number | undefined;
    let drawn: number | undefined;
    let lost: number | undefined;
    let goalsFor: number | undefined;
    let goalsAgainst: number | undefined;
    if (validNums.length >= 7) {
      [played, won, drawn, lost, goalsFor, goalsAgainst] = validNums.slice(0, 6);
    }

    let goalDifference: number | undefined;
    if (goalsFor !== undefined && goalsAgainst !== undefined) {
      goalDifference = goalsFor - goalsAgainst;
    }

    parsed.push({
      position,
      team: team.slice(0, 80),
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
      cells,
    });
  });

  if (parsed.length === 0) return [];

  const groups: LeagueTableRow[][] = [];
  let current: LeagueTableRow[] = [];
  for (const row of parsed) {
    if (row.position === 1 && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length) groups.push(current);

  groups.sort((a, b) => b.length - a.length);
  return groups[0]!.slice(0, 30);
}

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

  if (best.rows.length === 0) {
    const fromFpf = parseFpfClassificationGrid($);
    if (fromFpf.length > 0) return fromFpf;
    return [];
  }

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

  if (out.length === 0) {
    const fromFpf = parseFpfClassificationGrid($);
    if (fromFpf.length > 0) return fromFpf;
  }

  return out.slice(0, 30);
}

export { isAllowedLeagueTableUrl } from "@/lib/league-api-url";
