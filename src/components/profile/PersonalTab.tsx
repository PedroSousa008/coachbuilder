"use client";

import { useEffect, useState } from "react";
import type { CoachProfileState } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { profileFieldClass, profileTextAreaClass } from "@/components/profile/field-styles";

type Props = {
  coachProfile: CoachProfileState;
  hydrated: boolean;
  onSave: (patch: Partial<CoachProfileState>) => void;
  /** Pré-visualização na moldura do hero: `undefined` = usar perfil gravado; `null` = iniciais. */
  onHeroAvatarOverrideChange?: (url: string | null | undefined) => void;
};

/**
 * Foto escolhida no input: pré-visualização no hero; persistência após "Guardar dados".
 * undefined = não há alteração local; null = utilizador removeu a foto antes de gravar.
 */
type AvatarPending = string | null | undefined;

export function PersonalTab({ coachProfile, hydrated, onSave, onHeroAvatarOverrideChange }: Props) {
  const [draft, setDraft] = useState(coachProfile);
  const [avatarPending, setAvatarPending] = useState<AvatarPending>(undefined);
  const [dirty, setDirty] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || dirty) return;
    setDraft(coachProfile);
    setAvatarPending(undefined);
  }, [hydrated, coachProfile, dirty]);

  useEffect(() => {
    onHeroAvatarOverrideChange?.(avatarPending);
  }, [avatarPending, onHeroAvatarOverrideChange]);

  const previewAvatarUrl: string | undefined =
    avatarPending === undefined ? draft.avatarDataUrl : avatarPending === null ? undefined : avatarPending;

  const readAvatar = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 1_200_000) {
      setHint("Imagem demasiado grande (máx. ~1,2 MB). Tenta redimensionar.");
      window.setTimeout(() => setHint(null), 4000);
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const url = typeof r.result === "string" ? r.result : "";
      if (!url) return;
      setAvatarPending(url);
      setDirty(true);
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card className="border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-950/90">
        <CardHeader>
          <CardTitle className="text-white">Dados pessoais</CardTitle>
          <p className="text-sm text-zinc-500">
            Informação visível só na tua conta. Grava para persistir neste dispositivo (e na nuvem, se activa).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/80 shadow-lg">
              {previewAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">Foto</div>
              )}
            </div>
            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-zinc-500">Foto de perfil</label>
              <p className="text-[11px] text-zinc-600">
                A pré-visualização actualiza já na capa; grava para persistir neste dispositivo e na nuvem.
              </p>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-2 file:text-accent"
                onChange={(e) => readAvatar(e.target.files?.[0] ?? null)}
              />
              {previewAvatarUrl ? (
                <button
                  type="button"
                  className="text-xs text-red-400/90 hover:underline"
                  onClick={() => {
                    setAvatarPending(null);
                    setDirty(true);
                  }}
                >
                  Remover foto
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-zinc-500" htmlFor="full-name">
                Nome completo
              </label>
              <input
                id="full-name"
                value={draft.name}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, name: e.target.value }));
                }}
                className={profileFieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={draft.email}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, email: e.target.value }));
                }}
                className={profileFieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="phone">
                Telefone (opcional)
              </label>
              <input
                id="phone"
                value={draft.phone ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, phone: e.target.value || undefined }));
                }}
                className={profileFieldClass}
                placeholder="+351 …"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="club">
                Clube actual
              </label>
              <input
                id="club"
                value={draft.club}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, club: e.target.value }));
                }}
                className={profileFieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="profession">
                Profissão
              </label>
              <input
                id="profession"
                value={draft.profession ?? draft.role}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, profession: e.target.value, role: e.target.value || d.role }));
                }}
                className={profileFieldClass}
                placeholder="Ex.: Treinador de futebol"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="dob">
                Data de nascimento
              </label>
              <input
                id="dob"
                type="date"
                value={draft.dateOfBirth ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, dateOfBirth: e.target.value || undefined }));
                }}
                className={profileFieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="nat">
                Nacionalidade
              </label>
              <input
                id="nat"
                value={draft.nationality ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, nationality: e.target.value || undefined }));
                }}
                className={profileFieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-zinc-500" htmlFor="loc">
                Localização (cidade / país)
              </label>
              <input
                id="loc"
                value={draft.location ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setDraft((d) => ({ ...d, location: e.target.value || undefined }));
                }}
                className={profileFieldClass}
                placeholder="Porto, Portugal"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="bio">
              Biografia curta
            </label>
            <textarea
              id="bio"
              value={draft.bio ?? ""}
              onChange={(e) => {
                setDirty(true);
                setDraft((d) => ({ ...d, bio: e.target.value || undefined }));
              }}
              className={profileTextAreaClass}
              placeholder="A tua história, filosofia e o que te move no relvado."
              rows={4}
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Redes sociais (opcional)</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-500" htmlFor="ig">
                  Instagram
                </label>
                <input
                  id="ig"
                  value={draft.socialInstagram ?? ""}
                  onChange={(e) => {
                    setDirty(true);
                    setDraft((d) => ({ ...d, socialInstagram: e.target.value || undefined }));
                  }}
                  className={profileFieldClass}
                  placeholder="@utilizador"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500" htmlFor="tw">
                  X / Twitter
                </label>
                <input
                  id="tw"
                  value={draft.socialTwitter ?? ""}
                  onChange={(e) => {
                    setDirty(true);
                    setDraft((d) => ({ ...d, socialTwitter: e.target.value || undefined }));
                  }}
                  className={profileFieldClass}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500" htmlFor="li">
                  LinkedIn
                </label>
                <input
                  id="li"
                  value={draft.socialLinkedin ?? ""}
                  onChange={(e) => {
                    setDirty(true);
                    setDraft((d) => ({ ...d, socialLinkedin: e.target.value || undefined }));
                  }}
                  className={profileFieldClass}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500" htmlFor="web">
                  Website
                </label>
                <input
                  id="web"
                  value={draft.socialWebsite ?? ""}
                  onChange={(e) => {
                    setDirty(true);
                    setDraft((d) => ({ ...d, socialWebsite: e.target.value || undefined }));
                  }}
                  className={profileFieldClass}
                  placeholder="https://"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              className="sm:min-w-[160px]"
              onClick={() => {
                const nextAvatar: string | undefined =
                  avatarPending === undefined
                    ? draft.avatarDataUrl
                    : avatarPending === null
                      ? undefined
                      : avatarPending;
                onSave({ ...draft, avatarDataUrl: nextAvatar });
                setDirty(false);
                setAvatarPending(undefined);
                setHint("Guardado.");
                window.setTimeout(() => setHint(null), 2400);
              }}
            >
              Guardar dados
            </Button>
            {hint ? <p className="text-sm text-accent">{hint}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
