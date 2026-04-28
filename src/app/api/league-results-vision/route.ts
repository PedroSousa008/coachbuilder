import { NextResponse } from "next/server";

type VisionRow = {
  homeTeam: string;
  result: string;
  awayTeam: string;
};

function extractFirstJsonObject(raw: string): string | null {
  const s = raw.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return s.slice(start, end + 1);
}

function normalizeResult(raw: string): string | null {
  const t = raw.replace(/\s+/g, "").replace(/[Oo]/g, "0");
  const m = t.match(/^([0-9]{1,2})[-–—−‐\/:]([0-9]{1,2})$/);
  if (!m) return null;
  const hg = Number(m[1]);
  const ag = Number(m[2]);
  if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0 || hg > 15 || ag > 15) return null;
  return `${hg}-${ag}`;
}

function sanitizeRows(rows: unknown): VisionRow[] {
  if (!Array.isArray(rows)) return [];
  const out: VisionRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const homeTeam = String((r as { homeTeam?: unknown }).homeTeam ?? "").trim();
    const awayTeam = String((r as { awayTeam?: unknown }).awayTeam ?? "").trim();
    const resultRaw = String((r as { result?: unknown }).result ?? "").trim();
    const result = normalizeResult(resultRaw);
    if (!homeTeam || !awayTeam || !result) continue;
    if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) continue;
    out.push({ homeTeam, result, awayTeam });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "VISION_PROVIDER_UNAVAILABLE" }, { status: 503 });
    }

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing image file." }, { status: 400 });
    }

    const mime = image.type?.trim() || "image/png";
    const bytes = Buffer.from(await image.arrayBuffer());
    const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

    const prompt =
      "Extract football match rows from this screenshot. " +
      "Return ONLY JSON with shape {\"rows\":[{\"homeTeam\":\"...\",\"result\":\"x-y\",\"awayTeam\":\"...\"}]}. " +
      "Use exactly one row per visible match line. Ignore logos/symbols. Keep team names as shown.";

    const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[league-results-vision] provider error", res.status, body);
      return NextResponse.json({ ok: false, error: "Vision provider failed." }, { status: 502 });
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const jsonBlock = extractFirstJsonObject(raw);
    if (!jsonBlock) {
      return NextResponse.json({ ok: false, error: "Invalid vision response." }, { status: 502 });
    }
    let parsed: { rows?: unknown };
    try {
      parsed = JSON.parse(jsonBlock) as { rows?: unknown };
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON from vision provider." }, { status: 502 });
    }

    const rows = sanitizeRows(parsed.rows);
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "No rows detected." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("[league-results-vision]", e);
    return NextResponse.json({ ok: false, error: "Failed to read image." }, { status: 500 });
  }
}

