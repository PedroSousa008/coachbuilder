"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COACHING_ROLES, type CoachingRoleId, isCoachingRoleId } from "@/types/auth";

function SignupForm() {
  const { signUp, user, authReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next") || "/app";
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  const [name, setName] = useState("");
  const [coachingRole, setCoachingRole] = useState<CoachingRoleId>("club-president");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (authReady && user) router.replace(next);
  }, [authReady, user, router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setPending(true);
    const res = await signUp({
      name,
      coachingRole,
      email,
      password,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-4 py-16">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 font-display text-sm font-bold text-accent">
            CB
          </span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-white">Criar conta</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Indica o teu nome e função, depois email e palavra-passe. A conta e os dados ficam guardados neste navegador;
          nas próximas visitas entras com o mesmo email e palavra-passe e a sessão mantém-se neste dispositivo até saíres.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-border bg-surface-raised/40 p-6">
        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        ) : null}
        <div>
          <label htmlFor="signup-name" className="text-xs font-medium text-zinc-500">
            Nome
          </label>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            required
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="signup-role" className="text-xs font-medium text-zinc-500">
            Função no clube
          </label>
          <select
            id="signup-role"
            value={coachingRole}
            onChange={(e) => {
              const v = e.target.value;
              if (isCoachingRoleId(v)) setCoachingRole(v);
            }}
            className="mt-1.5 flex h-10 w-full rounded-lg border border-surface-border bg-[#0c1014] px-3 text-sm text-zinc-200 outline-none ring-accent/40 focus-visible:ring-2"
          >
            {COACHING_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="signup-email" className="text-xs font-medium text-zinc-500">
            Email
          </label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="text-xs font-medium text-zinc-500">
            Palavra-passe (mín. 8 caracteres)
          </label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
            required
            minLength={8}
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="text-xs font-medium text-zinc-500">
            Confirmar palavra-passe
          </label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "A criar conta…" : "Criar conta"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Já tens conta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
      <p className="text-center">
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
          ← Voltar ao site
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0a0d10]">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-zinc-500">A carregar…</p>
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
