"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const presidentMode = isClubPresident(user) && isPresidentAppPath(pathname);
  const title = presidentMode ? presidentPageTitle(pathname) : shellTitle(pathname, t);

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
        {children}
      </div>
    </div>
  );
}
