import type { LeagueTableRow } from "@/types";
import * as cheerio from "cheerio";
import { teamNamesMatch } from "@/lib/team-match";

export type ParseStandingsOptions = {
  /**
   * Nome do clube (ex.: Perfil do utilizador). Quando há várias séries/tabelas na mesma página,
   * escolhe o bloco onde este nome corresponde a uma equipa.
   */
  clubNameHint?: string;
};

/**
 * FPF resultados.fpf.pt — standings use `div.game.classification` (no <table>).
 * Pages often contain several mini-tables (Série A, B, C…); we pick the block that contains
 * `clubNameHint` when set, otherwise the largest block.
 */
function parseFpfClassificationGrid(
  $: ReturnType<typeof cheerio.load>,
  clubNameHint?: string
): LeagueTableRow[] {
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

  return selectGroupByTeamHint(groups, clubNameHint);
}

function selectGroupByTeamHint(
  groups: LeagueTableRow[][],
  clubNameHint: string | undefined
): LeagueTableRow[] {
  const hint = clubNameHint?.trim();
  if (!hint || groups.length === 0) {
    groups.sort((a, b) => b.length - a.length);
    return groups[0]!.slice(0, 30);
  }
  for (const g of groups) {
    for (const row of g) {
      if (teamNamesMatch(hint, row.team)) {
        return g.slice(0, 30);
      }
    }
  }
  groups.sort((a, b) => b.length - a.length);
  return groups[0]!.slice(0, 30);
}

/** Converte matriz de células de uma <table> em linhas de classificação (mesma heurística que antes). */
function parseLeagueRowsFromTableMatrix(bestRows: string[][]): LeagueTableRow[] {
  if (bestRows.length === 0) return [];

  let start = 0;
  const headerJoin = bestRows[0]!.join(" ").toLowerCase();
  if (/pos|team|club|#/i.test(headerJoin) || bestRows[0]!.some((c) => /^team$/i.test(c))) {
    start = 1;
  }

  const out: LeagueTableRow[] = [];
  for (let i = start; i < bestRows.length; i++) {
    const cells = bestRows[i]!.filter((c) => c.length > 0);
    if (cells.length < 2) continue;

    const posRaw = cells[0]!.replace(/[^\d]/g, "");
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

  return out;
}

function pickBestTableFromCandidates(
  candidates: { rows: string[][]; n: number }[],
  clubNameHint: string | undefined
): { rows: string[][]; n: number } | null {
  if (candidates.length === 0) return null;
  const hint = clubNameHint?.trim();
  if (hint) {
    for (const c of candidates) {
      const parsed = parseLeagueRowsFromTableMatrix(c.rows);
      if (parsed.some((r) => teamNamesMatch(hint, r.team))) {
        return c;
      }
    }
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0] ?? null;
}

/**
 * Extract HTML tables and map rows to standings (best-effort).
 * Many league sites use different markup; we surface raw cells when unsure.
 */
export function parseStandingsFromHtml(html: string, options?: ParseStandingsOptions): LeagueTableRow[] {
  const clubNameHint = options?.clubNameHint;
  const $ = cheerio.load(html);

  // FPF: prefer classification divs when present (várias séries no mesmo URL).
  if ($("div.game.classification").length > 0) {
    const fromFpf = parseFpfClassificationGrid($, clubNameHint);
    if (fromFpf.length > 0) return fromFpf;
  }

  const candidates: { rows: string[][]; n: number }[] = [];
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
    if (rows.length >= 2) {
      candidates.push({ rows, n: rows.length });
    }
  });

  const picked = pickBestTableFromCandidates(candidates, clubNameHint);
  if (!picked) {
    const fromFpf = parseFpfClassificationGrid($, clubNameHint);
    if (fromFpf.length > 0) return fromFpf;
    return [];
  }

  const out = parseLeagueRowsFromTableMatrix(picked.rows);

  if (out.length === 0) {
    const fromFpf = parseFpfClassificationGrid($, clubNameHint);
    if (fromFpf.length > 0) return fromFpf;
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
