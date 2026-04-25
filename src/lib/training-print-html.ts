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

/**
 * Alturas do verso (Notas + Jogadores) para caber sempre numa única página de impressão.
 * Valores em mm são conservadores face a headers, @page 10mm e motores WebKit de impressão.
 */
function computeBackPageTableMetrics(playerCount: number): {
  notesRowMm: number;
  playerRowMm: number;
  fontPx: number;
} {
  const n = Math.max(1, Math.floor(playerCount));
  /** Área vertical aproximada disponível para o <main> do verso (mm). */
  const usableMainMm = 240;
  /** Header verso + footer + gap entre cartões + cartão jogadores (título, bordas, thead). */
  const fixedChromeMm = 48 + 14;
  let notesRowMm = n > 34 ? 3.4 : n > 26 ? 4.0 : n > 20 ? 4.8 : n > 14 ? 5.6 : 7.0;
  const minNotesRowMm = 2.8;
  const minPlayerRowMm = 1.55;

  for (let iter = 0; iter < 14; iter++) {
    const notesBlockMm = 7 + 3 * notesRowMm;
    const theadMm = 5.5;
    const borderSlackMm = n * 0.14;
    const rowBudgetMm = usableMainMm - fixedChromeMm - notesBlockMm - theadMm - borderSlackMm;
    const rawRowMm = rowBudgetMm / n;
    if (rawRowMm >= minPlayerRowMm + 0.08) {
      const playerRowMm = Math.min(5.6, Math.max(minPlayerRowMm, rawRowMm));
      const fontPx = Math.min(8.5, Math.max(5.2, 4.2 + playerRowMm * 0.85));
      return {
        notesRowMm: Math.round(notesRowMm * 10) / 10,
        playerRowMm: Math.round(playerRowMm * 100) / 100,
        fontPx: Math.round(fontPx * 10) / 10,
      };
    }
    notesRowMm = Math.max(minNotesRowMm, notesRowMm * 0.88);
  }

  const notesBlockMm = 7 + 3 * minNotesRowMm;
  const theadMm = 5.5;
  const borderSlackMm = n * 0.14;
  const rowBudgetMm = usableMainMm - fixedChromeMm - notesBlockMm - theadMm - borderSlackMm;
  const playerRowMm = Math.max(minPlayerRowMm, rowBudgetMm / n);
  return {
    notesRowMm: minNotesRowMm,
    playerRowMm: Math.round(playerRowMm * 100) / 100,
    fontPx: 5.2,
  };
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
  const blocksHtml = plan.blocks
    .map((b, i) => {
      const phase =
        b.phase === "warmup" ? "Aquecimento" : b.phase === "cooldown" ? "Finalização" : "Bloco principal";
      const imageRelPath = trainingExercisePrintImageForTitle(b.title);
      const exerciseImageSrc =
        imageRelPath && assetBaseUrl ? `${assetBaseUrl}${imageRelPath}` : imageRelPath;
      const playerCount = Math.max(playerLines.length, 1);
      const backMetrics = computeBackPageTableMetrics(playerCount);
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
        </section>
        <section class="sheet back">
          <header class="page-header">
            <h1>${esc(b.title)} · Folha de trabalho</h1>
            <p class="meta">Parte de trás — Notas e Jogadores</p>
          </header>
          <main class="page-body back-layout">
            <section class="table-card">
              <h2>Notas</h2>
              <table class="grid-table notes" style="--notes-row-mm:${backMetrics.notesRowMm}mm;">
                <tbody>
                  ${Array.from({ length: 3 }, () => `<tr><td>&nbsp;</td></tr>`).join("")}
                </tbody>
              </table>
            </section>
            <section class="table-card">
              <h2>Jogadores</h2>
              <table class="grid-table players" style="--player-row-mm:${backMetrics.playerRowMm}mm; --player-font-px:${backMetrics.fontPx}px;">
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
      height: 272mm;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      overflow: hidden;
      padding: 0;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .sheet.back { overflow: hidden; }
    .sheet.back .page-body { overflow: hidden; }
    .page-header h1 { font-size: 18px; margin: 0 0 1.5mm; line-height: 1.08; }
    .meta { color: #444; font-size: 9px; margin: 0.5mm 0; }
    .page-body { min-height: 0; overflow: hidden; }
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
    .back-layout { display: flex; flex-direction: column; gap: 1.5mm; overflow: hidden; }
    .table-card { border: 1px solid #d8d8d8; border-radius: 8px; padding: 1.2mm; page-break-inside: avoid; break-inside: avoid; }
    .table-card h2 { margin: 0 0 0.8mm; font-size: 10px; }
    .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .grid-table th, .grid-table td { border: 1px solid #d4d4d4; padding: 0.85mm 1mm; font-size: 8px; vertical-align: top; line-height: 1.15; }
    .grid-table th { background: #f5f5f5; text-align: left; font-weight: 600; }
    .grid-table.notes td { height: var(--notes-row-mm, 7mm); }
    .grid-table.players {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .grid-table.players thead th {
      font-size: 7px;
      padding: 0.4mm 0.55mm;
      line-height: 1.05;
      white-space: nowrap;
    }
    .grid-table.players tbody td {
      height: var(--player-row-mm, 4.6mm);
      max-height: var(--player-row-mm, 4.6mm);
      font-size: var(--player-font-px, 8px);
      line-height: 1.05;
      padding: 0.35mm 0.5mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      vertical-align: middle;
    }
    .grid-table.players th:nth-child(1) { width: 8%; }
    .grid-table.players th:nth-child(2) { width: 42%; }
    .grid-table.players th:nth-child(3) { width: 40%; }
    .grid-table.players th:nth-child(4) { width: 14%; text-align: center; }
    .back-layout .table-card:nth-child(2) { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    .back-layout .table-card:nth-child(2) .grid-table { height: auto; }
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
  const drillBackMetrics = computeBackPageTableMetrics(14);
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <title>${esc(drill.title)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; line-height: 1.24; font-size: 11px; }
    .sheet {
      height: 272mm;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      padding: 0;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .sheet.back { overflow: hidden; }
    .sheet.back .page-body { overflow: hidden; }
    h1 { font-size: 18px; margin: 0 0 1.5mm; line-height: 1.08; }
    .meta { color: #555; font-size: 9px; margin: 0.5mm 0; }
    .page-body { min-height: 0; overflow: hidden; }
    .page-body p { margin: 1.1mm 0; }
    .exercise-image-wrap { margin: 1.2mm 0 1.6mm; }
    .exercise-image { display: block; width: 100%; max-height: 103mm; object-fit: contain; border-radius: 8px; border: 1px solid #ddd; }
    .exercise-image-wrap figcaption { margin-top: 0.8mm; font-size: 8px; color: #555; }
    .image-fallback { border: 1px dashed #bbb; border-radius: 8px; padding: 10mm 4mm; text-align: center; color: #666; margin: 1.2mm 0 1.6mm; }
    .back-layout { display: flex; flex-direction: column; gap: 1.5mm; overflow: hidden; }
    .table-card { border: 1px solid #d8d8d8; border-radius: 8px; padding: 1.2mm; page-break-inside: avoid; break-inside: avoid; }
    .table-card h2 { margin: 0 0 0.8mm; font-size: 10px; }
    .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .grid-table th, .grid-table td { border: 1px solid #d4d4d4; padding: 0.85mm 1mm; font-size: 8px; vertical-align: top; line-height: 1.15; }
    .grid-table th { background: #f5f5f5; text-align: left; font-weight: 600; }
    .grid-table.notes td { height: var(--notes-row-mm, 7mm); }
    .grid-table.players {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .grid-table.players thead th {
      font-size: 7px;
      padding: 0.4mm 0.55mm;
      line-height: 1.05;
      white-space: nowrap;
    }
    .grid-table.players tbody td {
      height: var(--player-row-mm, 4.6mm);
      max-height: var(--player-row-mm, 4.6mm);
      font-size: var(--player-font-px, 8px);
      line-height: 1.05;
      padding: 0.35mm 0.5mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      vertical-align: middle;
    }
    .grid-table.players th:nth-child(1) { width: 8%; }
    .grid-table.players th:nth-child(2) { width: 42%; }
    .grid-table.players th:nth-child(3) { width: 40%; }
    .grid-table.players th:nth-child(4) { width: 14%; text-align: center; }
    .back-layout .table-card:nth-child(2) { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    .back-layout .table-card:nth-child(2) .grid-table { height: auto; }
  </style>
</head>
<body>
  <section class="sheet front">
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
  </section>
  <section class="sheet back">
    <header>
      <h1>${esc(drill.title)} · Folha de trabalho</h1>
      <p class="meta">Parte de trás — Notas e Jogadores</p>
    </header>
    <main class="page-body back-layout">
      <section class="table-card">
        <h2>Notas</h2>
        <table class="grid-table notes" style="--notes-row-mm:${drillBackMetrics.notesRowMm}mm;"><tbody>${Array.from({ length: 3 }, () => `<tr><td>&nbsp;</td></tr>`).join("")}</tbody></table>
      </section>
      <section class="table-card">
        <h2>Jogadores</h2>
        <table class="grid-table players" style="--player-row-mm:${drillBackMetrics.playerRowMm}mm; --player-font-px:${drillBackMetrics.fontPx}px;">
          <thead><tr><th>#</th><th>Nome</th><th>Observações</th><th>Rating</th></tr></thead>
          <tbody>${Array.from({ length: 14 }, (_, i) => `<tr><td>${i + 1}</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`).join("")}</tbody>
        </table>
      </section>
    </main>
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
