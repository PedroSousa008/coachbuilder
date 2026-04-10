import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";

function AppShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0d10]">
      <p className="text-sm text-zinc-500">A carregar…</p>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </Suspense>
  );
}
