"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CustomPriceBanner } from "@/components/subscription/CustomPriceBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { isClubPresident, isPresidentAppPath } from "@/lib/president-mode";
import { presidentPageTitle } from "@/lib/president-nav";
import { PresidentSidebar } from "@/components/president/PresidentSidebar";
import { PresidentHeader } from "@/components/president/PresidentHeader";
import { PresidenteNavRedirect } from "@/components/president/PresidenteNavRedirect";

function shellTitle(pathname: string, t: ReturnType<typeof useLanguage>["t"]): string {
  if (pathname.startsWith("/app/admin/database")) return t("shell.database");
  if (pathname.startsWith("/app/admin")) return t("shell.admin");
  const titles: Record<string, string> = {
    "/app": t("shell.dashboard"),
    "/app/tactics": t("shell.tactics"),
    "/app/training": t("shell.trainingPlans"),
    "/app/messages": t("shell.messages"),
    "/app/sketch": t("shell.sketchArea"),
    "/app/team": t("shell.team"),
    "/app/calendar": t("shell.calendar"),
    "/app/profile": t("shell.profile"),
    "/app/treinador-do-mes": t("shell.coachOfMonth"),
    "/app/treinadores": t("shell.coaches"),
    "/app/settings": t("shell.settings"),
    "/app/admin": t("shell.admin"),
  };
  return titles[pathname] ?? t("shell.coachBuilder");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, authReady } = useAuth();
  const { hydrated } = useAppData();
  const { t } = useLanguage();
  const presidentMode = isClubPresident(user) && isPresidentAppPath(pathname);
  const title = presidentMode ? presidentPageTitle(pathname) : shellTitle(pathname, t);
  const showWorkspaceLoading = authReady && Boolean(user?.id) && !hydrated;

  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--background)] print:bg-white",
        presidentMode ? "lg:pl-[280px] print:pl-0" : "lg:pl-64 print:pl-0"
      )}
    >
      <PresidenteNavRedirect />
      <div className="print:hidden">
        {presidentMode ? (
          <>
            <PresidentSidebar />
            <PresidentHeader title={title} />
          </>
        ) : (
          <>
            <AppSidebar />
            <AppHeader title={title} />
          </>
        )}
      </div>
      <div className="px-4 py-6 lg:px-8 print:px-4 print:py-4">
        <div className="print:hidden">{!presidentMode ? <CustomPriceBanner /> : null}</div>
        {showWorkspaceLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/95 print:hidden"
          >
            <span
              className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-300/35 border-t-amber-100"
              aria-hidden
            />
            <span>{t("app.loading")}</span>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
