import type { AiFullTrainingSession, AiSingleDrill } from "@/lib/training-ai-types";
import { trainingExercisePrintImageForTitle } from "@/lib/training-exercise-print-images";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFullSessionDocumentHtml(params: {
  plan: AiFullTrainingSession;
  durationMin: number;
  playerLines: string[];
  generatedAt: string;
  assetBaseUrl?: string;
}): string {
  const { plan, durationMin, playerLines, generatedAt, assetBaseUrl } = params;
  const blocksHtml = plan.blocks
    .map((b, i) => {
      const phase =
        b.phase === "warmup" ? "Aquecimento" : b.phase === "cooldown" ? "Finalização" : "Bloco principal";
      const imageRelPath = trainingExercisePrintImageForTitle(b.title);
      const exerciseImageSrc =
        imageRelPath && assetBaseUrl ? `${assetBaseUrl}${imageRelPath}` : imageRelPath;
      return `
      <section class="block">
        <h2>${i + 1}. ${esc(b.title)} <span class="meta">(${esc(phase)} · ${b.durationMin} min)</span></h2>
        <p><strong>Como correr:</strong> ${esc(b.description)}</p>
        ${exerciseImageSrc ? `<p><strong>Explicação:</strong></p>` : ""}
        ${
          exerciseImageSrc
            ? `<figure class="exercise-image-wrap">
        <img class="exercise-image" src="${esc(exerciseImageSrc)}" alt="Imagem do exercício ${esc(
                b.title
              )}" onerror="this.style.display='none';" />
        <figcaption>Imagem do exercício (para impressão)</figcaption>
      </figure>`
            : ""
        }
        <p><strong>Pontos de treino:</strong> ${esc(b.coachingPoints)}</p>
        ${b.setup ? `<p><strong>Organização:</strong> ${esc(b.setup)}</p>` : ""}
        ${b.groupSplit ? `<p><strong>Grupos / focos:</strong> ${esc(b.groupSplit)}</p>` : ""}
        ${b.diagramHint ? `<p class="diagram"><strong>Diagrama (sugestão):</strong> ${esc(b.diagramHint)}</p>` : ""}
      </section>`;
    })
    .join("");

  const roster = playerLines.length
    ? `<ul>${playerLines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
    : "<p>—</p>";

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <title>${esc(plan.sessionTitle)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #111; line-height: 1.45; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .sub { color: #444; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .block { page-break-inside: avoid; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
    .block h2 { font-size: 1.1rem; margin: 0 0 0.5rem; }
    .meta { font-weight: normal; color: #555; font-size: 0.85rem; }
    .diagram { background: #f6f6f6; padding: 8px 12px; border-radius: 6px; }
    .exercise-image-wrap { margin: 10px 0 12px; }
    .exercise-image { display: block; width: 100%; max-width: 560px; border-radius: 8px; border: 1px solid #ddd; }
    .exercise-image-wrap figcaption { margin-top: 4px; font-size: 0.78rem; color: #555; }
    ul { margin: 0.25rem 0; padding-left: 1.25rem; }
    @media print { body { margin: 12px; } .block { border-color: #ccc; } }
  </style>
</head>
<body>
  <h1>${esc(plan.sessionTitle)}</h1>
  <p class="sub">Duração total: ${durationMin} min · Gerado: ${esc(generatedAt)} · CoachBuilder</p>
  <p>${esc(plan.summary)}</p>
  <h3>Plantel considerado (${playerLines.length} jogadores)</h3>
  ${roster}
  ${blocksHtml}
  <section class="block" style="border:none">
    <h2>Notas finais</h2>
    <p>${esc(plan.closingNotes)}</p>
  </section>
</body>
</html>`;
}

export function buildSingleDrillDocumentHtml(params: {
  drill: AiSingleDrill;
  generatedAt: string;
  assetBaseUrl?: string;
}): string {
  const { drill, generatedAt, assetBaseUrl } = params;
  const imageRelPath = trainingExercisePrintImageForTitle(drill.title);
  const exerciseImageSrc = imageRelPath && assetBaseUrl ? `${assetBaseUrl}${imageRelPath}` : imageRelPath;
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <title>${esc(drill.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #111; line-height: 1.45; }
    h1 { font-size: 1.35rem; }
    .meta { color: #555; font-size: 0.9rem; }
    .exercise-image-wrap { margin: 10px 0 12px; }
    .exercise-image { display: block; width: 100%; max-width: 560px; border-radius: 8px; border: 1px solid #ddd; }
    .exercise-image-wrap figcaption { margin-top: 4px; font-size: 0.78rem; color: #555; }
  </style>
</head>
<body>
  <h1>${esc(drill.title)}</h1>
  <p class="meta">${drill.durationMin} min · ${esc(generatedAt)} · CoachBuilder</p>
  <p><strong>Objetivo:</strong> ${esc(drill.objective)}</p>
  <p><strong>Exercício:</strong> ${esc(drill.description)}</p>
  ${exerciseImageSrc ? `<p><strong>Explicação:</strong></p>` : ""}
  ${
    exerciseImageSrc
      ? `<figure class="exercise-image-wrap">
  <img class="exercise-image" src="${esc(exerciseImageSrc)}" alt="Imagem do exercício ${esc(
          drill.title
        )}" onerror="this.style.display='none';" />
  <figcaption>Imagem do exercício (para impressão)</figcaption>
</figure>`
      : ""
  }
  ${drill.progression ? `<p><strong>Progressão:</strong> ${esc(drill.progression)}</p>` : ""}
  ${drill.coachingCues ? `<p><strong>Cues:</strong> ${esc(drill.coachingCues)}</p>` : ""}
  ${drill.variations ? `<p><strong>Variações:</strong> ${esc(drill.variations)}</p>` : ""}
  ${drill.diagramHint ? `<p><strong>Diagrama:</strong> ${esc(drill.diagramHint)}</p>` : ""}
</body>
</html>`;
}

export function openPrintableHtml(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
