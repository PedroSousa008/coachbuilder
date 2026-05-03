"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TeamCallupCalendarForm } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Printer } from "lucide-react";

const MAX_CALLUP = 18;
const MAX_LOGO_BYTES = 450_000;

type PrintRow = { number: string; name: string; obs: string };

export function TeamCallupPanel() {
  const { players, coachProfile, teamCallup, setTeamCallup } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";

  const teamDisplayName = useMemo(() => {
    const c = coachProfile.club.trim();
    const n = coachProfile.name.trim();
    if (c) return c;
    if (n) return n;
    return isPt ? "Equipa" : "Team";
  }, [coachProfile.club, coachProfile.name, isPt]);

  const setForm = useCallback(
    (patch: Partial<TeamCallupCalendarForm>) => {
      setTeamCallup((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));
    },
    [setTeamCallup]
  );

  /** Remove ids de jogadores que já não existem no plantel (liberta vagas nas 18 convocatórias). */
  useEffect(() => {
    const idSet = new Set(players.map((p) => p.id));
    const nextIds = teamCallup.selectedPlayerIds.filter((id) => idSet.has(id));
    if (nextIds.length === teamCallup.selectedPlayerIds.length) return;
    setTeamCallup((prev) => {
      const idOk = new Set(players.map((p) => p.id));
      const nextObs = { ...prev.observationsByPlayerId };
      for (const id of prev.selectedPlayerIds) {
        if (!idOk.has(id)) delete nextObs[id];
      }
      return { ...prev, selectedPlayerIds: nextIds, observationsByPlayerId: nextObs };
    });
  }, [players, teamCallup.selectedPlayerIds, setTeamCallup]);

  const onLogoFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        if (dataUrl.length > MAX_LOGO_BYTES) {
          alert(isPt ? "Imagem demasiado grande (máx. ~450 KB)." : "Image too large (max ~450 KB).");
          return;
        }
        setTeamCallup((prev) => ({ ...prev, clubLogoDataUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    },
    [isPt, setTeamCallup]
  );

  const togglePlayer = useCallback(
    (id: string) => {
      const idSet = new Set(players.map((p) => p.id));
      setTeamCallup((prev) => {
        const sel = prev.selectedPlayerIds.filter((x) => idSet.has(x));
        if (sel.includes(id)) {
          const nextObs = { ...prev.observationsByPlayerId };
          delete nextObs[id];
          return { ...prev, selectedPlayerIds: sel.filter((x) => x !== id), observationsByPlayerId: nextObs };
        }
        if (sel.length >= MAX_CALLUP) return prev;
        return { ...prev, selectedPlayerIds: [...sel, id] };
      });
    },
    [players, setTeamCallup]
  );

  const sortedSelected = useMemo(() => {
    const set = new Set(teamCallup.selectedPlayerIds);
    return players.filter((p) => set.has(p.id)).sort((a, b) => a.number - b.number);
  }, [players, teamCallup.selectedPlayerIds]);

  const printRows: PrintRow[] = useMemo(() => {
    const rows: PrintRow[] = sortedSelected.map((p) => ({
      number: String(p.number),
      name: p.name,
      obs: teamCallup.observationsByPlayerId[p.id] ?? "",
    }));
    while (rows.length < MAX_CALLUP) {
      rows.push({ number: "", name: "", obs: "" });
    }
    return rows.slice(0, MAX_CALLUP);
  }, [sortedSelected, teamCallup.observationsByPlayerId]);

  const sortedAllForPicker = useMemo(() => [...players].sort((a, b) => a.number - b.number), [players]);

  const validSelectedCount = useMemo(() => {
    const idSet = new Set(players.map((p) => p.id));
    return teamCallup.selectedPlayerIds.filter((id) => idSet.has(id)).length;
  }, [players, teamCallup.selectedPlayerIds]);

  const printCallup = () => {
    window.print();
  };

  const f = teamCallup.form;

  return (
    <div className="space-y-8">
      <div className="print:hidden space-y-8">
        <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-4 sm:p-6">
          <h3 className="font-display text-lg font-semibold text-white">Calendário</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {isPt
              ? "Preenche os dados do jogo e da logística. O nome da equipa vem do teu perfil (clube ou nome)."
              : "Fill match and logistics details. Team name comes from your profile (club or name)."}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">{isPt ? "Equipa (automático)" : "Team (automatic)"}</span>
              <Input readOnly value={teamDisplayName} className="bg-surface-raised/80 text-zinc-300" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">{isPt ? "Logótipo da equipa" : "Team logo"}</span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent"
                  onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
                />
                {teamCallup.clubLogoDataUrl ? (
                  <Button type="button" variant="secondary" className="text-xs" onClick={() => setTeamCallup((p) => ({ ...p, clubLogoDataUrl: undefined }))}>
                    {isPt ? "Remover logótipo" : "Remove logo"}
                  </Button>
                ) : null}
              </div>
              {teamCallup.clubLogoDataUrl ? (
                <img src={teamCallup.clubLogoDataUrl} alt="" className="mt-2 h-16 w-auto max-w-[120px] rounded-lg border border-surface-border object-contain" />
              ) : null}
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-400">Jogo</span>
              <Input value={f.jogo} onChange={(e) => setForm({ jogo: e.target.value })} placeholder={isPt ? "ex.: vs Sporting CP" : "e.g. vs …"} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Jornada</span>
              <Input value={f.jornada} onChange={(e) => setForm({ jornada: e.target.value })} placeholder="—" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">Data</span>
              <Input value={f.data} onChange={(e) => setForm({ data: e.target.value })} placeholder={isPt ? "ex.: 26/04/2026" : "e.g. 2026-04-26"} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-400">{isPt ? "Hora de Jogo" : "Kick-off time"}</span>
              <Input
                value={f.horaJogo}
                onChange={(e) => setForm({ horaJogo: e.target.value })}
                placeholder={isPt ? "ex.: 15:00" : "e.g. 3:00 PM"}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-400">Ponto de Encontro</span>
              <Input value={f.pontoEncontro} onChange={(e) => setForm({ pontoEncontro: e.target.value })} />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-400">Maps</span>
              <Input value={f.maps} onChange={(e) => setForm({ maps: e.target.value })} placeholder="https://…" />
            </label>
            <div className="space-y-4 sm:col-span-2">
              <label className="block space-y-1">
                <span className="text-xs text-zinc-400">Hora de Encontro</span>
                <Input value={f.horaEncontro} onChange={(e) => setForm({ horaEncontro: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-400">Chegada ao Jogo</span>
                <Input value={f.chegadaJogo} onChange={(e) => setForm({ chegadaJogo: e.target.value })} />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">{isPt ? "Jogadores convocados" : "Squad call-up"}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {isPt ? `Até ${MAX_CALLUP} jogadores. Na impressão ficam ordenados por número.` : `Up to ${MAX_CALLUP} players. Print order is by shirt number.`}
              </p>
            </div>
            <p className="text-sm font-medium text-accent">
              {validSelectedCount}/{MAX_CALLUP}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-raised/50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">{isPt ? "Incluir" : "Include"}</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{isPt ? "Nome" : "Name"}</th>
                  <th className="px-3 py-2">{isPt ? "Observações" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {sortedAllForPicker.map((p) => {
                  const checked = teamCallup.selectedPlayerIds.includes(p.id);
                  const disabled = !checked && validSelectedCount >= MAX_CALLUP;
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-surface-border/60 last:border-0 hover:bg-white/[0.04]"
                      onClick={() => {
                        if (disabled && !checked) return;
                        togglePlayer(p.id);
                      }}
                    >
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePlayer(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-surface-border"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{p.number}</td>
                      <td className="px-3 py-2 text-white">{p.name}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        {checked ? (
                          <Input
                            value={teamCallup.observationsByPlayerId[p.id] ?? ""}
                            onChange={(e) =>
                              setTeamCallup((prev) => ({
                                ...prev,
                                observationsByPlayerId: { ...prev.observationsByPlayerId, [p.id]: e.target.value },
                              }))
                            }
                            placeholder="—"
                            className="h-9 text-xs"
                          />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={printCallup}>
            <Printer className="mr-2 h-4 w-4" />
            {isPt ? "Imprimir convocatória" : "Print call-up sheet"}
          </Button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
  @page { size: A4 portrait; margin: 5mm; }
}`,
        }}
      />

      {/* Impressão: uma página A4, texto preto */}
      <div className="hidden print:block print:bg-white print:text-black print:[color-scheme:light]">
        <div className="mx-auto max-w-[200mm] print:px-0 print:py-0">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-black pb-2 print:mb-2 print:pb-2">
            <div className="flex min-w-0 items-start gap-3 print:gap-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-black bg-white print:h-14 print:w-14">
                {teamCallup.clubLogoDataUrl ? (
                  <img src={teamCallup.clubLogoDataUrl} alt="" className="max-h-[72px] max-w-[72px] object-contain print:max-h-[48px] print:max-w-[48px]" />
                ) : (
                  <span className="px-1 text-center text-[9px] text-neutral-500 print:text-[7px]">{isPt ? "Logótipo" : "Logo"}</span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wide print:text-base print:leading-tight">{teamDisplayName}</h1>
                <p className="mt-0.5 text-xs font-semibold print:text-[10px]">{isPt ? "Convocatória" : "Match call-up"}</p>
              </div>
            </div>
          </header>

          <section className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs print:mb-2 print:gap-x-3 print:gap-y-0.5 print:text-[10px] print:leading-snug">
            <div className="min-w-0">
              <span className="font-semibold">Jogo:</span> <span className="whitespace-pre-wrap">{f.jogo || "—"}</span>
            </div>
            <div>
              <span className="font-semibold">Jornada:</span> {f.jornada || "—"}
            </div>
            <div>
              <span className="font-semibold">Data:</span> {f.data || "—"}
            </div>
            <div>
              <span className="font-semibold">{isPt ? "Hora de Jogo:" : "Kick-off:"}</span> {f.horaJogo || "—"}
            </div>
            <div className="flex min-w-0 flex-col gap-y-0.5 print:gap-y-0">
              <div>
                <span className="font-semibold">Hora de Encontro:</span> {f.horaEncontro || "—"}
              </div>
              <div>
                <span className="font-semibold">Chegada ao Jogo:</span> {f.chegadaJogo || "—"}
              </div>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Ponto de Encontro:</span>{" "}
              <span className="whitespace-pre-wrap">{f.pontoEncontro || "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Maps:</span> <span className="break-all">{f.maps || "—"}</span>
            </div>
          </section>

          <table className="w-full table-fixed border-collapse border border-black text-[11px] print:text-[9px] print:leading-tight">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[28%]" />
              <col className="w-[32%]" />
              <col className="w-[33%]" />
            </colgroup>
            <thead>
              <tr className="bg-neutral-100">
                <th className="border border-black px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">#</th>
                <th className="border border-black px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">{isPt ? "Nome" : "Name"}</th>
                <th className="border border-black px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">{isPt ? "Assinatura" : "Signature"}</th>
                <th className="border border-black px-1 py-1 text-left font-semibold print:px-1 print:py-0.5">{isPt ? "Observações" : "Notes"}</th>
              </tr>
            </thead>
            <tbody>
              {printRows.map((row, i) => (
                <tr key={i}>
                  <td className="h-[7mm] border border-black px-1 py-0 align-top font-mono print:h-[6.5mm] print:px-1 print:py-0">
                    {row.number}
                  </td>
                  <td className="h-[7mm] border border-black px-1 py-0 align-top print:h-[6.5mm] print:px-1 print:py-0">{row.name}</td>
                  <td className="h-[7mm] border border-black px-1 py-0 align-top print:h-[6.5mm] print:px-1 print:py-0" />
                  <td className="h-[7mm] border border-black px-1 py-0 align-top text-[10px] whitespace-pre-wrap print:h-[6.5mm] print:px-1 print:py-0 print:text-[8px]">
                    {row.obs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
