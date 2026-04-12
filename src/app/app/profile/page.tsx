import { Suspense } from "react";
import { CoachProfileApp } from "@/components/profile/CoachProfileApp";

function ProfileFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#06080c] text-sm text-zinc-500">
      A carregar perfil…
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <CoachProfileApp />
    </Suspense>
  );
}
