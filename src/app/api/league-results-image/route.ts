import { NextResponse } from "next/server";
import { parseMatchEventsFromOcrText } from "@/lib/league-results-ocr-parse";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { ocrText?: string };
    const ocrText = typeof body?.ocrText === "string" ? body.ocrText.trim() : "";
    if (!ocrText) {
      return NextResponse.json({ ok: false, error: "Missing OCR text." }, { status: 400 });
    }
    const events = parseMatchEventsFromOcrText(ocrText);
    if (!events.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No match results were detected. Expected lines like: Team A 2-1 Team B.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, events });
  } catch (e) {
    console.error("league-results-image route", e);
    return NextResponse.json({ ok: false, error: "Failed to parse results input." }, { status: 500 });
  }
}
