"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CustomPriceBanner } from "@/components/subscription/CustomPriceBanner";
import { useLanguage } from "@/contexts/LanguageContext";

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
    "/app/settings": t("shell.settings"),
    "/app/admin": t("shell.admin"),
  };
  return titles[pathname] ?? t("shell.coachBuilder");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const title = shellTitle(pathname, t);

  return (
    <div className="min-h-screen bg-[#0a0d10] lg:pl-64">
      <AppSidebar />
      <AppHeader title={title} />
      <div className="px-4 py-6 lg:px-8">
        <CustomPriceBanner />
        {children}
      </div>
    </div>
  );
}
