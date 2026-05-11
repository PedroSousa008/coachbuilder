"use client";

import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import type {
  Player,
  Position,
  PreferredFoot,
  SketchCalendarEvent,
  SketchWatchlistEntry,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PlayerPickerModal } from "@/components/players/PlayerPickerModal";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { clampPlayerAge, computeAgeFromDateOfBirth } from "@/lib/player-age";
import { formatPlayerPositions, primaryPositionFromList } from "@/lib/player-positions";
import {
  PHOTO_FRAME_DEFAULT,
  normalizePlayerPhotoFrame,
  photoFrameImgStyle,
} from "@/lib/player-photo-frame";
import { topSketchQualitiesForPositions } from "@/lib/sketch-external-player-qualities";
import { cn } from "@/lib/utils";
import { imageFileToCompressedJpegDataUrl } from "@/lib/profile-avatar-compress";

const SQUAD_POSITIONS: Position[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

const POSITION_LABEL_PT: Record<Position, string> = {
  GK: "GR",
  CB: "DC",
  LB: "LE",
  RB: "LD",
  CDM: "MCD",
  CM: "MC",
  CAM: "MO",
  LW: "EE",
  RW: "ED",
  ST: "PL",
};

function sketchUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayDay(): string {
  return calendarDayLisbon(Date.now());
}

function playerInitials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase();
}

function nextFreeShirtNumber(players: Player[]): number {
  const used = new Set(players.map((x) => x.number));
  for (let n = 1; n <= 99; n++) {
    if (!used.has(n)) return n;
  }
  return 1;
}

function formatExternalPositions(positions: Position[] | undefined, legacy?: string): string {
  if (positions?.length) return positions.join(", ");
  return (legacy ?? "").trim();
}

type ExternalFormState = {
  name: string;
  club: string;
  positions: Position[];
  dateOfBirth: string;
  heightCm: string;
  weightKg: string;
  preferredFoot: "" | PreferredFoot;
  marketValue: string;
  nationality: string;
  photoUrl: string;
  photoFrame: typeof PHOTO_FRAME_DEFAULT;
  highlightQualities: string[];
  extraQualityInput: string;
  extraHighlightQualities: string[];
  latestNote: string;
  nextAction: string;
  reminderText: string;
  reminderDate: string;
  clipLinksText: string;
  attendanceNote: string;
  tags: string;
};

const emptyExternalForm = (): ExternalFormState => ({
  name: "",
  club: "",
  positions: ["CM"],
  dateOfBirth: "",
  heightCm: "",
  weightKg: "",
  preferredFoot: "",
  marketValue: "",
  nationality: "",
  photoUrl: "",
  photoFrame: { ...PHOTO_FRAME_DEFAULT },
  highlightQualities: [],
  extraQualityInput: "",
  extraHighlightQualities: [],
  latestNote: "",
  nextAction: "",
  reminderText: "",
  reminderDate: "",
  clipLinksText: "",
  attendanceNote: "",
  tags: "",
});

export function SketchWatchlistPanel() {
  const { players, sketchArea, setSketchArea, addPlayer } = useAppData();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [extForm, setExtForm] = useState<ExternalFormState>(() => emptyExternalForm());
  const [extraQualityDraftByWatchId, setExtraQualityDraftByWatchId] = useState<Record<string, string>>({});

  const addWatch = useCallback(
    (player: Player) => {
      if (sketchArea.watchlist.some((w) => w.playerId === player.id)) return;
      const now = new Date().toISOString();
      const row: SketchWatchlistEntry = {
        id: sketchUid("watch"),
        playerId: player.id,
        focusTags: [],
        latestNote: "",
        nextAction: "",
        clipLinks: [],
        createdAt: now,
        updatedAt: now,
      };
      setSketchArea((s) => ({ ...s, watchlist: [row, ...s.watchlist] }));
    },
    [setSketchArea, sketchArea.watchlist]
  );

  const addExternalWatch = useCallback(() => {
    const name = extForm.name.trim();
    if (!name) return;
    const nameKey = name.toLowerCase();
    const duplicate = sketchArea.watchlist.some(
      (w) => !w.playerId && (w.externalPlayerName ?? "").trim().toLowerCase() === nameKey
    );
    if (duplicate) return;
    const now = new Date().toISOString();
    const posList = extForm.positions.length ? extForm.positions : (["CM"] as Position[]);
    const h = extForm.heightCm.trim() ? Math.min(220, Math.max(120, parseInt(extForm.heightCm, 10) || 0)) : undefined;
    const wKg = extForm.weightKg.trim() ? Math.min(150, Math.max(35, parseInt(extForm.weightKg, 10) || 0)) : undefined;
    const frameNorm = normalizePlayerPhotoFrame(extForm.photoFrame);
    const photoFrameIsDefault =
      frameNorm.posX === PHOTO_FRAME_DEFAULT.posX &&
      frameNorm.posY === PHOTO_FRAME_DEFAULT.posY &&
      frameNorm.zoom === PHOTO_FRAME_DEFAULT.zoom;

    const row: SketchWatchlistEntry = {
      id: sketchUid("watch"),
      externalPlayerName: name,
      externalClub: extForm.club.trim() || undefined,
      externalPositions: posList,
      dateOfBirth: extForm.dateOfBirth.trim() || undefined,
      heightCm: h,
      weightKg: wKg,
      preferredFoot: extForm.preferredFoot || undefined,
      marketValueNote: extForm.marketValue.trim() || undefined,
      nationality: extForm.nationality.trim() || undefined,
      externalPhotoUrl: extForm.photoUrl.trim() || undefined,
      externalPhotoFrame:
        extForm.photoUrl.trim() && !photoFrameIsDefault ? frameNorm : undefined,
      highlightQualities: extForm.highlightQualities.length ? [...extForm.highlightQualities] : undefined,
      extraHighlightQualities: extForm.extraHighlightQualities.length
        ? [...extForm.extraHighlightQualities]
        : undefined,
      focusTags: extForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      latestNote: extForm.latestNote,
      nextAction: extForm.nextAction,
      reminderText: extForm.reminderText.trim() || undefined,
      reminderDate: extForm.reminderDate.trim() || undefined,
      clipLinks: extForm.clipLinksText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      attendanceNote: extForm.attendanceNote.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setSketchArea((s) => ({ ...s, watchlist: [row, ...s.watchlist] }));
    setExtForm(emptyExternalForm());
  }, [extForm, setSketchArea, sketchArea.watchlist]);

  const promoteExternal = useCallback(
    (w: SketchWatchlistEntry) => {
      const name = (w.externalPlayerName ?? "").trim();
      if (!name || w.playerId) return;
      const positions = w.externalPositions?.length ? w.externalPositions : (["CM"] as Position[]);
      const primary = primaryPositionFromList(positions);
      const age = w.dateOfBirth
        ? clampPlayerAge(computeAgeFromDateOfBirth(w.dateOfBirth) ?? 17)
        : 17;
      const highlights = [...new Set([...(w.highlightQualities ?? []), ...(w.extraHighlightQualities ?? [])])].filter(
        Boolean
      );
      const p = addPlayer({
        name,
        number: nextFreeShirtNumber(players),
        position: primary,
        positions: positions.length > 1 ? positions : undefined,
        age,
        heightCm: w.heightCm,
        weightKg: w.weightKg,
        preferredFoot: w.preferredFoot,
        availability: "available",
        performance: "steady",
        dateOfBirth: w.dateOfBirth,
        photoUrl: w.externalPhotoUrl?.trim() || undefined,
        photoFrame: w.externalPhotoFrame,
        nationality: w.nationality?.trim() || undefined,
        marketValueNote: w.marketValueNote?.trim() || undefined,
        scoutedFromClub: w.externalClub?.trim() || undefined,
        scoutingHighlights: highlights.length ? highlights : undefined,
      });
      const now = new Date().toISOString();
      setSketchArea((s) => ({
        ...s,
        watchlist: s.watchlist.map((x) =>
          x.id === w.id ? { ...x, playerId: p.id, updatedAt: now } : x
        ),
      }));
    },
    [addPlayer, players, setSketchArea]
  );

  const syncReminderToCalendar = useCallback(
    (w: SketchWatchlistEntry) => {
      const playerLabel = w.externalPlayerName ?? "observação";
      const title = (w.reminderText ?? "").trim() || `Lembrete: ${playerLabel}`;
      const day = (w.reminderDate ?? "").trim() || todayDay();
      const now = new Date().toISOString();
      setSketchArea((s) => {
        const cal = [...s.calendarEvents];
        const existingIdx = w.reminderCalendarEventId
          ? cal.findIndex((e) => e.id === w.reminderCalendarEventId)
          : -1;
        let eventId = w.reminderCalendarEventId;

        if (existingIdx >= 0) {
          const prev = cal[existingIdx]!;
          cal[existingIdx] = {
            ...prev,
            title,
            date: day,
            notes: [w.nextAction?.trim(), w.latestNote?.trim()].filter(Boolean).join("\n\n") || prev.notes,
            updatedAt: now,
          };
        } else {
          const ev: SketchCalendarEvent = {
            id: sketchUid("skcal"),
            title,
            category: "other",
            date: day,
            notes: [w.nextAction?.trim(), w.latestNote?.trim()].filter(Boolean).join("\n\n") || undefined,
            createdAt: now,
            updatedAt: now,
          };
          cal.unshift(ev);
          eventId = ev.id;
        }

        return {
          ...s,
          calendarEvents: cal,
          watchlist: s.watchlist.map((x) =>
            x.id === w.id ? { ...x, reminderCalendarEventId: eventId, updatedAt: now } : x
          ),
        };
      });
    },
    [setSketchArea]
  );

  const onExternalPhotoFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      const s = await imageFileToCompressedJpegDataUrl(file, {
        maxOutputBytes: 340_000,
        initialMaxSide: 480,
      });
      if (s) {
        setExtForm((f) => ({ ...f, photoUrl: s, photoFrame: { ...PHOTO_FRAME_DEFAULT } }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const formQualityOptions = useMemo(
    () => topSketchQualitiesForPositions(extForm.positions.length ? extForm.positions : ["CM"]),
    [extForm.positions]
  );

  const toggleFormPos = (p: Position) => {
    setExtForm((f) => {
      const has = f.positions.includes(p);
      let next = has ? f.positions.filter((x) => x !== p) : [...f.positions, p];
      if (!next.length) next = ["CM"];
      const allowed = new Set(topSketchQualitiesForPositions(next));
      const highlightQualities = f.highlightQualities.filter((q) => allowed.has(q));
      return { ...f, positions: next, highlightQualities };
    });
  };

  const toggleFormHighlight = (label: string) => {
    setExtForm((f) => ({
      ...f,
      highlightQualities: f.highlightQualities.includes(label)
        ? f.highlightQualities.filter((x) => x !== label)
        : [...f.highlightQualities, label],
    }));
  };

  const addFormExtraQuality = () => {
    const q = extForm.extraQualityInput.trim();
    if (!q) return;
    setExtForm((f) =>
      f.extraHighlightQualities.includes(q)
        ? { ...f, extraQualityInput: "" }
        : { ...f, extraHighlightQualities: [...f.extraHighlightQualities, q], extraQualityInput: "" }
    );
  };

  return (
    <div className="no-print space-y-4">
      <div className="grid gap-4 rounded-2xl border border-surface-border bg-surface-raised/20 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-200">Adicionar da tua equipa</p>
          <Button
            type="button"
            onClick={() => {
              setPickerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar jogador da equipa
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-200">Jogador externo — ficha completa</p>
          <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                {extForm.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL
                  <img src={extForm.photoUrl} alt="" className="h-full w-full" style={photoFrameImgStyle(extForm.photoFrame)} />
                ) : (
                  <span className="text-sm font-bold text-zinc-500">{playerInitials(extForm.name || "?")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={extForm.name}
                  onChange={(e) => setExtForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome *"
                />
                <Input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:text-zinc-300"
                  onChange={onExternalPhotoFile}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[11px] text-zinc-500">
                    Data nascimento
                    <Input
                      type="date"
                      className="mt-1"
                      value={extForm.dateOfBirth}
                      onChange={(e) => setExtForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    />
                  </label>
                  <p className="flex items-end text-sm text-zinc-400">
                    {extForm.dateOfBirth
                      ? `Idade: ${computeAgeFromDateOfBirth(extForm.dateOfBirth) ?? "—"}`
                      : "Idade: —"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={extForm.club}
                onChange={(e) => setExtForm((f) => ({ ...f, club: e.target.value }))}
                placeholder="Clube"
              />
              <Input
                value={extForm.nationality}
                onChange={(e) => setExtForm((f) => ({ ...f, nationality: e.target.value }))}
                placeholder="Nacionalidade"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={extForm.marketValue}
                onChange={(e) => setExtForm((f) => ({ ...f, marketValue: e.target.value }))}
                placeholder="Valor de mercado (texto livre)"
              />
              <select
                value={extForm.preferredFoot}
                onChange={(e) => setExtForm((f) => ({ ...f, preferredFoot: e.target.value as PreferredFoot | "" }))}
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
              >
                <option value="">Pé preferido —</option>
                <option value="right">Direito</option>
                <option value="left">Esquerdo</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="number"
                min={120}
                max={220}
                placeholder="Altura (cm)"
                value={extForm.heightCm}
                onChange={(e) => setExtForm((f) => ({ ...f, heightCm: e.target.value }))}
              />
              <Input
                type="number"
                min={35}
                max={150}
                placeholder="Peso (kg)"
                value={extForm.weightKg}
                onChange={(e) => setExtForm((f) => ({ ...f, weightKg: e.target.value }))}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Posições</p>
              <div className="flex flex-wrap gap-1.5">
                {SQUAD_POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleFormPos(p)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                      extForm.positions.includes(p)
                        ? "border-accent/50 bg-accent/15 text-white"
                        : "border-surface-border bg-black/20 text-zinc-400 hover:border-zinc-600"
                    )}
                    title={p}
                  >
                    {POSITION_LABEL_PT[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Melhores qualidades (top 10 para a posição principal)
              </p>
              <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border border-surface-border/60 bg-black/15 p-2 sm:grid-cols-2">
                {formQualityOptions.map((label) => (
                  <label key={label} className="flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={extForm.highlightQualities.includes(label)}
                      onChange={() => toggleFormHighlight(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={extForm.extraQualityInput}
                  onChange={(e) => setExtForm((f) => ({ ...f, extraQualityInput: e.target.value }))}
                  placeholder="Outra qualidade…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFormExtraQuality();
                    }
                  }}
                />
                <Button type="button" variant="secondary" className="shrink-0" onClick={addFormExtraQuality}>
                  +
                </Button>
              </div>
              {extForm.extraHighlightQualities.length ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  Extra: {extForm.extraHighlightQualities.join(" · ")}
                </p>
              ) : null}
            </div>
            <label className="block text-xs text-zinc-500">Tags de foco (vírgula)</label>
            <Input
              value={extForm.tags}
              onChange={(e) => setExtForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Ex.: finalização, pressing"
            />
            <label className="block text-xs text-zinc-500">Última nota</label>
            <textarea
              className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
              value={extForm.latestNote}
              onChange={(e) => setExtForm((f) => ({ ...f, latestNote: e.target.value }))}
            />
            <label className="block text-xs text-zinc-500">Próxima ação</label>
            <Input
              value={extForm.nextAction}
              onChange={(e) => setExtForm((f) => ({ ...f, nextAction: e.target.value }))}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-zinc-500">
                Lembrete (texto)
                <Input
                  className="mt-1"
                  value={extForm.reminderText}
                  onChange={(e) => setExtForm((f) => ({ ...f, reminderText: e.target.value }))}
                  placeholder="Ex.: ligar ao empresário"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Data do lembrete (calendário)
                <Input
                  className="mt-1"
                  type="date"
                  value={extForm.reminderDate}
                  onChange={(e) => setExtForm((f) => ({ ...f, reminderDate: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-xs text-zinc-500">Nota de presença</label>
            <Input
              value={extForm.attendanceNote}
              onChange={(e) => setExtForm((f) => ({ ...f, attendanceNote: e.target.value }))}
            />
            <label className="block text-xs text-zinc-500">Links (um por linha)</label>
            <textarea
              className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
              value={extForm.clipLinksText}
              onChange={(e) => setExtForm((f) => ({ ...f, clipLinksText: e.target.value }))}
            />
            <Button type="button" variant="secondary" onClick={addExternalWatch}>
              Adicionar jogador externo
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sketchArea.watchlist.map((w) => {
          const pl = players.find((p) => p.id === w.playerId);
          const displayName = pl?.name ?? w.externalPlayerName ?? "Jogador";
          const positionsList = w.externalPositions?.length ? w.externalPositions : undefined;
          const qualityOptions = topSketchQualitiesForPositions(positionsList ?? ["CM"]);
          const linkedEvt = w.reminderCalendarEventId
            ? sketchArea.calendarEvents.find((e) => e.id === w.reminderCalendarEventId)
            : undefined;

          const patchRow = (patch: Partial<SketchWatchlistEntry>) => {
            const now = new Date().toISOString();
            setSketchArea((s) => ({
              ...s,
              watchlist: s.watchlist.map((x) => (x.id === w.id ? { ...x, ...patch, updatedAt: now } : x)),
            }));
          };

          const toggleRowPos = (p: Position) => {
            const cur = w.externalPositions?.length ? [...w.externalPositions] : (["CM"] as Position[]);
            const has = cur.includes(p);
            let next = has ? cur.filter((x) => x !== p) : [...cur, p];
            if (!next.length) next = ["CM"];
            const allowed = new Set(topSketchQualitiesForPositions(next));
            const highlightQualities = (w.highlightQualities ?? []).filter((q) => allowed.has(q));
            patchRow({ externalPositions: next, highlightQualities });
          };

          const toggleRowHighlight = (label: string) => {
            const cur = w.highlightQualities ?? [];
            const next = cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label];
            patchRow({ highlightQualities: next });
          };

          const addRowExtraQuality = (raw: string) => {
            const q = raw.trim();
            if (!q) return;
            const cur = w.extraHighlightQualities ?? [];
            if (cur.includes(q)) return;
            patchRow({ extraHighlightQualities: [...cur, q] });
          };

          const onRowPhotoFile = async (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !file.type.startsWith("image/")) return;
            try {
              const s = await imageFileToCompressedJpegDataUrl(file, {
                maxOutputBytes: 340_000,
                initialMaxSide: 480,
              });
              if (s) patchRow({ externalPhotoUrl: s, externalPhotoFrame: { ...PHOTO_FRAME_DEFAULT } });
            } catch {
              /* ignore */
            }
          };

          return (
            <Card key={w.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{displayName}</CardTitle>
                    {!pl ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 gap-1 text-xs"
                        onClick={() => promoteExternal(w)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Adicionar jogador à Equipa
                      </Button>
                    ) : (
                      <Badge variant="muted">Na equipa</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {pl
                      ? formatPlayerPositions(pl)
                      : formatExternalPositions(positionsList, w.externalPosition)}
                    {w.externalClub ? ` · ${w.externalClub}` : ""}
                  </p>
                  {!pl ? <Badge variant="muted">Externo</Badge> : null}
                </div>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-red-400"
                  onClick={() => setSketchArea((s) => ({ ...s, watchlist: s.watchlist.filter((x) => x.id !== w.id) }))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!pl ? (
                  <div className="flex flex-col gap-3 border-b border-surface-border/60 pb-3 sm:flex-row">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                      {w.externalPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.externalPhotoUrl}
                          alt=""
                          className="h-full w-full"
                          style={photoFrameImgStyle(w.externalPhotoFrame)}
                        />
                      ) : (
                        <span className="text-xs font-bold text-zinc-500">{playerInitials(displayName)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={w.externalPlayerName ?? ""}
                        onChange={(e) => patchRow({ externalPlayerName: e.target.value })}
                        placeholder="Nome"
                      />
                      <Input type="file" accept="image/*" className="text-xs text-zinc-500" onChange={onRowPhotoFile} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-[11px] text-zinc-500">
                          Data nascimento
                          <Input
                            type="date"
                            className="mt-1"
                            value={w.dateOfBirth ?? ""}
                            onChange={(e) => patchRow({ dateOfBirth: e.target.value || undefined })}
                          />
                        </label>
                        <p className="flex items-end text-xs text-zinc-400">
                          Idade:{" "}
                          {w.dateOfBirth ? computeAgeFromDateOfBirth(w.dateOfBirth) ?? "—" : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {!pl ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={w.externalClub ?? ""}
                        onChange={(e) => patchRow({ externalClub: e.target.value || undefined })}
                        placeholder="Clube"
                      />
                      <Input
                        value={w.nationality ?? ""}
                        onChange={(e) => patchRow({ nationality: e.target.value || undefined })}
                        placeholder="Nacionalidade"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={w.marketValueNote ?? ""}
                        onChange={(e) => patchRow({ marketValueNote: e.target.value || undefined })}
                        placeholder="Valor de mercado"
                      />
                      <select
                        value={w.preferredFoot ?? ""}
                        onChange={(e) =>
                          patchRow({
                            preferredFoot: (e.target.value as PreferredFoot) || undefined,
                          })
                        }
                        className="h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-white"
                      >
                        <option value="">Pé preferido —</option>
                        <option value="right">Direito</option>
                        <option value="left">Esquerdo</option>
                        <option value="both">Ambos</option>
                      </select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        placeholder="Altura (cm)"
                        value={w.heightCm ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          patchRow({
                            heightCm: v ? Math.min(220, Math.max(120, parseInt(v, 10) || 0)) : undefined,
                          });
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Peso (kg)"
                        value={w.weightKg ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          patchRow({
                            weightKg: v ? Math.min(150, Math.max(35, parseInt(v, 10) || 0)) : undefined,
                          });
                        }}
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">Posições</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SQUAD_POSITIONS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggleRowPos(p)}
                            className={cn(
                              "rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
                              (positionsList ?? ["CM"]).includes(p)
                                ? "border-accent/50 bg-accent/15 text-white"
                                : "border-surface-border bg-black/20 text-zinc-400 hover:border-zinc-600"
                            )}
                          >
                            {POSITION_LABEL_PT[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">Melhores qualidades</p>
                      <div className="grid max-h-36 gap-1.5 overflow-y-auto rounded-lg border border-surface-border/60 bg-black/15 p-2 sm:grid-cols-2">
                        {qualityOptions.map((label) => (
                          <label key={label} className="flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={(w.highlightQualities ?? []).includes(label)}
                              onChange={() => toggleRowHighlight(label)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="Outra qualidade…"
                          value={extraQualityDraftByWatchId[w.id] ?? ""}
                          onChange={(e) =>
                            setExtraQualityDraftByWatchId((m) => ({ ...m, [w.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const q = extraQualityDraftByWatchId[w.id] ?? "";
                              addRowExtraQuality(q);
                              setExtraQualityDraftByWatchId((m) => ({ ...m, [w.id]: "" }));
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => {
                            const q = extraQualityDraftByWatchId[w.id] ?? "";
                            addRowExtraQuality(q);
                            setExtraQualityDraftByWatchId((m) => ({ ...m, [w.id]: "" }));
                          }}
                        >
                          +
                        </Button>
                      </div>
                      {(w.extraHighlightQualities ?? []).length ? (
                        <ul className="mt-1 list-inside list-disc text-[11px] text-zinc-500">
                          {(w.extraHighlightQualities ?? []).map((q) => (
                            <li key={q} className="flex items-center justify-between gap-2">
                              <span>{q}</span>
                              <button
                                type="button"
                                className="text-red-400/90 hover:underline"
                                onClick={() =>
                                  patchRow({
                                    extraHighlightQualities: (w.extraHighlightQualities ?? []).filter((x) => x !== q),
                                  })
                                }
                              >
                                remover
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <label className="block text-xs text-zinc-500">Tags de foco (vírgula)</label>
                <Input
                  value={w.focusTags.join(", ")}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    patchRow({ focusTags: tags });
                  }}
                />
                <label className="block text-xs text-zinc-500">Última nota</label>
                <textarea
                  className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                  value={w.latestNote}
                  onChange={(e) => patchRow({ latestNote: e.target.value })}
                />
                <label className="block text-xs text-zinc-500">Próxima ação</label>
                <Input value={w.nextAction} onChange={(e) => patchRow({ nextAction: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-zinc-500">
                    Lembrete
                    <Input
                      className="mt-1"
                      value={w.reminderText ?? ""}
                      onChange={(e) => patchRow({ reminderText: e.target.value || undefined })}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Data (calendário)
                    <Input
                      className="mt-1"
                      type="date"
                      value={w.reminderDate ?? ""}
                      onChange={(e) => patchRow({ reminderDate: e.target.value || undefined })}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={() => syncReminderToCalendar(w)}>
                    Guardar lembrete no calendário
                  </Button>
                  {linkedEvt ? (
                    <span className="text-[11px] text-zinc-500">
                      Ligado: {linkedEvt.date} — {linkedEvt.title}
                    </span>
                  ) : null}
                </div>
                <label className="block text-xs text-zinc-500">Nota de presença</label>
                <Input
                  value={w.attendanceNote ?? ""}
                  onChange={(e) => patchRow({ attendanceNote: e.target.value || undefined })}
                />
                <label className="block text-xs text-zinc-500">Links de clips (um por linha)</label>
                <textarea
                  className="min-h-[56px] w-full rounded-xl border border-surface-border bg-surface-raised/50 px-3 py-2 text-sm"
                  value={w.clipLinks.join("\n")}
                  onChange={(e) =>
                    patchRow({
                      clipLinks: e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
      {sketchArea.watchlist.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">Sem jogadores na lista de observação.</p>
      ) : null}

      <PlayerPickerModal
        open={pickerOpen}
        title="Adicionar à observação"
        players={players}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => {
          addWatch(p);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
