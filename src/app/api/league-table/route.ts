import { NextResponse } from "next/server";
import { isAllowedLeagueTableUrl } from "@/lib/league-api-url";

export const runtime = "nodejs";

/** Hobby: ~10s wall time — keep upstream fetch under this budget. */
export const maxDuration = 10;

const GENERIC_FETCH_MS = 7500;

const GENERIC_HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
};

/** Smoke test: open GET /api/league-table in the browser to confirm this deployment includes the route. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    leagueTableApi: "fpf-fetch-html-v1",
    maxDurationSec: maxDuration,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Enter a valid http(s) URL." }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
    }

    let res: Response;
    try {
      res = await fetch(url, {
        headers: GENERIC_HTML_HEADERS,
        redirect: "follow",
        cache: "no-store",
        signal:
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(GENERIC_FETCH_MS)
            : undefined,
      });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A página demorou demasiado a carregar (limite do servidor). Tenta outro URL ou mais tarde.",
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
    try {
      html = await res.text();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not read the page body. Try again." },
        { status: 400 }
      );
    }

    const trimmed = html.length > 2_000_000 ? html.slice(0, 2_000_000) : html;
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
