import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-surface-border bg-[#080a0c]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-border/70 bg-white">
                <img src="/icon.png" alt="CoachBuilder logo" className="h-full w-full object-contain" />
              </span>
              <span className="font-display font-semibold text-white">CoachBuilder</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-zinc-500">
              O sistema operativo para treinadores de futebol — táticas, treino e comunicação do plantel num só espaço.
            </p>
          </div>
          <div className="flex flex-wrap gap-10 text-sm">
            <div>
              <p className="font-medium text-white">Produto</p>
              <ul className="mt-3 space-y-2 text-zinc-500">
                <li>
                  <Link href="/app/tactics" className="hover:text-accent">
                    Táticas
                  </Link>
                </li>
                <li>
                  <Link href="/app/training" className="hover:text-accent">
                    Treino
                  </Link>
                </li>
                <li>
                  <Link href="/app/messages" className="hover:text-accent">
                    Mensagens
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-white">Empresa</p>
              <ul className="mt-3 space-y-2 text-zinc-500">
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Preços
                  </a>
                </li>
                <li>
                  <span className="cursor-default">Privacidade (brevemente)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-12 border-t border-surface-border pt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} CoachBuilder. Interface demo — nenhum dado sai do teu browser.
        </p>
      </div>
    </footer>
  );
}
