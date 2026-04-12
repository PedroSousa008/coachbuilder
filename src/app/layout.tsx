import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { ClientProviders } from "@/components/providers/ClientProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CoachBuilder — The operating system for football coaches",
  description:
    "Plan smarter. Train better. Communicate faster. Tactics, training, team chat, and Sketch Area in one premium workspace.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} min-h-screen bg-[#0a0d10] font-sans text-zinc-100 antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
