import { NextResponse } from "next/server";
import { parseStandingsFromHtml, isAllowedLeagueTableUrl } from "@/lib/league-table-parse";
import {
  dedupeMatches,
  extractCompetitionLabelFromHtml,
  extractFpfFixtureRoundMapFromHtml,
  fetchFpfMatchesFromFixtureRounds,
  parseFpfMatchesFromHtml,
} from "@/lib/league-import-fpf";

/** FPF loads many matchday fragments; allow enough time on cold starts. */
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Enter a valid http(s) URL." }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Could not load page (HTTP ${res.status}).` },
        { status: 502 }
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

    const html = await res.text();
    const rows = parseStandingsFromHtml(html);
    const roundMap = extractFpfFixtureRoundMapFromHtml(html);
    let matches = parseFpfMatchesFromHtml(html, url, roundMap);
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes("resultados.fpf.pt")) {
        const extra = await fetchFpfMatchesFromFixtureRounds(html, url, fetch);
        matches = dedupeMatches([...matches, ...extra]);
      }
    } catch (e) {
      console.error("league-table FPF fixture rounds", e);
    }
    const competitionName = extractCompetitionLabelFromHtml(html);

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
    });
  } catch (e) {
    console.error("league-table route", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch or parse the page. Check the URL and try again." },
      { status: 500 }
    );
  }
}
