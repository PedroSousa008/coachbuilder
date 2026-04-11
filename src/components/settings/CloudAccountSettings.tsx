"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isCloudSyncEnabledClient } from "@/lib/cloud-config";

export function CloudAccountSettings() {
  const { user, authReady, refreshUserFromCloud } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isCloudSyncEnabledClient() || !authReady || !user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/30 p-4 text-sm text-zinc-400">
      <p className="font-medium text-zinc-200">Conta cloud</p>
      <p className="mt-2">
        Email na sessão: <span className="break-all text-zinc-300">{user.email}</span>
      </p>
      <p className="mt-1">
        Função:{" "}
        <span className={isAdmin ? "text-amber-400" : "text-zinc-300"}>
          {isAdmin ? "Administrador (vês o menu Admin)" : "Utilizador"}
        </span>
      </p>
      {!isAdmin ? (
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Se és o dono do projeto, na Vercel define a variável{" "}
          <code className="rounded bg-black/40 px-1 text-zinc-400">ADMIN_OWNER_EMAIL</code> exatamente como o email
          acima (sem aspas a mais), em <strong>Production</strong>, e faz <strong>Redeploy</strong>. Depois carrega em
          &quot;Atualizar sessão&quot; abaixo ou volta a entrar.
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setMsg(null);
          setBusy(true);
          const r = await refreshUserFromCloud();
          setBusy(false);
          setMsg(r.ok ? "Sessão atualizada." : r.error || "Falhou.");
        }}
        className="mt-4 rounded-xl border border-surface-border bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-white/10 disabled:opacity-50"
      >
        {busy ? "A atualizar…" : "Atualizar sessão com o servidor"}
      </button>
      {msg ? <p className="mt-2 text-xs text-zinc-500">{msg}</p> : null}
    </div>
  );
}
