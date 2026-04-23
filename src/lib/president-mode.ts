import type { AuthUser } from "@/types/auth";

export function isClubPresident(user: AuthUser | null | undefined): boolean {
  return user?.coachingRole === "club-president";
}

export function isPresidentAppPath(pathname: string): boolean {
  return pathname === "/app/president" || pathname.startsWith("/app/president/");
}
