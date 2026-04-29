"use client";

import { useMemo, useState } from "react";
import { BarChart3, Printer, Sparkles } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import {
  buildWeeklyReportData,
  lisbonRollingDaysEnding,
  renderWeeklyReportText,
  type WeeklyReportInput,
} from "@/lib/sketch-weekly-report";

export function SketchWeeklyReportPanel() {
  const { players, tacticMatches } = useAppData();
  const today = useMemo(() => calendarDayLisbon(Date.now()), []);
  const [anchorDay, setAnchorDay] = useState(today);
  const reportWindow = useMemo(() => lisbonRollingDaysEnding(anchorDay), [anchorDay]);

  const [reportText, setReportText] = useState("");

  const buildInput = (): WeeklyReportInput => ({
    periodStart: reportWindow.start,
    periodEnd: reportWindow.end,
    periodMonthLabel: reportWindow.label,
    players,
    tacticMatches,
  });

  const generateReport = () => {
    const input = buildInput();
    const data = buildWeeklyReportData(input);
    setReportText(renderWeeklyReportText(data, input));
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
          <h2 className="font-display text-xl font-semibold text-white">Relatório — últimos 30 dias</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Cinco secções com base só nos jogos registados em Táticas (data de cada jogo + tática associada). Janela: dia de
            referência e 29 dias anteriores (Lisboa).
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
            <span className="text-xs text-zinc-500">Dia de referência (fim da janela; por defeito é hoje, Lisboa)</span>
            <Input type="date" value={anchorDay} onChange={(e) => setAnchorDay(e.target.value)} />
          </label>
          <div className="flex items-end">
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-200">{reportWindow.label}</span>:{" "}
              <span className="text-zinc-200">{reportWindow.start}</span> a <span className="text-zinc-200">{reportWindow.end}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="button" onClick={generateReport}>
              <Sparkles className="h-4 w-4" />
              Gerar relatório
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint} disabled={!reportText.trim()}>
              <Printer className="h-4 w-4" />
              Imprimir
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
      </div>
    </div>
  );
}
