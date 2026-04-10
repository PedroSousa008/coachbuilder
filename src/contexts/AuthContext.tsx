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
import { loadUsers, saveUsers } from "@/lib/auth-local-storage";
import { AUTH_STORAGE_KEYS, runCoachbuilderStorageMigrations } from "@/lib/coachbuilder-persist";
import { userDataKey } from "@/lib/user-storage-keys";
import type { AuthUser, CoachingRoleId, SignUpCredentials } from "@/types/auth";
import { coachingRoleProfileLabel, isCoachingRoleId } from "@/types/auth";

export type { AuthUser };

type SessionPayload = {
  userId: string;
  email: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  authReady: boolean;
  signUp: (input: SignUpCredentials) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

function toAuthUser(u: {
  id: string;
  email: string;
  name: string;
  coachingRole: CoachingRoleId;
}): AuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    coachingRole: u.coachingRole,
  };
}

/** Preenche o perfil de treinador na chave da conta (persistente neste navegador). */
function seedCoachProfileForNewAccount(
  userId: string,
  name: string,
  coachingRole: CoachingRoleId,
  email: string
) {
  const key = userDataKey(userId, "coachProfile");
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const o = JSON.parse(raw) as Partial<{ name: string }>;
      if (o?.name != null && String(o.name).trim() !== "") return;
    } catch {
      return;
    }
  }

  localStorage.setItem(
    key,
    JSON.stringify({
      name: name.trim(),
      club: "",
      role: coachingRoleProfileLabel(coachingRole),
      email,
    })
  );
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
    let found = users.find((u) => u.id === session.userId && u.email === session.email);
    if (!found) {
      found = users.find((u) => u.id === session.userId);
    }
    if (!found) {
      saveSession(null);
      setUser(null);
    } else {
      if (found.email !== session.email) {
        saveSession({ userId: found.id, email: found.email });
      }
      setUser(toAuthUser(found));
    }
    setAuthReady(true);
  }, []);

  const signUp = useCallback(async (input: SignUpCredentials): Promise<AuthResult> => {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 120) {
      return { ok: false, error: "Indica o teu nome (até 120 caracteres)." };
    }
    if (!isCoachingRoleId(input.coachingRole)) {
      return { ok: false, error: "Escolhe uma função válida." };
    }
    const norm = normalizeEmail(input.email);
    if (!isValidEmail(norm)) return { ok: false, error: "Introduz um email válido." };
    if (input.password.length < 8) {
      return { ok: false, error: "A palavra-passe deve ter pelo menos 8 caracteres." };
    }

    const users = loadUsers();
    if (users.some((u) => u.email === norm)) {
      return { ok: false, error: "Já existe uma conta com este email." };
    }

    const { salt, hash } = await hashPassword(input.password);
    const record = {
      id: newUserId(),
      email: norm,
      name,
      coachingRole: input.coachingRole,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      emailVerified: true,
    };
    saveUsers([...users, record]);
    seedCoachProfileForNewAccount(record.id, name, input.coachingRole, norm);
    saveSession({ userId: record.id, email: record.email });
    setUser(toAuthUser(record));
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
    setUser(toAuthUser(found));
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
