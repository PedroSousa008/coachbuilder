import { NextResponse } from "next/server";
import type { LeagueImportedMatch, LeagueTableRow } from "@/types";
import { parseStandingsFromHtml, isAllowedLeagueTableUrl } from "@/lib/league-table-parse";
import {
  dedupeMatches,
  extractCompetitionLabelFromHtml,
  extractFpfFixtureRoundMapFromHtml,
  fetchFpfMatchesFromFixtureRounds,
  parseFpfMatchesFromHtml,
} from "@/lib/league-import-fpf";
import {
  extractZeroZeroCompetitionLabel,
  fetchZeroZeroMatchesForAllRounds,
  isZeroZeroHost,
  parseZeroZeroMatchesFromPageHtml,
  parseZeroZeroStandings,
} from "@/lib/league-import-zerozero";
import {
  createZeroZeroFetchSession,
  fetchZeroZeroPageOnce,
  type ZeroZeroFetch,
} from "@/lib/fetch-zerozero-session";

/** Cheerio + many upstream fetches require Node (not Edge). */
export const runtime = "nodejs";

/** FPF / ZeroZero: many round fetches. Pro plan can raise this; Hobby is capped (~10s). */
export const maxDuration = 120;

const GENERIC_HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const fullSeason = body?.fullSeason === true;
    if (!url || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Enter a valid http(s) URL." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
    }
    const host = parsed.hostname.toLowerCase();

    let res: Response;
    let zzFetch: ZeroZeroFetch | null = null;

    if (isZeroZeroHost(host)) {
      if (fullSeason) {
        const session = await createZeroZeroFetchSession();
        zzFetch = session.fetch;
        res = await session.fetch(url);
        if (res.status === 403 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 650));
          const retry = await createZeroZeroFetchSession();
          zzFetch = retry.fetch;
          res = await retry.fetch(url);
        }
      } else {
        try {
          res = await fetchZeroZeroPageOnce(url);
        } catch {
          return NextResponse.json(
            { ok: false, error: "ZeroZero did not respond in time. Try again." },
            { status: 400 }
          );
        }
        if (res.status === 403 || res.status === 429) {
          const session = await createZeroZeroFetchSession();
          res = await session.fetch(url);
          if (res.status === 403 || res.status === 429) {
            await new Promise((r) => setTimeout(r, 650));
            const retry = await createZeroZeroFetchSession();
            res = await retry.fetch(url);
          }
        }
      }
    } else {
      try {
        res = await fetch(url, {
          headers: GENERIC_HTML_HEADERS,
          redirect: "follow",
          cache: "no-store",
          signal:
            typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
              ? AbortSignal.timeout(12000)
              : undefined,
        });
      } catch {
        return NextResponse.json(
          { ok: false, error: "The page did not load in time. Try again or use a simpler URL." },
          { status: 400 }
        );
      }
    }

    if (!res.ok) {
      const hint =
        res.status === 403
          ? " The site may block automated requests from cloud servers; try again later or use a league page that allows public access."
          : "";
      return NextResponse.json(
        { ok: false, error: `Could not load page (HTTP ${res.status}).${hint}` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The URL did not return HTML. Try the public standings page for your league, or paste a page that contains a table.",
        },
        { status: 400 }
      );
    }

    let html: string;
    try {
      html = await res.text();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not read the page body. Try again." },
        { status: 400 }
      );
    }

    let rows: LeagueTableRow[] = [];
    try {
      rows = parseStandingsFromHtml(html);
    } catch (e) {
      console.error("league-table: parseStandingsFromHtml", e);
    }
    let matches: LeagueImportedMatch[] = [];
    let competitionName: string | null | undefined;

    if (isZeroZeroHost(host)) {
      try {
        const zzRows = parseZeroZeroStandings(html);
        if (zzRows.length > 0) rows = zzRows;
      } catch (e) {
        console.error("league-table ZeroZero standings", e);
      }
      try {
        if (fullSeason && zzFetch) {
          matches = await fetchZeroZeroMatchesForAllRounds(html, url, zzFetch);
        } else {
          matches = parseZeroZeroMatchesFromPageHtml(html, url);
        }
      } catch (e) {
        console.error("league-table ZeroZero fixtures", e);
        try {
          matches = parseZeroZeroMatchesFromPageHtml(html, url);
        } catch (e2) {
          console.error("league-table ZeroZero page parse fallback", e2);
        }
      }
      try {
        competitionName = extractZeroZeroCompetitionLabel(html) ?? extractCompetitionLabelFromHtml(html);
      } catch {
        competitionName = extractCompetitionLabelFromHtml(html);
      }
    } else {
      const roundMap = extractFpfFixtureRoundMapFromHtml(html);
      matches = parseFpfMatchesFromHtml(html, url, roundMap);
      try {
        if (host.includes("resultados.fpf.pt")) {
          const extra = await fetchFpfMatchesFromFixtureRounds(html, url, fetch);
          matches = dedupeMatches([...matches, ...extra]);
        }
      } catch (e) {
        console.error("league-table FPF fixture rounds", e);
      }
      competitionName = extractCompetitionLabelFromHtml(html);
    }

    if (rows.length === 0 && matches.length === 0) {
      return NextResponse.json({
        ok: false,
        error:
          "No table was found on this page, or it uses a format we can’t parse yet. Try another standings URL or a simpler HTML table page.",
      });
    }

    return NextResponse.json({
      ok: true,
      rows,
      matches,
      competitionName: competitionName ?? undefined,
      fetchedAt: new Date().toISOString(),
      ...(isZeroZeroHost(host)
        ? { zeroZeroImportScope: fullSeason ? ("full" as const) : ("page" as const) }
        : {}),
    });
  } catch (e) {
    console.error("league-table route", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch or parse the page. Check the URL and try again." },
      { status: 500 }
    );
  }
}
