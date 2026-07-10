"use client";

import { useCallback, useRef, useState } from "react";
import { mockCoach } from "@/data/mock";
import { ClubCrestBadge } from "@/components/club/ClubCrestBadge";
import { ClubIdentityModal } from "@/components/club/ClubIdentityModal";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { imageFileToCompressedJpegDataUrl } from "@/lib/profile-avatar-compress";
import { cn } from "@/lib/utils";

export function DashboardHero({
  welcomeLine,
  club,
  role,
  tagline,
}: {
  welcomeLine: string;
  club: string;
  role: string;
  tagline: string;
}) {
  const { coachProfile, setCoachProfile, setTeamCallup } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const crest = coachProfile.clubCrestDataUrl;

  const persistCrest = useCallback(
    (dataUrl: string | undefined) => {
      setCoachProfile({ clubCrestDataUrl: dataUrl });
      setTeamCallup((prev) => ({ ...prev, clubLogoDataUrl: dataUrl }));
    },
    [setCoachProfile, setTeamCallup]
  );

  const handleHeroClick = () => {
    if (!crest) {
      fileRef.current?.click();
      return;
    }
    setModalOpen(true);
  };

  const onQuickUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await imageFileToCompressedJpegDataUrl(file, {
        initialMaxSide: 512,
        maxOutputBytes: 400_000,
      });
      persistCrest(dataUrl);
    } catch {
      setModalOpen(true);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <section
        role="button"
        tabIndex={0}
        onClick={handleHeroClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleHeroClick();
          }
        }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0D0D0D] px-6 py-8 transition-all duration-200",
          "hover:border-white/[0.1] hover:bg-[#101010] sm:px-8 sm:py-10",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/50"
        )}
        aria-label={isPt ? "Gerir identidade do clube" : "Manage club identity"}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 49.5%, rgba(255,255,255,0.35) 49.5%, rgba(255,255,255,0.35) 50.5%, transparent 50.5%),
              linear-gradient(0deg, transparent 49.5%, rgba(255,255,255,0.2) 49.5%, rgba(255,255,255,0.2) 50.5%, transparent 50.5%)
            `,
            backgroundSize: "100% 100%",
          }}
        />

        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 animate-[dashboardFadeIn_0.5s_ease-out_both]">
            <h1 className="font-display text-[32px] font-semibold tracking-tight text-white sm:text-[34px]">
              {welcomeLine}
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-zinc-400">{tagline}</p>
            <div className="mt-6 space-y-1">
              <p className="text-base font-medium text-zinc-200">{club.trim() || (isPt ? "O teu clube" : "Your club")}</p>
              <p className="text-[13px] text-zinc-500">{role || mockCoach.role}</p>
            </div>
          </div>

          <div className="flex shrink-0 justify-end sm:justify-center">
            <ClubCrestBadge
              crestDataUrl={crest}
              clubName={club}
              size="lg"
              className="transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onQuickUpload(e.target.files?.[0])}
      />

      <ClubIdentityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clubName={club}
        crestDataUrl={crest}
        isPt={isPt}
        onSaveCrest={(dataUrl) => persistCrest(dataUrl)}
        onRemoveCrest={() => persistCrest(undefined)}
      />
    </>
  );
}
