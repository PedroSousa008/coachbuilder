/**
 * Gemini Developer API + Grounding with Google Search.
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */

export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      webSearchQueries?: string[];
      searchEntryPoint?: unknown;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

function extractText(data: GeminiGenerateContentResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";
  return parts.map((p) => p.text ?? "").join("\n").trim();
}

export async function geminiGenerateWithGoogleSearch(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  temperature?: number;
}): Promise<{ text: string; raw: GeminiGenerateContentResponse }> {
  const { apiKey, model, systemInstruction, userText, temperature = 0.35 } = params;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const core = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    tools: [{ google_search: {} }],
  };

  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...core,
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    if (res.status === 400) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...core,
          generationConfig: { temperature },
        }),
      });
    }
    if (!res.ok) {
      const t = await res.text().catch(() => errBody);
      throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 800)}`);
    }
  }

  const raw = (await res.json()) as GeminiGenerateContentResponse;
  if (raw.error?.message) {
    throw new Error(raw.error.message);
  }
  const reason = raw.candidates?.[0]?.finishReason;
  if (reason && reason !== "STOP" && reason !== "MAX_TOKENS") {
    throw new Error(`Gemini finishReason: ${reason}`);
  }
  const text = extractText(raw);
  if (!text) {
    throw new Error("Resposta vazia do Gemini.");
  }
  return { text, raw };
}
