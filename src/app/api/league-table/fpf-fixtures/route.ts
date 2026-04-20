import { NextResponse } from "next/server";
import { isAllowedLeagueTableUrl } from "@/lib/league-table-parse";
import { fetchFpfMatchesFromFixtureRounds } from "@/lib/league-import-fpf";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    const matches = await fetchFpfMatchesFromFixtureRounds(html, url, fetch);
    return NextResponse.json({ ok: true, matches });
  } catch (e) {
    console.error("fpf-fixtures route", e);
    return NextResponse.json({ ok: false, error: "Failed to load fixture rounds." }, { status: 500 });
  }
}
