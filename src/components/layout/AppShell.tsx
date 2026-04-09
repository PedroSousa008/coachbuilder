"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

const titles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/tactics": "Tactics",
  "/app/training": "Training Plans",
  "/app/messages": "Messages",
  "/app/video": "Video Analysis",
  "/app/team": "Team",
  "/app/profile": "Profile",
  "/app/settings": "Settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "CoachBuilder";

  return (
    <div className="min-h-screen bg-[#0a0d10] lg:pl-64">
      <AppSidebar />
      <AppHeader title={title} />
      <div className="px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
