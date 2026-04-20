import { NextResponse } from "next/server";
import { isAllowedLeagueTableUrl } from "@/lib/league-api-url";
import { fetchFpfMatchesFromFixtureRounds } from "@/lib/league-import-fpf";

export const runtime = "nodejs";
/** Hobby caps at ~10s; each POST should only fetch a small fixtureIds chunk (client chunks requests). */
export const maxDuration = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const html = typeof body?.html === "string" ? body.html : "";
    if (!url || !html || !isAllowedLeagueTableUrl(url)) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const host = new URL(url).hostname.toLowerCase();
    if (!host.includes("resultados.fpf.pt")) {
      return NextResponse.json({ ok: false, error: "Not an FPF results URL." }, { status: 400 });
    }
    const rawIds = body?.fixtureIds;
    const fixtureIds = Array.isArray(rawIds)
      ? rawIds.map((x) => String(x)).filter((x) => /^\d+$/.test(x))
      : undefined;
    const matches = await fetchFpfMatchesFromFixtureRounds(html, url, fetch, {
      ...(fixtureIds?.length ? { fixtureIds } : {}),
    });
    return NextResponse.json({ ok: true, matches });
  } catch (e) {
    console.error("fpf-fixtures route", e);
    return NextResponse.json({ ok: false, error: "Failed to load fixture rounds." }, { status: 500 });
  }
}
