"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { imageFileToCompressedJpegDataUrl } from "@/lib/profile-avatar-compress";
import {
  COACH_MONTH_ARCHIVE_TABLE_HEADERS,
  coachArchiveEmptyRow,
  defaultCoachOfMonthContent,
  type CoachOfMonthArchiveRow,
  type CoachMonthWinner,
  type CoachOfMonthContent,
} from "@/lib/coach-of-month";

type CoachOption = {
  id: string;
  name: string;
  email: string;
};

function updateWinner(
  content: CoachOfMonthContent,
  id: CoachMonthWinner["id"],
  apply: (row: CoachMonthWinner) => CoachMonthWinner
): CoachOfMonthContent {
  return {
    ...content,
    winners: content.winners.map((w) => (w.id === id ? apply(w) : w)),
  };
}

function patchArchiveCell(
  content: CoachOfMonthContent,
  rowIndex: number,
  key: keyof CoachOfMonthArchiveRow,
  value: string
): CoachOfMonthContent {
  const rows = [...content.winnersArchive];
  rows[rowIndex] = { ...rows[rowIndex], [key]: value };
  return { ...content, winnersArchive: rows };
}

function removeArchiveRow(content: CoachOfMonthContent, rowIndex: number): CoachOfMonthContent {
  if (content.winnersArchive.length <= 1) return content;
  return {
    ...content,
    winnersArchive: content.winnersArchive.filter((_, i) => i !== rowIndex),
  };
}

export function CoachOfMonthAdminEditor({
  value,
  editable,
  coachOptions,
  onChange,
}: {
  value: CoachOfMonthContent;
  editable: boolean;
  coachOptions: CoachOption[];
  onChange: (next: CoachOfMonthContent) => void;
}) {
  const [fileHint, setFileHint] = useState<string | null>(null);

  const sortedCoaches = useMemo(
    () =>
      [...coachOptions].sort((a, b) => {
        const an = (a.name || a.email).toLocaleLowerCase();
        const bn = (b.name || b.email).toLocaleLowerCase();
        return an.localeCompare(bn);
      }),
    [coachOptions]
  );

  const setWinnerField = (id: CoachMonthWinner["id"], patch: Partial<CoachMonthWinner>) =>
    onChange(updateWinner(value, id, (row) => ({ ...row, ...patch })));

  const loadAsDataUrl = (id: CoachMonthWinner["id"], field: "photoUrl" | "clubLogoUrl", file: File | null) => {
    if (!file) return;
    void (async () => {
      try {
        setFileHint("A processar imagem…");
        const dataUrl = await imageFileToCompressedJpegDataUrl(file);
        setWinnerField(id, { [field]: dataUrl });
        setFileHint(null);
      } catch {
        setFileHint("Não foi possível processar a imagem. Tenta JPG ou PNG.");
        window.setTimeout(() => setFileHint(null), 3500);
      }
    })();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo global · Treinador do Mês</CardTitle>
          <p className="text-sm text-zinc-500">
            As alterações só ficam visíveis para todos os utilizadores quando clicares em Guardar.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Título</span>
            <Input
              value={value.headerTitle}
              onChange={(e) => onChange({ ...value, headerTitle: e.target.value })}
              placeholder="Melhores Treinadores do Mês"
              disabled={!editable}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Subtítulo</span>
            <Input
              value={value.headerSubtitle}
              onChange={(e) => onChange({ ...value, headerSubtitle: e.target.value })}
              placeholder="Reconhecer o mérito. Inspirar o futuro."
              disabled={!editable}
            />
          </label>
          {fileHint ? <p className="text-xs text-zinc-500 md:col-span-2">{fileHint}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onChange(defaultCoachOfMonthContent())}
              disabled={!editable}
            >
              Repor template base
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {value.winners.map((w) => (
          <Card key={w.id} className="border-white/10 bg-surface-raised/30">
            <CardHeader>
              <CardTitle className="text-base">{w.ageGroup}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Treinador (opcional)</span>
                <select
                  value={w.coachUserId ?? ""}
                  onChange={(e) => setWinnerField(w.id, { coachUserId: e.target.value || undefined })}
                  className="h-11 w-full rounded-xl border border-surface-border bg-[#0c1014] px-4 text-sm text-zinc-200"
                  disabled={!editable}
                >
                  <option value="">Manual (sem ligação a conta)</option>
                  {sortedCoaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name || coach.email} ({coach.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Ranking</span>
                <Input
                  value={w.rankLabel}
                  onChange={(e) => setWinnerField(w.id, { rankLabel: e.target.value })}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Nome mostrado</span>
                <Input
                  value={w.coachName}
                  onChange={(e) => setWinnerField(w.id, { coachName: e.target.value })}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Escalão</span>
                <Input
                  value={w.ageGroup}
                  onChange={(e) => setWinnerField(w.id, { ageGroup: e.target.value })}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Clube</span>
                <Input
                  value={w.clubName}
                  onChange={(e) => setWinnerField(w.id, { clubName: e.target.value })}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Logo do clube (URL / data URL)</span>
                <Input
                  value={w.clubLogoUrl ?? ""}
                  onChange={(e) => setWinnerField(w.id, { clubLogoUrl: e.target.value })}
                  disabled={!editable}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-zinc-500 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:text-zinc-300"
                  onChange={(e) => loadAsDataUrl(w.id, "clubLogoUrl", e.target.files?.[0] ?? null)}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-zinc-500">Foto do treinador (URL / data URL)</span>
                <Input
                  value={w.photoUrl ?? ""}
                  onChange={(e) => setWinnerField(w.id, { photoUrl: e.target.value })}
                  disabled={!editable}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-zinc-500 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:text-zinc-300"
                  onChange={(e) => loadAsDataUrl(w.id, "photoUrl", e.target.files?.[0] ?? null)}
                  disabled={!editable}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-zinc-500">Texto da notícia</span>
                <textarea
                  rows={3}
                  value={w.news}
                  onChange={(e) => setWinnerField(w.id, { news: e.target.value })}
                  className="w-full rounded-xl border border-surface-border bg-[#0c1014] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                  disabled={!editable}
                />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10 bg-surface-raised/30">
        <CardHeader>
          <CardTitle className="text-base">Histórico de vencedores (tabela)</CardTitle>
          <p className="text-sm font-normal text-zinc-500">
            Uma linha por mês. Preenche o nome do vencedor (ou texto livre) por escalão. Na página pública, células
            vazias mostram —. Podes adicionar linhas à medida que vais registando vencedores.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-900/40 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  {COACH_MONTH_ARCHIVE_TABLE_HEADERS.map((h) => (
                    <th key={h.key} className="px-3 py-2 font-medium">
                      {h.label}
                    </th>
                  ))}
                  <th className="w-24 px-3 py-2 font-medium" aria-label="Remover linha" />
                </tr>
              </thead>
              <tbody>
                {value.winnersArchive.map((row, rowIndex) => (
                  <tr key={`archive-edit-${rowIndex}`} className="border-b border-white/10 last:border-0">
                    {COACH_MONTH_ARCHIVE_TABLE_HEADERS.map((col) => (
                      <td key={col.key} className="p-2 align-middle">
                        <Input
                          value={row[col.key]}
                          onChange={(e) => onChange(patchArchiveCell(value, rowIndex, col.key, e.target.value))}
                          disabled={!editable}
                          className="h-9 min-w-[7rem] text-xs"
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="p-2 align-middle">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-2 text-[11px]"
                        disabled={!editable || value.winnersArchive.length <= 1}
                        onClick={() => onChange(removeArchiveRow(value, rowIndex))}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!editable}
            onClick={() =>
              onChange({ ...value, winnersArchive: [...value.winnersArchive, coachArchiveEmptyRow()] })
            }
          >
            Adicionar linha (mês)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
