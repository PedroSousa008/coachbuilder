"use client";

import { useMemo, useState } from "react";
import { BarChart3, ClipboardList, Printer, Sparkles } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { getTrainingCatalogItems } from "@/lib/training-session-local";
import {
  buildAutoTrainingPlanText,
  buildWeeklyReportData,
  lisbonWeekRangeContaining,
  newSessionInputFromPlan,
  renderWeeklyReportText,
  type WeeklyReportInput,
} from "@/lib/sketch-weekly-report";
import { cn } from "@/lib/utils";

function sessionDayInWeek(sessionDate: string, start: string, end: string): boolean {
  let day: string;
  try {
    day = calendarDayLisbon(sessionDate);
  } catch {
    day = sessionDate.slice(0, 10);
  }
  return day.length >= 10 && day >= start && day <= end;
}

function addDaysYmdPublic(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const u = Date.UTC(y, m - 1, d + delta);
  return calendarDayLisbon(u);
}

export function SketchWeeklyReportPanel() {
  const { players, tacticMatches, trainingSessions, addTrainingSession } = useAppData();
  const today = useMemo(() => calendarDayLisbon(Date.now()), []);
  const [anchorDay, setAnchorDay] = useState(today);
  const week = useMemo(() => lisbonWeekRangeContaining(anchorDay), [anchorDay]);

  const [coachTrainingNotes, setCoachTrainingNotes] = useState("");
  const [coachGeneralNotes, setCoachGeneralNotes] = useState("");
  const [reportText, setReportText] = useState("");
  const [planText, setPlanText] = useState("");
  const [planMeta, setPlanMeta] = useState<ReturnType<typeof buildAutoTrainingPlanText> | null>(null);
  const [sessionDate, setSessionDate] = useState(() => addDaysYmdPublic(today, 1));

  const catalog = useMemo(() => getTrainingCatalogItems(players), [players]);

  const trainingInWeek = useMemo(
    () => trainingSessions.filter((s) => sessionDayInWeek(s.date, week.start, week.end)),
    [trainingSessions, week.start, week.end]
  );

  const recentSessions = useMemo(
    () => [...trainingSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
    [trainingSessions]
  );

  const generateReport = () => {
    const input: WeeklyReportInput = {
      weekStart: week.start,
      weekEnd: week.end,
      players,
      tacticMatches,
      trainingSessionsInWeek: trainingInWeek,
      coachTrainingNotes,
      coachGeneralNotes,
    };
    const data = buildWeeklyReportData(input);
    setReportText(renderWeeklyReportText(data, input));
    setPlanText("");
    setPlanMeta(null);
  };

  const generatePlan = () => {
    const input: WeeklyReportInput = {
      weekStart: week.start,
      weekEnd: week.end,
      players,
      tacticMatches,
      trainingSessionsInWeek: trainingInWeek,
      coachTrainingNotes,
      coachGeneralNotes,
    };
    const data = buildWeeklyReportData(input);
    setReportText(renderWeeklyReportText(data, input));
    const plan = buildAutoTrainingPlanText(data, catalog, recentSessions, tacticMatches);
    setPlanMeta(plan);
    setPlanText(plan.text);
  };

  const addPlanToTraining = () => {
    let meta = planMeta;
    if (!meta) {
      const input: WeeklyReportInput = {
        weekStart: week.start,
        weekEnd: week.end,
        players,
        tacticMatches,
        trainingSessionsInWeek: trainingInWeek,
        coachTrainingNotes,
        coachGeneralNotes,
      };
      const data = buildWeeklyReportData(input);
      meta = buildAutoTrainingPlanText(data, catalog, recentSessions, tacticMatches);
      setPlanMeta(meta);
      setPlanText(meta.text);
      setReportText(renderWeeklyReportText(data, input));
    }
    addTrainingSession(newSessionInputFromPlan(meta, sessionDate));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:space-y-3">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sketch-weekly-report-print, #sketch-weekly-report-print * { visibility: visible; }
          #sketch-weekly-report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; background: white; color: #111; }
          #sketch-weekly-report-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Relatório semanal</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Relatório baseado em jogos registados nas táticas (prioridade) e, em complemento, treinos da semana na app e notas tuas.
            Não são inventados dados fora do que está guardado.
          </p>
        </div>
      </div>

      <Card className="no-print border-surface-border bg-surface-raised/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <BarChart3 className="h-4 w-4 text-accent" />
            Parâmetros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Dia de referência (semana segunda–domingo, Lisboa)</span>
            <Input type="date" value={anchorDay} onChange={(e) => setAnchorDay(e.target.value)} />
          </label>
          <div className="flex items-end">
            <p className="text-sm text-zinc-400">
              Período: <span className="text-zinc-200">{week.start}</span> a <span className="text-zinc-200">{week.end}</span>
            </p>
          </div>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-zinc-500">Notas sobre treinos desta semana (opcional — complemento)</span>
            <textarea
              className={cn(
                "min-h-[88px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100",
                "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              )}
              value={coachTrainingNotes}
              onChange={(e) => setCoachTrainingNotes(e.target.value)}
              placeholder="Ex.: Terça — trabalho de finalização com poucos finalizadores; Quinta — rondos com pressão alta…"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-zinc-500">Notas gerais do treinador (aparecem no final do relatório)</span>
            <textarea
              className={cn(
                "min-h-[72px] w-full rounded-xl border border-surface-border bg-surface-raised/90 px-3 py-2 text-sm text-zinc-100",
                "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
              )}
              value={coachGeneralNotes}
              onChange={(e) => setCoachGeneralNotes(e.target.value)}
              placeholder="Contexto extra, objetivos da próxima semana, ausências relevantes…"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="button" onClick={generateReport}>
              <Sparkles className="h-4 w-4" />
              Gerar relatório
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint} disabled={!reportText.trim()}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button type="button" variant="secondary" onClick={generatePlan}>
              Plano de treino gerado automaticamente
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="sketch-weekly-report-print" className="rounded-2xl border border-surface-border bg-[#0c1116] p-4 text-zinc-200 print:border-0 print:bg-white print:text-black">
        {reportText.trim() ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{reportText}</pre>
        ) : (
          <p className="text-sm text-zinc-500 print:text-zinc-700">
            Gera o relatório para ver o conteúdo aqui e para impressão.
          </p>
        )}

        {planText.trim() ? (
          <div className="mt-8 border-t border-surface-border pt-6 print:mt-6 print:border-zinc-300">
            <h3 className="mb-2 font-display text-lg font-semibold text-white print:text-black">Plano de treino gerado automaticamente</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300 print:text-zinc-800">{planText}</pre>
            <div className="no-print mt-4 flex flex-wrap items-end gap-3 border-t border-surface-border pt-4">
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Data da sessão a criar</span>
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </label>
              <Button type="button" onClick={addPlanToTraining}>
                <ClipboardList className="h-4 w-4" />
                Adicionar ao plano de treinos
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
