"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CustomPriceBanner } from "@/components/subscription/CustomPriceBanner";

const titles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/tactics": "Tactics",
  "/app/training": "Training Plans",
  "/app/messages": "Messages",
  "/app/sketch": "Sketch Area",
  "/app/team": "Team",
  "/app/calendar": "Calendar",
  "/app/profile": "Profile",
  "/app/settings": "Settings",
  "/app/admin": "Admin",
};

function shellTitle(pathname: string): string {
  if (pathname.startsWith("/app/admin/database")) return "Base de dados";
  if (pathname.startsWith("/app/admin")) return "Admin";
  return titles[pathname] ?? "CoachBuilder";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = shellTitle(pathname);

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
