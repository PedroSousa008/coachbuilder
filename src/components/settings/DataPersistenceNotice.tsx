"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { clearPerUserImportFlag } from "@/lib/user-storage-keys";

export function DataPersistenceNotice() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Os teus dados</CardTitle>
        <p className="text-sm text-zinc-500">
          Tudo o que crias na app é guardado <strong className="font-medium text-zinc-400">automaticamente</strong> na tua
          conta neste navegador.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-400">
        <p>Inclui jogadores, táticas, jogos registados, conversas, treinos, calendário e perfil — sempre que alteras
          algo, fica gravado no armazenamento local do dispositivo.</p>
        <p>
          <strong className="font-medium text-zinc-300">Atualizações do site</strong> (novas versões na Vercel){" "}
          <strong className="font-medium text-zinc-300">não apagam</strong> estes dados. Mantêm-se até limpares os dados
          do site, mudares de navegador sem os dados, ou usares outro dispositivo (cada browser tem a sua cópia local).
        </p>
        {user ? (
          <div className="space-y-2 rounded-xl border border-surface-border bg-surface-raised/30 px-3 py-2 text-xs text-zinc-500">
            <p>
              Sessão atual: <span className="text-zinc-300">{user.email}</span>
            </p>
            <p className="text-zinc-600">
              Se após uma atualização os dados desta conta parecerem vazios mas tinhas conteúdo neste navegador, podes
              tentar reimportar a partir das cópias antigas (só preenche campos que estejam vazios).
            </p>
            <button
              type="button"
              className="rounded-lg border border-surface-border bg-surface-raised px-2 py-1.5 text-left text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              onClick={() => {
                clearPerUserImportFlag(user.id);
                window.location.reload();
              }}
            >
              Tentar recuperar dados de versão anterior
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
