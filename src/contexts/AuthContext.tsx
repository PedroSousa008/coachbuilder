"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hashPassword, verifyPassword } from "@/lib/password-crypto";
import { AUTH_STORAGE_KEYS, runCoachbuilderStorageMigrations } from "@/lib/coachbuilder-persist";

export type AuthUser = {
  id: string;
  email: string;
};

type StoredUser = AuthUser & {
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type SessionPayload = {
  userId: string;
  email: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  authReady: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.users);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEYS.users, JSON.stringify(users));
}

function loadSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.session);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessionPayload;
    if (typeof s?.userId === "string" && typeof s?.email === "string") return s;
    return null;
  } catch {
    return null;
  }
}

function saveSession(s: SessionPayload | null) {
  if (typeof window === "undefined") return;
  if (!s) {
    localStorage.removeItem(AUTH_STORAGE_KEYS.session);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEYS.session, JSON.stringify(s));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function newUserId() {
  return `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    runCoachbuilderStorageMigrations();
    const session = loadSession();
    if (!session) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    const users = loadUsers();
    const found = users.find((u) => u.id === session.userId && u.email === session.email);
    if (!found) {
      saveSession(null);
      setUser(null);
    } else {
      setUser({ id: found.id, email: found.email });
    }
    setAuthReady(true);
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const norm = normalizeEmail(email);
    if (!isValidEmail(norm)) return { ok: false, error: "Introduz um email válido." };
    if (password.length < 8) return { ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." };

    const users = loadUsers();
    if (users.some((u) => u.email === norm)) {
      return { ok: false, error: "Já existe uma conta com este email." };
    }

    const { salt, hash } = await hashPassword(password);
    const record: StoredUser = {
      id: newUserId(),
      email: norm,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, record]);
    saveSession({ userId: record.id, email: record.email });
    setUser({ id: record.id, email: record.email });
    return { ok: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const norm = normalizeEmail(email);
    if (!norm || !password) return { ok: false, error: "Email e palavra-passe são obrigatórios." };

    const users = loadUsers();
    const found = users.find((u) => u.email === norm);
    if (!found) return { ok: false, error: "Email ou palavra-passe incorretos." };

    const ok = await verifyPassword(password, found.salt, found.passwordHash);
    if (!ok) return { ok: false, error: "Email ou palavra-passe incorretos." };

    saveSession({ userId: found.id, email: found.email });
    setUser({ id: found.id, email: found.email });
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authReady,
      signUp,
      login,
      logout,
    }),
    [user, authReady, signUp, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
