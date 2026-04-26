import { NextResponse } from "next/server";
import { parseStandingsFromHtml, isAllowedLeagueTableUrl } from "@/lib/league-table-parse";
import {
  dedupeMatches,
  extractCompetitionLabelFromHtml,
  extractFpfFixtureRoundMapFromHtml,
  fetchFpfMatchesFromFixtureRounds,
  parseFpfMatchesFromHtml,
} from "@/lib/league-import-fpf";

const MAX_PASTED_HTML_CHARS = 2_500_000;

function looksLikeHtmlDocument(s: string): boolean {
  const head = s.slice(0, 8000).toLowerCase();
  return (
    head.includes("<!doctype") ||
    head.includes("<html") ||
    head.includes("<body") ||
    head.includes("<head") ||
    (head.includes("<div") && head.includes("class="))
  );
}

/** FPF loads many matchday fragments; allow enough time on cold starts. */
export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const pastedHtmlRaw = typeof body?.html === "string" ? body.html : "";
    const pastedHtml = pastedHtmlRaw.trim();
    if (!url || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Enter a valid http(s) URL." }, { status: 400 });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "Enter a valid URL." }, { status: 400 });
    }
    const host = parsedUrl.hostname.toLowerCase();
    if (host.includes("resultados.fpf.pt")) {
      const competitionId = parsedUrl.searchParams.get("competitionId")?.trim() ?? "";
      const isDetailsPage = /\/competition\/details$/i.test(parsedUrl.pathname);
      if (isDetailsPage && !/^\d+$/.test(competitionId)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "FPF URL invalid: missing competitionId. Open the competition page on resultados.fpf.pt and copy the full URL (with a numeric competitionId).",
          },
          { status: 400 }
        );
      }
    }

    let html: string;

    if (pastedHtml) {
      if (pastedHtml.length > MAX_PASTED_HTML_CHARS) {
        return NextResponse.json(
          {
            ok: false,
            error: `Pasted HTML is too large (max ${MAX_PASTED_HTML_CHARS.toLocaleString("en-GB")} characters).`,
          },
          { status: 413 }
        );
      }
      if (!looksLikeHtmlDocument(pastedHtml)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "That does not look like a complete HTML document. Paste the full page source from your browser (View Page Source or Save Page As HTML).",
          },
          { status: 400 }
        );
      }
      html = pastedHtml;
    } else {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: "https://resultados.fpf.pt/",
          Origin: "https://resultados.fpf.pt",
        },
        redirect: "follow",
        cache: "no-store",
      });

      if (!res.ok) {
        const upstreamStatus = res.status;
        const base = `Could not load page (HTTP ${upstreamStatus}).`;
        const fpfHint =
          host.includes("resultados.fpf.pt") && upstreamStatus === 403
            ? " FPF often blocks requests from cloud servers (HTTP 403). Open the same URL in your browser, copy the page HTML (View Page Source), and use “Import from pasted HTML” in the app — we will parse it here without calling FPF again."
            : "";
        return NextResponse.json(
          { ok: false, error: base + fpfHint, upstreamStatus },
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

      html = await res.text();
    }

    const rows = parseStandingsFromHtml(html);
    const roundMap = extractFpfFixtureRoundMapFromHtml(html);
    let matches = parseFpfMatchesFromHtml(html, url, roundMap);
    try {
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
