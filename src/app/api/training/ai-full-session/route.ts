import { NextResponse } from "next/server";
import { isAiFullSession, type AiFullTrainingSession } from "@/lib/training-ai-types";

export const maxDuration = 120;

const SYSTEM = `És um preparador físico-técnico de futebol profissional. Respondes APENAS com JSON válido (sem markdown), no formato:
{
  "sessionTitle": "string",
  "summary": "2-3 frases",
  "blocks": [
    {
      "title": "string",
      "durationMin": number,
      "phase": "warmup" | "main" | "cooldown",
      "description": "como correr o exercício, espaçamentos, regras",
      "coachingPoints": "o que observar",
      "setup": "opcional: cones, áreas, portas",
      "groupSplit": "opcional: quando parte do grupo trabalha X e outra Y, com nomes se forem dados",
      "diagramHint": "opcional: descrição textual de um diagrama simples (vistas de campo)"
    }
  ],
  "closingNotes": "mensagem final ao treinador"
}
Regras:
- Primeiro bloco: phase "warmup". Último: "cooldown" (alongamento ativo/leve).
- Entre eles: phase "main" com vários blocos que somem aproximadamente a duração pedida (±5 min).
- Inclui pelo menos um bloco onde groupSplit diferencia subgrupos (ex.: médios na posse, defesas em linha).
- Usa nomes de jogadores só quando fornecidos na lista; não inventes nomes extra.
- Tudo em português de Portugal.
- Os durationMin dos blocks devem somar cerca do total pedido.`;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY não configurada no servidor." },
      { status: 503 }
    );
  }

  let body: {
    durationMin?: number;
    objective?: string;
    players?: { name: string; number: number; positions?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const durationMin = [30, 60, 90, 120].includes(Number(body.durationMin)) ? Number(body.durationMin) : 60;
  const objective = typeof body.objective === "string" ? body.objective.trim() : "";
  if (objective.length < 8) {
    return NextResponse.json({ ok: false, error: "Descreve o objetivo do treino (mín. 8 caracteres)." }, { status: 400 });
  }

  const players = Array.isArray(body.players) ? body.players : [];
  const playerLines =
    players.length === 0
      ? "Sem lista nominal — adapta o treino a um grupo genérico do número indicado."
      : players.map((p) => `- #${p.number} ${p.name}${p.positions ? ` (${p.positions})` : ""}`).join("\n");

  const userMsg = `Duração total: ${durationMin} minutos.
Objetivo / foco do treinador: ${objective}

Jogadores (${players.length}):
${playerLines}

Gera o plano completo.`;

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
        temperature: 0.65,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[ai-full-session]", res.status, errText.slice(0, 500));
      return NextResponse.json(
        { ok: false, error: "Falha ao contactar o modelo de IA. Verifica a chave e quotas." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Resposta vazia da IA." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ ok: false, error: "JSON inválido devolvido pela IA." }, { status: 502 });
    }

    if (!isAiFullSession(parsed)) {
      return NextResponse.json({ ok: false, error: "Formato da resposta da IA inesperado." }, { status: 502 });
    }

    const plan = parsed as AiFullTrainingSession;
    return NextResponse.json({
      ok: true,
      plan,
      meta: { durationMin, playerCount: players.length, model },
    });
  } catch (e) {
    console.error("[ai-full-session]", e);
    return NextResponse.json({ ok: false, error: "Erro interno ao gerar o treino." }, { status: 500 });
  }
}
