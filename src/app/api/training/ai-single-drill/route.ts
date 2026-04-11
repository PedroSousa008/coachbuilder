import { NextResponse } from "next/server";
import type { AiSingleDrill } from "@/lib/training-ai-types";
import { isAiSingleDrill } from "@/lib/training-ai-types";

export const maxDuration = 60;

const SYSTEM = `És treinador de futebol. Respondes APENAS com JSON válido:
{
  "title": "string",
  "durationMin": number,
  "objective": "string",
  "description": "como correr o exercício",
  "progression": "opcional: tornar mais difícil/fácil",
  "coachingCues": "opcional: frases-chave",
  "variations": "opcional",
  "diagramHint": "opcional: descrição textual de diagrama"
}
Português de Portugal. durationMin realista (8-25 min típico).`;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 503 }
    );
  }

  let body: { brief?: string; players?: { name: string; number: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (brief.length < 10) {
    return NextResponse.json({ ok: false, error: "Descreve o exercício que queres (mín. 10 caracteres)." }, { status: 400 });
  }

  const players = Array.isArray(body.players) ? body.players : [];
  const ctx =
    players.length === 0
      ? ""
      : `\nContexto: ${players.length} jogadores — ${players.map((p) => `#${p.number} ${p.name}`).join(", ")}.`;

  const model = process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Pedido do treinador: ${brief}${ctx}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[ai-single-drill]", res.status, await res.text().then((t) => t.slice(0, 400)));
      return NextResponse.json({ ok: false, error: "Falha ao contactar o modelo de IA." }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ ok: false, error: "Resposta vazia." }, { status: 502 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido da IA." }, { status: 502 });
    }

    if (!isAiSingleDrill(parsed)) {
      return NextResponse.json({ ok: false, error: "Formato inesperado da IA." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, drill: parsed as AiSingleDrill, meta: { model } });
  } catch (e) {
    console.error("[ai-single-drill]", e);
    return NextResponse.json({ ok: false, error: "Erro interno." }, { status: 500 });
  }
}
