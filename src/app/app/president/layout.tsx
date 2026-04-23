"use client";

import { PresidentClubProvider } from "@/contexts/PresidentClubContext";

export default function PresidentLayout({ children }: { children: React.ReactNode }) {
  return <PresidentClubProvider>{children}</PresidentClubProvider>;
}
