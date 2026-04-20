import { NextResponse } from "next/server";
import { isAllowedLeagueTableUrl, validateFpfCompetitionUrl } from "@/lib/league-api-url";

export const runtime = "nodejs";

/** Hobby: stay under ~10s wall time (gateway 504 if we exceed). */
export const maxDuration = 10;

/** Hard budget for fetch + reading the response body (body read is not covered by fetch() signal alone). */
const TOTAL_BUDGET_MS = 8000;

const GENERIC_HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

/** Smoke test: open GET /api/league-table in the browser. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    leagueTableApi: "fpf-fetch-html-v2",
    maxDurationSec: maxDuration,
    totalBudgetMs: TOTAL_BUDGET_MS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const t0 = Date.now();

    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Enter a valid http(s) URL." }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
    }

    const fpfErr = validateFpfCompetitionUrl(url);
    if (fpfErr) {
      return NextResponse.json({ ok: false, error: fpfErr }, { status: 400 });
    }

    const remaining = () => Math.max(500, TOTAL_BUDGET_MS - (Date.now() - t0));

    let res: Response;
    try {
      res = await fetch(url, {
        headers: GENERIC_HTML_HEADERS,
        redirect: "follow",
        cache: "no-store",
        signal:
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(remaining())
            : undefined,
      });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The page took too long to respond (server time limit). Check the URL is complete, then try again.",
        },
        { status: 400 }
      );
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
            "The URL did not return HTML. Paste a resultados.fpf.pt competition page that contains the league table.",
        },
        { status: 400 }
      );
    }

    let html: string;
    const bodyMs = remaining();
    let bodyTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        bodyTimer = setTimeout(() => reject(new Error("body-timeout")), bodyMs);
      });
      html = await Promise.race([res.text(), timeoutPromise]);
    } catch (e) {
      if (e instanceof Error && e.message === "body-timeout") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Reading the page was too slow (size or network). Try again or use a lighter competition page URL.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Could not read the page body. Try again." },
        { status: 400 }
      );
    } finally {
      if (bodyTimer !== undefined) clearTimeout(bodyTimer);
    }

    const trimmed = html.length > 1_500_000 ? html.slice(0, 1_500_000) : html;
    if (!trimmed.trim()) {
      return NextResponse.json({ ok: false, error: "Empty page." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      html: trimmed,
      url,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("league-table route", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch the page. Check the URL and try again." },
      { status: 500 }
    );
  }
}
