export type AppShellTheme = "dark" | "light";

const PREFIX = "coachbuilder_shell_theme";

export function shellThemeStorageKey(userId: string | null | undefined): string {
  return userId ? `${PREFIX}_${userId}` : `${PREFIX}_guest`;
}

export function readShellTheme(userId: string | null | undefined): AppShellTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(shellThemeStorageKey(userId ?? null))?.trim();
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function writeShellTheme(userId: string | null | undefined, theme: AppShellTheme): void {
  try {
    localStorage.setItem(shellThemeStorageKey(userId ?? null), theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyShellThemeToDocument(theme: AppShellTheme): void {
  if (typeof document === "undefined") return;
  if (theme === "light") {
    document.documentElement.setAttribute("data-app-shell", "light");
  } else {
    document.documentElement.removeAttribute("data-app-shell");
  }
}
