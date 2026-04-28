"use client";

import { useMemo, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import type { MatchFixture, ParsedMatchEvent } from "@/types";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FixtureFormModal } from "@/components/calendar/FixtureFormModal";
import { useScheduleNow } from "@/hooks/useScheduleNow";
import { buildMonthGrid, isSameLocalDay } from "@/lib/coaching-professionals-calendar";
import { cn } from "@/lib/utils";
import type { SketchCalendarEventCategory } from "@/types";
import { scoreTeamMatch, teamNamesLikelyMatch } from "@/lib/league-team-name-match";

const cellInputClass =
  "h-8 min-w-0 px-1.5 py-0 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function monthDayKey(isoDate: string): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function dayIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthInputFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateFromMonthInput(v: string): Date {
  const [ys, ms] = v.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return new Date();
  return new Date(y, m - 1, 1);
}

type OcrWordBox = { x0: number; y0: number; x1: number; y1: number };
type OcrWordLike = { text?: string; bbox?: OcrWordBox };
type OcrLineLike = { text?: string };
type MatchRow = { homeTeam: string; homeGoals: number; awayGoals: number; awayTeam: string };
type MatchRowDraft = { homeTeam: string; result: string; awayTeam: string };
type RowsValidation =
  | { ok: true; mappedTeams: number }
  | { ok: false; kind: "parse"; message: string }
  | { ok: false; kind: "mapping"; message: string };

function parseScorePair(raw: string): { homeGoals: number; awayGoals: number } | null {
  const t = raw.replace(/\s+/g, "").replace(/[Oo]/g, "0");
  const m = t.match(/^([0-9]{1,2})[-–—−‐\/]([0-9]{1,2})$/);
  if (!m) return null;
  const hg = Number(m[1]);
  const ag = Number(m[2]);
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return null;
  if (hg < 0 || ag < 0 || hg > 15 || ag > 15) return null;
  return { homeGoals: hg, awayGoals: ag };
}

function looksLikeTeamToken(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return false;
  if (!/^[A-Za-zÀ-ÿ0-9 .,'\-()]+$/.test(t)) return false;
  if (/^[|:;.,'"()\-\u2013\u2014]+$/.test(t)) return false;
  if (t.length <= 1 && !/^[A-Za-zÀ-ÿ]\.$/.test(t)) return false;
  return parseScorePair(t) == null;
}

function buildTeamNameFromWords(words: OcrWordLike[]): string {
  return words
    .filter((w) => looksLikeTeamToken(w.text ?? ""))
    .sort((a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0))
    .map((w) => (w.text ?? "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeEvents(events: ParsedMatchEvent[]): ParsedMatchEvent[] {
  const seen = new Set<string>();
  const out: ParsedMatchEvent[] = [];
  for (const e of events) {
    const k = `${e.homeTeam.toLowerCase()}|${e.awayTeam.toLowerCase()}|${e.homeGoals}-${e.awayGoals}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function cleanTeamCell(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} .,'\-()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^A-Za-zÀ-ÿ0-9]+/, "")
    .replace(/[^A-Za-zÀ-ÿ0-9)]+$/, "")
    .trim();
}

function matchRowFromLineText(raw: string): MatchRow | null {
  const line = raw.replace(/\s+/g, " ").trim();
  if (!line) return null;
  const score = line.match(/([0-9Oo]{1,2})\s*[-–—−‐\/]\s*([0-9Oo]{1,2})/);
  if (!score || score.index == null) return null;
  const hg = Number((score[1] ?? "").replace(/[Oo]/g, "0"));
  const ag = Number((score[2] ?? "").replace(/[Oo]/g, "0"));
  if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0 || hg > 15 || ag > 15) return null;
  const left = line.slice(0, score.index);
  const right = line.slice(score.index + score[0].length);
  const homeTeam = cleanTeamCell(left);
  const awayTeam = cleanTeamCell(right);
  if (!homeTeam || !awayTeam) return null;
  if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) return null;
  return { homeTeam, homeGoals: hg, awayGoals: ag, awayTeam };
}

function rowsToEvents(rows: MatchRow[]): ParsedMatchEvent[] {
  return rows.map((r) => ({
    homeTeam: r.homeTeam,
    awayTeam: r.awayTeam,
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
    source: "image" as const,
  }));
}

function toDraftRows(rows: MatchRow[]): MatchRowDraft[] {
  return rows.map((r) => ({
    homeTeam: r.homeTeam,
    result: `${r.homeGoals}-${r.awayGoals}`,
    awayTeam: r.awayTeam,
  }));
}

function dedupeMatchRows(rows: MatchRow[]): MatchRow[] {
  const seen = new Set<string>();
  const out: MatchRow[] = [];
  for (const r of rows) {
    const key = `${r.homeTeam.toLowerCase()}|${r.awayTeam.toLowerCase()}|${r.homeGoals}-${r.awayGoals}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function draftRowsToRows(rows: MatchRowDraft[]): { rows: MatchRow[]; invalidRow: number | null } {
  const out: MatchRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const homeTeam = cleanTeamCell(row.homeTeam);
    const awayTeam = cleanTeamCell(row.awayTeam);
    const score = parseScorePair(row.result);
    if (!homeTeam || !awayTeam || !score) return { rows: [], invalidRow: i + 1 };
    out.push({
      homeTeam,
      awayTeam,
      homeGoals: score.homeGoals,
      awayGoals: score.awayGoals,
    });
  }
  return { rows: out, invalidRow: null };
}

function validateMatchRowsBeforeApply(rows: MatchRow[], tableTeamNames: string[]): RowsValidation {
  if (!rows.length) return { ok: false, kind: "parse", message: "Não consegui extrair linhas de jogo da imagem." };
  const uniqueNames = new Set<string>();
  for (const r of rows) {
    const h = r.homeTeam.trim();
    const a = r.awayTeam.trim();
    if (!h || !a) {
      return { ok: false, kind: "parse", message: "Há linhas sem equipa da casa/fora completa." };
    }
    if (h.toLowerCase() === a.toLowerCase()) {
      return { ok: false, kind: "parse", message: `Linha inválida: ${h} aparece dos dois lados.` };
    }
    uniqueNames.add(h);
    uniqueNames.add(a);
  }
  const expectedTeams = rows.length * 2;
  if (uniqueNames.size !== expectedTeams) {
    return {
      ok: false,
      kind: "parse",
      message:
        `Foram detetados ${rows.length} jogos, mas só ${uniqueNames.size} equipas únicas (esperado ${expectedTeams}). ` +
        "Isto indica parsing incompleto dos Resultados por print.",
    };
  }

  const tableNames = tableTeamNames.map((t) => t.trim()).filter(Boolean);
  if (!tableNames.length) {
    return {
      ok: false,
      kind: "mapping",
      message: "A League Table ainda não tem nomes de equipa preenchidos na fase ativa.",
    };
  }

  const pairs: Array<{ ocrName: string; tableName: string; score: number }> = [];
  for (const ocrName of uniqueNames) {
    for (const tableName of tableNames) {
      const s = scoreTeamMatch(ocrName, tableName);
      if (s >= 0.34) pairs.push({ ocrName, tableName, score: s });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const usedOcr = new Set<string>();
  const usedTable = new Set<string>();
  for (const p of pairs) {
    if (usedOcr.has(p.ocrName) || usedTable.has(p.tableName)) continue;
    usedOcr.add(p.ocrName);
    usedTable.add(p.tableName);
  }
  if (usedOcr.size !== uniqueNames.size) {
    const missing = [...uniqueNames].filter((n) => !usedOcr.has(n)).slice(0, 4);
    return {
      ok: false,
      kind: "mapping",
      message:
        `Falha no mapeamento para a League Table: ${usedOcr.size}/${uniqueNames.size} equipas. ` +
        `Não encontrei correspondência segura para: ${missing.join(", ")}.`,
    };
  }
  return { ok: true, mappedTeams: usedOcr.size };
}

function parseMatchRowsFromOcrLines(data: unknown): MatchRow[] {
  const lines = ((data as { lines?: OcrLineLike[] } | null)?.lines ?? [])
    .map((l) => matchRowFromLineText(l?.text ?? ""))
    .filter((x): x is MatchRow => x != null);
  const unique = new Map<string, MatchRow>();
  for (const r of lines) {
    const key = `${r.homeTeam.toLowerCase()}|${r.awayTeam.toLowerCase()}|${r.homeGoals}-${r.awayGoals}`;
    if (!unique.has(key)) unique.set(key, r);
  }
  return [...unique.values()];
}

function parseIntToken(raw: string): number | null {
  const t = raw.trim().replace(/[Oo]/g, "0");
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 15) return null;
  return n;
}

function isDashToken(raw: string): boolean {
  return /^[-–—−‐\/]$/.test(raw.trim());
}

function findScoreSpanInRow(wordsSorted: OcrWordLike[]): { homeGoals: number; awayGoals: number; leftX: number; rightX: number } | null {
  for (const w of wordsSorted) {
    const s = parseScorePair(w.text ?? "");
    if (!s) continue;
    return {
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      leftX: w.bbox!.x0,
      rightX: w.bbox!.x1,
    };
  }
  for (let i = 0; i <= wordsSorted.length - 3; i++) {
    const a = wordsSorted[i]!;
    const b = wordsSorted[i + 1]!;
    const c = wordsSorted[i + 2]!;
    const ag = parseIntToken(a.text ?? "");
    const bg = parseIntToken(c.text ?? "");
    if (ag == null || bg == null || !isDashToken(b.text ?? "")) continue;
    return {
      homeGoals: ag,
      awayGoals: bg,
      leftX: a.bbox!.x0,
      rightX: c.bbox!.x1,
    };
  }
  return null;
}

function groupWordsByVisualRows(words: OcrWordLike[]): OcrWordLike[][] {
  const sorted = [...words].sort((a, b) => (a.bbox!.y0 - b.bbox!.y0) || (a.bbox!.x0 - b.bbox!.x0));
  const rows: OcrWordLike[][] = [];
  for (const w of sorted) {
    const wy = (w.bbox!.y0 + w.bbox!.y1) / 2;
    const last = rows[rows.length - 1];
    if (!last) {
      rows.push([w]);
      continue;
    }
    const avgY = last.reduce((acc, cur) => acc + (cur.bbox!.y0 + cur.bbox!.y1) / 2, 0) / last.length;
    const tol = 14;
    if (Math.abs(wy - avgY) <= tol) last.push(w);
    else rows.push([w]);
  }
  return rows.map((r) => r.sort((a, b) => a.bbox!.x0 - b.bbox!.x0));
}

function parseMatchEventsFromOcrWordLayout(data: unknown): ParsedMatchEvent[] {
  const words = ((data as { words?: OcrWordLike[] } | null)?.words ?? []).filter(
    (w): w is OcrWordLike => !!w?.bbox && typeof w?.text === "string"
  );
  if (!words.length) return [];
  const out: ParsedMatchEvent[] = [];
  const rows = groupWordsByVisualRows(words);
  for (const rowWords of rows) {
    const score = findScoreSpanInRow(rowWords);
    if (!score) continue;
    const homeWords = rowWords.filter((w) => (w.bbox?.x1 ?? 0) < score.leftX - 4);
    const awayWords = rowWords.filter((w) => (w.bbox?.x0 ?? 0) > score.rightX + 4);
    const homeTeam = buildTeamNameFromWords(homeWords);
    const awayTeam = buildTeamNameFromWords(awayWords);
    if (!homeTeam || !awayTeam) continue;
    if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) continue;
    out.push({
      homeTeam,
      awayTeam,
      homeGoals: score.homeGoals,
      awayGoals: score.awayGoals,
      source: "image",
    });
  }
  return dedupeEvents(out);
}

export function CalendarPageClient() {
  const {
    fixtures,
    addFixture,
    updateFixture,
    removeFixture,
    leagueTableLastFetched,
    leagueSetup,
    initializeLeagueSetup,
    setActiveLeaguePhase,
    updateLeagueTeamName,
    updateLeagueTeamStats,
    applyLeagueMatchEvents,
    saveLeagueTableSnapshot,
    clearLeagueStandingsStatsKeepNames,
    pastClubResults,
    updatePastClubResultNote,
    removePastClubResult,
    sketchArea,
    setSketchArea,
    coachProfile,
    players,
    staff,
  } = useAppData();

  const [fixtureModalOpen, setFixtureModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFixture | null>(null);
  const [setupTeamsDraft, setSetupTeamsDraft] = useState("10");
  const [setupPhasesDraft, setSetupPhasesDraft] = useState("1");
  const [resultsRowsDraft, setResultsRowsDraft] = useState<MatchRowDraft[]>([]);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const resultsImageInputRef = useRef<HTMLInputElement>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTopic, setNewEventTopic] = useState<SketchCalendarEventCategory>("other");
  const [newEventDate, setNewEventDate] = useState(() => dayIsoLocal(new Date()));
  const [newEventNotes, setNewEventNotes] = useState("");
  const [printFromMonth, setPrintFromMonth] = useState(() => monthInputFromDate(new Date()));
  const nowMs = useScheduleNow();
  const monthCells = useMemo(
    () => buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );
  const today = useMemo(() => new Date(nowMs), [nowMs]);

  type CalendarEntry = {
    id: string;
    date: string;
    label: string;
    kind: "fixture" | "birthday" | "sketch_event" | "note";
    deletable: boolean;
  };

  const allCalendarEntries = useMemo(() => {
    const entries: CalendarEntry[] = [];
    for (const f of fixtures) {
      entries.push({
        id: f.id,
        date: dayIsoLocal(new Date(f.kickoff)),
        label: `Jogo: vs ${f.opponent}`,
        kind: "fixture",
        deletable: true,
      });
    }
    const pushBirthday = (name: string, subtitle: string, dob?: string) => {
      const k = monthDayKey(dob ?? "");
      if (!k) return;
      const [mm, dd] = k.split("-");
      const month = Number(mm);
      const day = Number(dd);
      for (let y = viewMonth.getFullYear() - 2; y <= viewMonth.getFullYear() + 4; y++) {
        const d = new Date(y, month - 1, day);
        if (Number.isNaN(d.getTime())) continue;
        entries.push({
          id: `birthday-${subtitle}-${name}-${y}-${month}-${day}`,
          date: dayIsoLocal(d),
          label: `Aniversário do ${name} (${subtitle})`,
          kind: "birthday",
          deletable: false,
        });
      }
    };
    pushBirthday(coachProfile.name.trim() || "Treinador", "Treinador", coachProfile.dateOfBirth);
    for (const p of players) pushBirthday(p.name, `Jogador #${p.number}`, p.dateOfBirth);
    for (const s of staff) pushBirthday(s.name, `Staff ${s.role}`, s.dateOfBirth);
    for (const ev of sketchArea.calendarEvents) {
      entries.push({
        id: ev.id,
        date: ev.date,
        label: `Evento: ${ev.title}`,
        kind: "sketch_event",
        deletable: true,
      });
    }
    for (const note of sketchArea.notes) {
      if (!note.date) continue;
      entries.push({
        id: note.id,
        date: note.date,
        label: `Nota Sketch: ${note.title}`,
        kind: "note",
        deletable: true,
      });
    }
    return entries;
  }, [coachProfile.dateOfBirth, coachProfile.name, fixtures, players, sketchArea.calendarEvents, sketchArea.notes, staff, viewMonth]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of allCalendarEntries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [allCalendarEntries]);

  const monthTopics = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const out: Array<{ date: string; label: string; kind: "fixture" | "birthday" | "sketch_event" | "note" }> = [];
    for (const [date, list] of entriesByDay.entries()) {
      const d = new Date(`${date}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== y || d.getMonth() !== m) continue;
      for (const item of list) out.push({ date: item.date, label: item.label, kind: item.kind });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
  }, [entriesByDay, viewMonth]);

  const handleCreateLeagueSetup = () => {
    const teams = Number(setupTeamsDraft);
    const phases = Number(setupPhasesDraft);
    initializeLeagueSetup(teams, phases);
  };

  const handleApplyResults = async () => {
    if (!leagueSetup) {
      setOcrError("Cria primeiro a tabela da liga (setup).");
      return;
    }
    setOcrBusy(true);
    setOcrError(null);
    try {
      const file = resultsImageInputRef.current?.files?.[0];
      if (!file) {
        setOcrError("Carrega uma imagem primeiro.");
        return;
      }
      try {
        const tess = await import("tesseract.js");
        const worker = await tess.createWorker("por+eng");
        const pageSegMode = tess.PSM?.SINGLE_BLOCK ?? "6";
        await worker.setParameters({ tessedit_pageseg_mode: pageSegMode });
        const recognized = await worker.recognize(file);
        const lineRows = parseMatchRowsFromOcrLines(recognized.data);
        const layoutEvents = parseMatchEventsFromOcrWordLayout(recognized.data);
        await worker.terminate();

        const layoutRows = layoutEvents.map((e) => ({
          homeTeam: e.homeTeam,
          homeGoals: e.homeGoals,
          awayGoals: e.awayGoals,
          awayTeam: e.awayTeam,
        }));
        // Alguns OCR devolvem `data.lines` truncado (ex.: 3 jogos) mas `data.words` consegue mais.
        // Escolhemos sempre a extração com maior cobertura de jogos.
        const strictRows = dedupeMatchRows(layoutRows.length > lineRows.length ? layoutRows : lineRows);
        if (!strictRows.length) {
          setOcrError("Não consegui montar a tabela Casa/Resultado/Fora a partir da imagem.");
          return;
        }
        setResultsRowsDraft(toDraftRows(strictRows));
      } catch {
        setOcrError("Não foi possível ler a imagem (OCR).");
        return;
      }
    } catch {
      setOcrError("Erro ao processar imagem.");
    } finally {
      setOcrBusy(false);
    }
  };

  const handleSendRowsToTable = () => {
    if (!leagueSetup) {
      setOcrError("Cria primeiro a tabela da liga (setup).");
      return;
    }
    if (!resultsRowsDraft.length) {
      setOcrError("Sem linhas para enviar. Carrega a imagem e gera a tabela primeiro.");
      return;
    }
    const activeRows =
      leagueSetup.phases.find((p) => p.id === leagueSetup.activePhaseId)?.standings.rows ?? [];
    const activeTableTeamNames = activeRows.map((r) => r.team);
    const parsed = draftRowsToRows(resultsRowsDraft);
    if (parsed.invalidRow != null) {
      setOcrError(`Linha ${parsed.invalidRow} inválida. Confirma Casa, Resultado (ex.: 2-1) e Fora.`);
      return;
    }
    const validation = validateMatchRowsBeforeApply(parsed.rows, activeTableTeamNames);
    if (!validation.ok) {
      setOcrError(validation.message);
      return;
    }
    const events = rowsToEvents(parsed.rows);
    const summary = applyLeagueMatchEvents(events, undefined, { requireFullApply: true });
    if (summary.skippedCount > 0) {
      setOcrError(
        `Detetei ${events.length} jogos, mas só consegui mapear ${summary.appliedCount} à League Table. ` +
          "Não apliquei alterações parciais. Confirma os nomes das equipas na tabela."
      );
      return;
    }
    setOcrError(null);
    if (resultsImageInputRef.current) resultsImageInputRef.current.value = "";
  };

  const handleCreateCustomEvent = () => {
    const title = newEventTitle.trim();
    if (!title || !newEventDate) return;
    const nowIso = new Date().toISOString();
    setSketchArea((prev) => ({
      ...prev,
      calendarEvents: [
        {
          id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          category: newEventTopic,
          date: newEventDate,
          notes: newEventNotes.trim() || undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...prev.calendarEvents,
      ],
    }));
    setEventModalOpen(false);
    setNewEventTitle("");
    setNewEventNotes("");
  };

  const handleDeleteCalendarEntry = (entry: CalendarEntry) => {
    if (!entry.deletable) return;
    if (entry.kind === "fixture") {
      removeFixture(entry.id);
      return;
    }
    if (entry.kind === "sketch_event") {
      setSketchArea((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.filter((ev) => ev.id !== entry.id),
      }));
      return;
    }
    if (entry.kind === "note") {
      setSketchArea((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== entry.id),
      }));
    }
  };

  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    return entriesByDay.get(dayIsoLocal(selectedDay)) ?? [];
  }, [entriesByDay, selectedDay]);

  const printableMonth = useMemo(() => dateFromMonthInput(printFromMonth), [printFromMonth]);
  const printableMonthKey = useMemo(
    () => `${printableMonth.getFullYear()}-${String(printableMonth.getMonth() + 1).padStart(2, "0")}`,
    [printableMonth]
  );
  const printableMonthItems = useMemo(
    () =>
      Array.from(entriesByDay.entries())
        .filter(([k]) => k.startsWith(printableMonthKey))
        .flatMap(([, list]) => list.map((item) => ({ date: item.date, label: item.label, kind: item.kind })))
        .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label)),
    [entriesByDay, printableMonthKey]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Calendar & matchweek</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configura a liga, preenche a classificação por fase, atualiza por OCR e gere jogos futuros no calendário.
        </p>
      </div>

      <div id="calendar-print-root" className="hidden print:block">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body * {
              visibility: hidden !important;
            }
            #calendar-print-root,
            #calendar-print-root * {
              visibility: visible !important;
            }
            #calendar-print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 8mm 12mm;
              background: #ffffff;
              color: #0b1220;
            }
            #calendar-print-root .print-sheet {
              min-height: 279mm;
              overflow: hidden;
              page-break-after: always;
              break-after: page;
            }
            #calendar-print-root .print-sheet + .print-sheet {
              page-break-before: always;
              break-before: page;
            }
            #calendar-print-root .print-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          }
        `}</style>

        <section className="print-sheet">
          <h3 className="text-3xl font-bold text-black">Calendário</h3>
          <p className="mt-1 text-xs text-black/75">
            Snapshot da classificação em {new Date(nowMs).toLocaleString("pt-PT")}
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-black/50">
            <table className="w-full border-collapse text-left text-[10px] text-black">
              <thead className="bg-black/[0.06]">
                <tr>
                  <th className="border border-black/40 px-1.5 py-1">#</th>
                  <th className="border border-black/40 px-1.5 py-1">Nome</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">J</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">V</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">E</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">D</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">GM</th>
                  <th className="border border-black/40 px-1.5 py-1 text-center">GS</th>
                  <th className="border border-black/40 px-1.5 py-1 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {(leagueSetup?.phases.find((p) => p.id === leagueSetup.activePhaseId)?.standings.rows ?? []).map((row, idx) => (
                  <tr
                    key={`print-row-${row.teamId}`}
                    className={cn(
                      coachProfile.club.trim() && teamNamesLikelyMatch(coachProfile.club, row.team, 0.6)
                        ? "bg-emerald-100/60"
                        : ""
                    )}
                  >
                    <td className="border border-black/30 px-1.5 py-1">{idx + 1}</td>
                    <td className="border border-black/30 px-1.5 py-1">{row.team || "—"}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.played}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.won}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.drawn}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.lost}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.goalsFor}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-center">{row.goalsAgainst}</td>
                    <td className="border border-black/30 px-1.5 py-1 text-right font-semibold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-sheet">
          {(() => {
            const m = printableMonth;
            const cells = buildMonthGrid(m.getFullYear(), m.getMonth());
            return (
              <div className="break-inside-avoid">
                <p className="mb-3 text-xl font-semibold text-black">
                  {m.toLocaleString("pt-PT", { month: "long", year: "numeric" })}
                </p>
                <div className="grid grid-cols-7 gap-1.5 text-[10px]">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                    <p key={`print-${d}`} className="font-semibold uppercase tracking-wide text-black/80">
                      {d}
                    </p>
                  ))}
                  {cells.map((day, idx) => {
                    if (!day) return <div key={`print-empty-${idx}`} className="h-20 border border-transparent" />;
                    const dayKey = dayIsoLocal(day);
                    const events = entriesByDay.get(dayKey) ?? [];
                    return (
                      <div key={`print-${day.toISOString()}`} className="h-20 rounded-md border border-black/35 p-1.5">
                        <p className="text-[10px] font-semibold text-black">{day.getDate()}</p>
                        {events.slice(0, 3).map((ev, i) => (
                          <p key={`${dayKey}-${i}`} className="truncate text-[9px] text-black/85">
                            {ev.label}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-md border border-black/30 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-black/75">Tópicos do mês</p>
                  {printableMonthItems.length === 0 ? (
                    <p className="mt-1 text-[9px] text-black/70">Sem tópicos neste mês.</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {printableMonthItems.map((it, i) => (
                        <li key={`${printableMonthKey}-${it.date}-${i}`} className="text-[9px] text-black/85">
                          {new Date(`${it.date}T00:00:00`).getDate()} · {it.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
        </section>
      </div>

      <div className="print:hidden">

      <FixtureFormModal
        open={fixtureModalOpen}
        onClose={() => {
          setFixtureModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={(input) => {
          if (editing) updateFixture(editing.id, input);
          else addFixture(input);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Calendário mensal</CardTitle>
          <CardDescription>
            Eventos automáticos e manuais: jogos, aniversários recorrentes, notas e itens da Sketch Area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Calendário mensal</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFixtureModalOpen(true);
                }}
              >
                Adicionar Jogo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setNewEventDate(dayIsoLocal(selectedDay ?? new Date(nowMs)));
                  setEventModalOpen(true);
                }}
              >
                Novo Evento
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              >
                Mês anterior
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setViewMonth(new Date(nowMs))}>
                Hoje
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              >
                Próximo mês
              </Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-surface-border/70 bg-zinc-900/35 p-2">
            <span className="text-xs text-zinc-400">Imprimir</span>
            <Input type="month" value={printFromMonth} onChange={(e) => setPrintFromMonth(e.target.value)} className="h-9 max-w-[170px]" />
            <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            {viewMonth.toLocaleString("pt-PT", { month: "long", year: "numeric" })}
          </p>
          <div className="grid grid-cols-7 gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <p key={d} className="px-1 py-1 text-zinc-500 sm:px-2">
                {d}
              </p>
            ))}
            {monthCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-20 rounded-lg border border-transparent" />;
              const iso = dayIsoLocal(day);
              const items = entriesByDay.get(iso) ?? [];
              const isToday = isSameLocalDay(day, today);
              const isSelected = selectedDay ? isSameLocalDay(day, selectedDay) : false;
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-20 rounded-lg border p-1.5 text-left sm:p-2",
                    isToday
                      ? "border-accent/80 bg-accent/15 ring-2 ring-accent/60 ring-offset-2 ring-offset-zinc-950"
                      : "border-surface-border",
                    isSelected && "border-emerald-400/80 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-zinc-950"
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-medium tabular-nums sm:text-[11px]",
                      isToday ? "text-accent" : "text-zinc-400"
                    )}
                  >
                    {day.getDate()}
                    {isToday ? <span className="ml-1 text-[9px] font-normal text-accent/90">· hoje</span> : null}
                  </p>
                  {items.slice(0, 2).map((it, i) => (
                    <p
                      key={`${day.toISOString()}-${i}`}
                      className={cn(
                        "truncate text-[10px] sm:text-[11px]",
                        it.kind === "birthday" && "text-emerald-200",
                        it.kind === "fixture" && "text-zinc-200",
                        it.kind === "sketch_event" && "text-sky-200",
                        it.kind === "note" && "text-amber-200"
                      )}
                    >
                      {it.label}
                    </p>
                  ))}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-surface-border bg-zinc-900/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Tópicos do mês
            </p>
            {monthTopics.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">Sem tópicos neste mês.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {monthTopics.map((t, idx) => (
                  <li key={`${t.date}-${t.label}-${idx}`} className="text-xs text-zinc-200">
                    <span className="mr-2 text-zinc-500">{new Date(`${t.date}T00:00:00`).getDate()}</span>
                    {t.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedDay && (
            <div className="rounded-xl border border-surface-border bg-zinc-900/40 p-3">
              <p className="text-sm font-semibold text-white">
                Detalhe do dia {selectedDay.toLocaleDateString("pt-PT")}
              </p>
              {selectedDayEntries.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">Sem eventos para este dia.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {selectedDayEntries.map((e, idx) => (
                    <li key={`${e.id}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-zinc-200">
                      <span className="truncate">{e.label}</span>
                      {e.deletable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => handleDeleteCalendarEntry(e)}
                        >
                          Apagar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
            League table
          </CardTitle>
          <CardDescription>
            This table is now fully managed in-app (setup + manual edits + OCR result updates). With your club set in
            Profile, that row is highlighted and labelled in the table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!leagueSetup && (
            <div className="rounded-xl border border-surface-border bg-surface-raised/40 p-4">
              <p className="text-sm font-semibold text-white">Setup inicial da liga</p>
              <p className="mt-1 text-xs text-zinc-500">
                Define equipas e fases para criar automaticamente a tabela editável.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="setup-team-count">
                    Nº equipas
                  </label>
                  <Input
                    id="setup-team-count"
                    type="number"
                    min={2}
                    max={64}
                    value={setupTeamsDraft}
                    onChange={(e) => setSetupTeamsDraft(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500" htmlFor="setup-phase-count">
                    Nº fases
                  </label>
                  <Input
                    id="setup-phase-count"
                    type="number"
                    min={1}
                    max={3}
                    value={setupPhasesDraft}
                    onChange={(e) => setSetupPhasesDraft(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleCreateLeagueSetup} className="w-full">
                    Criar tabela
                  </Button>
                </div>
              </div>
            </div>
          )}

          {leagueSetup && (
            <div className="space-y-4 rounded-xl border border-surface-border bg-surface-raised/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">Fase ativa</p>
                  {leagueSetup.phases.map((phase) => (
                    <Button
                      key={phase.id}
                      type="button"
                      size="sm"
                      variant={leagueSetup.activePhaseId === phase.id ? "primary" : "secondary"}
                      onClick={() => setActiveLeaguePhase(phase.id)}
                    >
                      {phase.name}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => saveLeagueTableSnapshot()}>
                    Guardar tabela
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm(
                          "Apagar todo o conteúdo estatístico (J, V, E, D, GM, GS, pontos) em todas as fases, mantendo só os nomes das equipas?"
                        )
                      ) {
                        return;
                      }
                      clearLeagueStandingsStatsKeepNames();
                    }}
                  >
                    Apagar conteúdo
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-surface-border">
                <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
                  <colgroup>
                    <col className="w-8" />
                    <col />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                    <col className="w-[2.25rem] sm:w-10" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[11px]">
                      <th className="px-0.5 py-2 sm:px-1">#</th>
                      <th className="px-1 py-2">Nome</th>
                      <th className="px-0.5 py-2 text-center">J</th>
                      <th className="px-0.5 py-2 text-center">V</th>
                      <th className="px-0.5 py-2 text-center">E</th>
                      <th className="px-0.5 py-2 text-center">D</th>
                      <th className="px-0.5 py-2 text-center">GM</th>
                      <th className="px-0.5 py-2 text-center">GS</th>
                      <th className="px-0.5 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueSetup.phases
                      .find((p) => p.id === leagueSetup.activePhaseId)
                      ?.standings.rows.map((row, idx) => (
                        <tr
                          key={row.teamId}
                          className={cn(
                            "border-b border-surface-border/60 last:border-0",
                            coachProfile.club.trim() &&
                              teamNamesLikelyMatch(coachProfile.club, row.team, 0.6) &&
                              "bg-accent/10"
                          )}
                        >
                          <td className="px-0.5 py-1.5 text-center text-zinc-400 tabular-nums sm:px-1">{idx + 1}</td>
                          <td className="min-w-0 px-1 py-1.5">
                            <Input
                              value={row.team}
                              onChange={(e) => updateLeagueTeamName(row.teamId, e.target.value)}
                              placeholder="Equipa"
                              className={cn(cellInputClass, "text-left")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.played}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { played: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.won}
                              onChange={(e) => updateLeagueTeamStats(row.teamId, { won: Number(e.target.value || 0) })}
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.drawn}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { drawn: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.lost}
                              onChange={(e) => updateLeagueTeamStats(row.teamId, { lost: Number(e.target.value || 0) })}
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.goalsFor}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { goalsFor: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 sm:px-1">
                            <Input
                              type="number"
                              min={0}
                              value={row.goalsAgainst}
                              onChange={(e) =>
                                updateLeagueTeamStats(row.teamId, { goalsAgainst: Number(e.target.value || 0) })
                              }
                              className={cn(cellInputClass, "text-center")}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </td>
                          <td className="px-0.5 py-1.5 text-right text-[11px] font-semibold tabular-nums text-white sm:px-1 sm:text-xs">
                            {row.points}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <p className="text-sm font-semibold text-white">Resultados por print</p>
            <p className="mt-1 text-xs text-zinc-500">
              Fluxo: <strong>imagem → tabela (Casa/Resultado/Fora) → Para a Tabela</strong>. Confirma/edita as linhas e
              só depois enviamos para a League Table.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium text-zinc-500" htmlFor="results-image">
                Imagem (screenshot / foto)
              </label>
              <Input
                id="results-image"
                ref={resultsImageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1.5 cursor-pointer"
              />
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2 font-medium">Casa</th>
                    <th className="px-2 py-2 font-medium">Resultado</th>
                    <th className="px-2 py-2 font-medium">Fora</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsRowsDraft.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-zinc-500" colSpan={3}>
                        Carrega imagem e clica em <strong>Aplicar resultados</strong> para gerar a tabela.
                      </td>
                    </tr>
                  ) : (
                    resultsRowsDraft.map((row, idx) => (
                      <tr key={`ocr-row-${idx}`} className="border-b border-surface-border/60 last:border-0">
                        <td className="px-2 py-2">
                          <Input
                            value={row.homeTeam}
                            onChange={(e) =>
                              setResultsRowsDraft((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, homeTeam: e.target.value } : r))
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.result}
                            onChange={(e) =>
                              setResultsRowsDraft((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, result: e.target.value } : r))
                              )
                            }
                            placeholder="Ex.: 2-1"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.awayTeam}
                            onChange={(e) =>
                              setResultsRowsDraft((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, awayTeam: e.target.value } : r))
                              )
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {ocrError ? <p className="text-xs text-amber-300">{ocrError}</p> : <span />}
              <div className="flex gap-2">
                <Button type="button" onClick={() => void handleApplyResults()} disabled={ocrBusy}>
                  {ocrBusy ? "A processar..." : "Aplicar resultados"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendRowsToTable}
                  disabled={ocrBusy || resultsRowsDraft.length === 0}
                >
                  Para a Tabela
                </Button>
              </div>
            </div>
          </div>

          {eventModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-surface-border bg-zinc-950 p-4">
                <p className="text-base font-semibold text-white">Novo Evento</p>
                <p className="mt-1 text-xs text-zinc-500">Escolhe tópico, data e descrição.</p>
                <div className="mt-3 space-y-3">
                  <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Título" />
                  <label className="block text-xs text-zinc-500">
                    Tópico
                    <select
                      value={newEventTopic}
                      onChange={(e) => setNewEventTopic(e.target.value as SketchCalendarEventCategory)}
                      className="mt-1 h-10 w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 text-sm text-zinc-100"
                    >
                      <option value="training">Treino</option>
                      <option value="match">Jogo</option>
                      <option value="meeting">Reunião</option>
                      <option value="opponent_analysis">Análise adversário</option>
                      <option value="player_review">Revisão jogador</option>
                      <option value="task_deadline">Prazo</option>
                      <option value="other">Outro</option>
                    </select>
                  </label>
                  <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                  <textarea
                    value={newEventNotes}
                    onChange={(e) => setNewEventNotes(e.target.value)}
                    rows={3}
                    placeholder="Observações"
                    className="min-h-[84px] w-full resize-y rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEventModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleCreateCustomEvent} disabled={!newEventTitle.trim() || !newEventDate}>
                    Guardar evento
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4">
            <p className="text-sm font-semibold text-white">Jogos anteriores (Perfil)</p>
            <p className="mt-1 text-xs text-zinc-500">
              Só aparecem jogos em que o clube <strong>{coachProfile.club.trim() || "—"}</strong> participou, após
              aplicares resultados por OCR. Resultado a verde / cinzento / vermelho conforme vitória, empate ou
              derrota do teu clube.
            </p>
            {!coachProfile.club.trim() ? (
              <p className="mt-3 text-sm text-amber-200/90">Define o nome do clube no Perfil para ver esta lista.</p>
            ) : pastClubResults.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Ainda não há jogos guardados para este clube.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="px-2 py-2 font-medium">Casa</th>
                      <th className="px-2 py-2 font-medium">Fora</th>
                      <th className="px-2 py-2 font-medium">Resultado</th>
                      <th className="px-2 py-2 font-medium">Observações</th>
                      <th className="px-2 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastClubResults.map((row) => (
                      <tr key={row.id} className="border-b border-surface-border/60 last:border-0">
                        <td className="px-2 py-2 text-zinc-200">{row.homeSide}</td>
                        <td className="px-2 py-2 text-zinc-200">{row.awaySide}</td>
                        <td
                          className={cn(
                            "px-2 py-2 font-semibold tabular-nums",
                            row.outcome === "W" && "text-emerald-300",
                            row.outcome === "D" && "text-zinc-400",
                            row.outcome === "L" && "text-red-400/90"
                          )}
                        >
                          {row.homeGoals} — {row.awayGoals}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.notes}
                            onChange={(e) => updatePastClubResultNote(row.id, e.target.value)}
                            placeholder="Notas"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-2 text-[11px]"
                            onClick={() => removePastClubResult(row.id)}
                          >
                            Apagar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {leagueTableLastFetched && (
            <p className="text-xs text-zinc-600">
              Last updated: {new Date(leagueTableLastFetched).toLocaleString("en-GB")} · Updated from in-app table
              edits or result ingestion.
            </p>
          )}
          {!leagueSetup && (
            <p className="text-sm text-zinc-500">No table loaded yet. Run the setup above to create your league.</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
