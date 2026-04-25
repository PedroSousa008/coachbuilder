import type { AiFullTrainingSession, AiSingleDrill } from "@/lib/training-ai-types";
import { trainingExercisePrintImageForTitle } from "@/lib/training-exercise-print-images";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rodapé de geração: "CoachBuilder" ou "CoachBuilder · Nome" quando há treinador (mesmo separador que o resto da linha). */
function coachBuilderAttribution(coachPrintName: string | undefined): string {
  const t = coachPrintName?.trim();
  if (!t) return "CoachBuilder";
  return `CoachBuilder · ${esc(t)}`;
}

export function buildFullSessionDocumentHtml(params: {
  plan: AiFullTrainingSession;
  durationMin: number;
  playerLines: string[];
  generatedAt: string;
  assetBaseUrl?: string;
  /** Nome do treinador (ex. perfil); aparece como "CoachBuilder · Nome" no PDF. */
  coachPrintName?: string;
}): string {
  const { plan, durationMin, playerLines, generatedAt, assetBaseUrl, coachPrintName } = params;
  const totalPages = plan.blocks.length;
  const blocksHtml = plan.blocks
    .map((b, i) => {
      const phase =
        b.phase === "warmup" ? "Aquecimento" : b.phase === "cooldown" ? "Finalização" : "Bloco principal";
      const imageRelPath = trainingExercisePrintImageForTitle(b.title);
      const exerciseImageSrc =
        imageRelPath && assetBaseUrl ? `${assetBaseUrl}${imageRelPath}` : imageRelPath;
      return `
      <section class="exercise-page">
        <header class="page-header">
          <h1>${esc(b.title)}</h1>
          <p class="meta">${esc(phase)} · ${b.durationMin} min · Sessão: ${durationMin} min · ${esc(
            generatedAt
          )} · ${coachBuilderAttribution(coachPrintName)}</p>
          <p class="meta">Exercício ${i + 1} de ${totalPages}</p>
        </header>
        <main class="page-body">
          <p><strong>Como correr:</strong> ${esc(b.description)}</p>
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
        </main>
        <footer class="page-footer">Página ${i + 1} / ${totalPages}</footer>
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <title>${esc(plan.sessionTitle)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; line-height: 1.28; font-size: 12px; }
    .exercise-page {
      width: 100%;
      min-height: calc(297mm - 20mm);
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      padding: 0.5mm 0;
    }
    .exercise-page:last-child { page-break-after: auto; break-after: auto; }
    .page-header h1 { font-size: 20px; margin: 0 0 2mm; line-height: 1.1; }
    .meta { color: #444; font-size: 10px; margin: 0.5mm 0; }
    .page-body { flex: 1; min-height: 0; }
    .page-body p { margin: 1.5mm 0; }
    .diagram { background: #f6f6f6; padding: 6px 8px; border-radius: 6px; font-size: 11px; }
    .exercise-image-wrap { margin: 2mm 0 2.5mm; }
    .exercise-image {
      display: block;
      width: 100%;
      max-height: 95mm;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .exercise-image-wrap figcaption { margin-top: 1mm; font-size: 9px; color: #555; }
    .page-footer { margin-top: auto; padding-top: 2mm; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #333; }
  </style>
</head>
<body>
  ${blocksHtml}
</body>
</html>`;
}

export function buildSingleDrillDocumentHtml(params: {
  drill: AiSingleDrill;
  generatedAt: string;
  assetBaseUrl?: string;
  coachPrintName?: string;
}): string {
  const { drill, generatedAt, assetBaseUrl, coachPrintName } = params;
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
  <p class="meta">${drill.durationMin} min · ${esc(generatedAt)} · ${coachBuilderAttribution(coachPrintName)}</p>
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

/**
 * Abre o HTML num separador e abre o diálogo de impressão (PDF via “Guardar como PDF”).
 * Opcionalmente reutiliza uma janela já aberta no **mesmo** clique do utilizador — necessário
 * quando o HTML só chega depois de um `fetch`, para o browser não bloquear pop-ups.
 */
export function openPrintableHtml(html: string, existingWindow?: Window | null): boolean {
  const w = existingWindow ?? window.open("about:blank", "_blank");
  if (!w) return false;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* ignorar — utilizador pode imprimir manualmente */
      }
    }, 300);
  } catch {
    return false;
  }
  return true;
}
