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

function splitPlayerLine(raw: string): { number: string; name: string } {
  const s = raw.trim();
  const m = /^#(\d+)\s+(.+?)(?:\s+—.*)?$/u.exec(s);
  if (!m) return { number: "", name: s };
  return { number: m[1] ?? "", name: (m[2] ?? "").trim() };
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
  const totalPages = plan.blocks.length * 2;
  const blocksHtml = plan.blocks
    .map((b, i) => {
      const phase =
        b.phase === "warmup" ? "Aquecimento" : b.phase === "cooldown" ? "Finalização" : "Bloco principal";
      const imageRelPath = trainingExercisePrintImageForTitle(b.title);
      const exerciseImageSrc =
        imageRelPath && assetBaseUrl ? `${assetBaseUrl}${imageRelPath}` : imageRelPath;
      const frontPage = i * 2 + 1;
      const backPage = i * 2 + 2;
      return `
      <section class="sheet front">
        <header class="page-header">
          <h1>${esc(b.title)}</h1>
          <p class="meta">${esc(phase)} · ${b.durationMin} min · Sessão: ${durationMin} min</p>
          <p class="meta">${esc(generatedAt)} · ${coachBuilderAttribution(coachPrintName)}</p>
        </header>
        <main class="page-body">
          <p><strong>Explicação:</strong> ${esc(b.description)}</p>
          ${
            exerciseImageSrc
              ? `<figure class="exercise-image-wrap">
          <img class="exercise-image" src="${esc(exerciseImageSrc)}" alt="Imagem do exercício ${esc(
                  b.title
                )}" onerror="this.style.display='none';" />
          <figcaption>Imagem do exercício</figcaption>
        </figure>`
              : `<div class="image-fallback">Sem imagem associada a este exercício.</div>`
          }
          <p><strong>Pontos de treino:</strong> ${esc(b.coachingPoints)}</p>
          ${b.setup ? `<p><strong>Organização:</strong> ${esc(b.setup)}</p>` : ""}
          ${b.groupSplit ? `<p><strong>Grupos / focos:</strong> ${esc(b.groupSplit)}</p>` : ""}
          ${b.diagramHint ? `<p class="diagram"><strong>Diagrama (sugestão):</strong> ${esc(b.diagramHint)}</p>` : ""}
        </main>
        <footer class="page-footer">Página ${frontPage} / ${totalPages}</footer>
      </section>
      <section class="sheet back">
        <header class="page-header">
          <h1>${esc(b.title)} · Folha de trabalho</h1>
          <p class="meta">Parte de trás — Notas e Jogadores</p>
        </header>
        <main class="page-body back-layout">
          <section class="table-card">
            <h2>Notas</h2>
            <table class="grid-table notes">
              <tbody>
                ${Array.from({ length: 3 }, () => `<tr><td>&nbsp;</td></tr>`).join("")}
              </tbody>
            </table>
          </section>
          <section class="table-card">
            <h2>Jogadores</h2>
            <table class="grid-table players">
              <thead>
                <tr><th>#</th><th>Nome</th><th>Observações</th><th>Rating</th></tr>
              </thead>
              <tbody>
                ${
                  playerLines.length > 0
                    ? playerLines
                        .map((line) => {
                          const parsed = splitPlayerLine(line);
                          return `<tr><td>${esc(parsed.number)}</td><td>${esc(parsed.name)}</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
                        })
                        .join("")
                    : `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`
                }
              </tbody>
            </table>
          </section>
        </main>
        <footer class="page-footer">Página ${backPage} / ${totalPages}</footer>
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
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; line-height: 1.24; font-size: 11px; }
    .sheet {
      width: 100%;
      height: 276mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sheet + .sheet {
      page-break-before: always;
      break-before: page;
    }
    .page-header h1 { font-size: 18px; margin: 0 0 1.5mm; line-height: 1.08; }
    .meta { color: #444; font-size: 9px; margin: 0.5mm 0; }
    .page-body { flex: 1; min-height: 0; }
    .page-body p { margin: 1.1mm 0; }
    .diagram { background: #f6f6f6; padding: 5px 7px; border-radius: 6px; font-size: 10px; }
    .exercise-image-wrap { margin: 1.2mm 0 1.6mm; }
    .exercise-image {
      display: block;
      width: 100%;
      max-height: 103mm;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .image-fallback { border: 1px dashed #bbb; border-radius: 8px; padding: 10mm 4mm; text-align: center; color: #666; margin: 1.2mm 0 1.6mm; }
    .exercise-image-wrap figcaption { margin-top: 0.8mm; font-size: 8px; color: #555; }
    .back-layout { display: flex; flex-direction: column; gap: 2mm; overflow: hidden; }
    .table-card { border: 1px solid #d8d8d8; border-radius: 8px; padding: 1.5mm; }
    .table-card h2 { margin: 0 0 1mm; font-size: 11px; }
    .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .grid-table th, .grid-table td { border: 1px solid #d4d4d4; padding: 1.1mm 1.4mm; font-size: 9px; vertical-align: top; }
    .grid-table th { background: #f5f5f5; text-align: left; font-weight: 600; }
    .grid-table.notes td { height: 16mm; }
    .grid-table.players td { height: 6mm; }
    .grid-table.players th:nth-child(1) { width: 8%; }
    .grid-table.players th:nth-child(2) { width: 42%; }
    .grid-table.players th:nth-child(3) { width: 40%; }
    .grid-table.players th:nth-child(4) { width: 14%; text-align: center; }
    .back-layout .table-card:nth-child(2) { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .back-layout .table-card:nth-child(2) .grid-table { height: 100%; }
    .page-footer { margin-top: auto; padding-top: 1.5mm; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #333; }
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
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; line-height: 1.24; font-size: 11px; }
    .sheet { height: 276mm; display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; }
    .sheet + .sheet { page-break-before: always; break-before: page; }
    h1 { font-size: 18px; margin: 0 0 1.5mm; line-height: 1.08; }
    .meta { color: #555; font-size: 9px; margin: 0.5mm 0; }
    .page-body { flex: 1; min-height: 0; }
    .page-body p { margin: 1.1mm 0; }
    .exercise-image-wrap { margin: 1.2mm 0 1.6mm; }
    .exercise-image { display: block; width: 100%; max-height: 103mm; object-fit: contain; border-radius: 8px; border: 1px solid #ddd; }
    .exercise-image-wrap figcaption { margin-top: 0.8mm; font-size: 8px; color: #555; }
    .image-fallback { border: 1px dashed #bbb; border-radius: 8px; padding: 10mm 4mm; text-align: center; color: #666; margin: 1.2mm 0 1.6mm; }
    .back-grid { display: grid; grid-template-rows: 1.45fr 1fr 1fr; gap: 2mm; }
    .table-card { border: 1px solid #d8d8d8; border-radius: 8px; padding: 1.5mm; }
    .table-card h2 { margin: 0 0 1mm; font-size: 11px; }
    .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .grid-table th, .grid-table td { border: 1px solid #d4d4d4; padding: 1.1mm 1.4mm; font-size: 9px; vertical-align: top; }
    .grid-table th { background: #f5f5f5; text-align: left; font-weight: 600; }
    .grid-table.notes td { height: 7.5mm; }
    .grid-table.players td, .grid-table.feedback td { height: 6.3mm; }
    .grid-table.players th:nth-child(1) { width: 8%; }
    .grid-table.players th:nth-child(2) { width: 42%; }
    .grid-table.players th:nth-child(3) { width: 40%; }
    .grid-table.players th:nth-child(4) { width: 14%; text-align: center; }
    .grid-table.feedback th:nth-child(1) { width: 35%; }
    .grid-table.feedback th:nth-child(2) { width: 12%; text-align: center; }
    .grid-table.feedback th:nth-child(3) { width: 53%; }
    .page-footer { margin-top: auto; padding-top: 1.5mm; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #333; }
  </style>
</head>
<body>
  <section class="sheet">
    <header>
      <h1>${esc(drill.title)}</h1>
      <p class="meta">${drill.durationMin} min · ${esc(generatedAt)} · ${coachBuilderAttribution(coachPrintName)}</p>
    </header>
    <main class="page-body">
      <p><strong>Objetivo:</strong> ${esc(drill.objective)}</p>
      <p><strong>Explicação:</strong> ${esc(drill.description)}</p>
      ${
        exerciseImageSrc
          ? `<figure class="exercise-image-wrap">
      <img class="exercise-image" src="${esc(exerciseImageSrc)}" alt="Imagem do exercício ${esc(
              drill.title
            )}" onerror="this.style.display='none';" />
      <figcaption>Imagem do exercício</figcaption>
    </figure>`
          : `<div class="image-fallback">Sem imagem associada a este exercício.</div>`
      }
      ${drill.progression ? `<p><strong>Progressão:</strong> ${esc(drill.progression)}</p>` : ""}
      ${drill.coachingCues ? `<p><strong>Pontos de treino:</strong> ${esc(drill.coachingCues)}</p>` : ""}
      ${drill.variations ? `<p><strong>Variações:</strong> ${esc(drill.variations)}</p>` : ""}
      ${drill.diagramHint ? `<p><strong>Diagrama:</strong> ${esc(drill.diagramHint)}</p>` : ""}
    </main>
    <footer class="page-footer">Página 1 / 2</footer>
  </section>
  <section class="sheet">
    <header>
      <h1>${esc(drill.title)} · Folha de trabalho</h1>
      <p class="meta">Parte de trás — Notas e Jogadores</p>
    </header>
    <main class="page-body back-layout">
      <section class="table-card">
        <h2>Notas</h2>
        <table class="grid-table notes"><tbody>${Array.from({ length: 3 }, () => `<tr><td>&nbsp;</td></tr>`).join("")}</tbody></table>
      </section>
      <section class="table-card">
        <h2>Jogadores</h2>
        <table class="grid-table players">
          <thead><tr><th>#</th><th>Nome</th><th>Observações</th><th>Rating</th></tr></thead>
          <tbody>${Array.from({ length: 14 }, (_, i) => `<tr><td>${i + 1}</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`).join("")}</tbody>
        </table>
      </section>
    </main>
    <footer class="page-footer">Página 2 / 2</footer>
  </section>
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
    const tryPrint = () => {
      try {
        w.print();
      } catch {
        /* ignorar — utilizador pode imprimir manualmente */
      }
    };
    const waitForImagesThenPrint = () => {
      try {
        const imgs = Array.from(w.document.images ?? []);
        if (imgs.length === 0) {
          setTimeout(tryPrint, 120);
          return;
        }
        let pending = imgs.filter((img) => !img.complete).length;
        if (pending === 0) {
          setTimeout(tryPrint, 120);
          return;
        }
        const done = () => {
          pending -= 1;
          if (pending <= 0) setTimeout(tryPrint, 120);
        };
        imgs.forEach((img) => {
          if (img.complete) return;
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
        setTimeout(tryPrint, 2200);
      } catch {
        setTimeout(tryPrint, 300);
      }
    };
    setTimeout(waitForImagesThenPrint, 80);
  } catch {
    return false;
  }
  return true;
}
