import Link from "next/link";
import { getTrainingCatalogExerciseCount } from "@/lib/training-session-local";
import {
  GitBranch,
  CalendarDays,
  MessageSquare,
  PenSquare,
  Users,
  Trophy,
  Zap,
  ArrowRight,
} from "lucide-react";
import { LandingNav } from "@/components/marketing/LandingNav";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PricingCard } from "@/components/marketing/PricingCard";

export default function LandingPage() {
  const trainingCatalogExerciseCount = getTrainingCatalogExerciseCount();

  return (
    <>
      <LandingNav />
      <main>
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Feito para linhas laterais e campos reais
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Planeia melhor. Treina melhor.{" "}
              <span className="text-accent">Comunica mais rápido.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              O CoachBuilder é o teu espaço de trabalho de nível profissional para formações, planeamento de sessões,
              chat de equipa e sketch diário — para passares menos tempo em folhas de cálculo e mais tempo a ganhar
              jogos.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-semibold text-zinc-950 transition-colors hover:bg-accent-muted"
              >
                Começar grátis
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-600 px-6 text-base font-medium text-zinc-200 transition-colors hover:border-accent/40 hover:text-white"
              >
                Iniciar sessão
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Exercícios no catálogo",
                  value: String(trainingCatalogExerciseCount),
                },
                { label: "Táticas guardadas", value: "12" },
                { label: "Tempo médio para partilhar o onze", value: "< 2 min" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-surface-border bg-surface-raised/40 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-surface-border bg-[#0c1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Tudo o que precisas entre jogos
              </h2>
              <p className="mt-4 text-zinc-400">
                Uma interface clara para a forma como as equipas técnicas realmente trabalham: visual limpo, mensagens
                rápidas e preparação estruturada — dos sub-15 ao futebol sénior.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={GitBranch}
                title="Quadro tático"
                description="Guarda formações, notas do adversário e gatilhos de jogo. Arrasta jogadores num campo com a sensação do teu caderno — só que mais rápido."
              />
              <FeatureCard
                icon={CalendarDays}
                title="Microciclo de treino"
                description="Organiza rondos, blocos de pressão e circuitos de finalização ao longo da semana com intensidade e duração visíveis num relance."
              />
              <FeatureCard
                icon={MessageSquare}
                title="Mensagens da equipa"
                description="Canal de grupo para anúncios e mensagens diretas para detalhe individual — comunicação profissional e fácil de consultar."
              />
              <FeatureCard
                icon={PenSquare}
                title="Sketch Area"
                description="Planeia o dia, escreve notas, tarefas, ficheiros, sketches táticos e watchlist de jogadores — o teu espaço privado de staff sem sair da app."
              />
              <FeatureCard
                icon={Users}
                title="Plantel e disponibilidade"
                description="Posições, minutos e estado para o jogo num único plantel pensado para decisões de treinador — não para estatísticas de fantasia."
              />
              <FeatureCard
                icon={Trophy}
                title="Hábitos de performance"
                description="Acompanha que ideias táticas realmente ganham minutos e a que sessões o teu grupo responde melhor."
              />
            </div>
          </div>
        </section>

        <section id="win" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <Zap className="h-3.5 w-3.5" />
                  Porque as equipas técnicas mudam
                </div>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ganha mais duelos nos detalhes
                </h2>
                <ul className="mt-8 space-y-5 text-zinc-400">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Linguagem alinhada:</strong> toda a gente vê a mesma estrutura,
                      os mesmos gatilhos de pressão e as mesmas funções de bola parada — antes de entrares no balneário.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Feedback mais rápido:</strong> aponta uma nota, cria um lembrete,
                      desenha um padrão — sem perder contexto em cinco apps diferentes.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      <strong className="text-zinc-200">Respeito pelo teu tempo:</strong> menos notas dispersas, melhores
                      passagens de informação entre treinadores e histórico pronto a revisitar na próxima época.
                    </span>
                  </li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-3xl border border-surface-border bg-gradient-to-br from-surface-raised to-[#0a0d10] p-8 shadow-card">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Resumo de jogo
                </p>
                <p className="mt-4 text-2xl font-semibold text-white">Northbridge FC U19 vs Riverside Athletic</p>
                <p className="mt-2 text-sm text-zinc-500">Liga Regional Jovem · Casa</p>
                <div className="mt-8 space-y-4 border-t border-surface-border pt-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Tática ativa</span>
                    <span className="font-medium text-accent">4-3-3 com sobrecarga na largura</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Próxima sessão</span>
                    <span className="text-zinc-200">Gatilhos de pressão · Alto</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Mensagens por ler</span>
                    <span className="text-zinc-200">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-surface-border bg-[#0c1014] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Preços simples para treinadores sérios
              </h2>
              <p className="mt-4 text-zinc-400">
                Começa com mensagens grátis. Faz upgrade quando quiseres o banco completo: táticas, treino, sketch area
                e ferramentas de plantel por €6,99/mês (teste Pro de 7 dias no registo).
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2">
              <PricingCard
                name="Grátis"
                price="€0"
                description="Mantém o plantel ligado."
                features={["Chat de grupo da equipa", "Mensagens diretas", "Notificações básicas (brevemente)"]}
                ctaHref="/signup"
                ctaLabel="Criar conta grátis"
              />
              <PricingCard
                name="Coach Pro"
                price="€6.99"
                description="Sistema completo para a tua equipa técnica."
                features={[
                  "Tudo do plano Grátis",
                  "Quadro tático e ideias guardadas",
                  "Construtor de planos de treino",
                  "Sketch Area (notas, tarefas, ficheiros e quadro)",
                  "Vista de plantel, disponibilidade e performance",
                ]}
                highlighted
                ctaHref="/app/settings"
                ctaLabel="Fazer upgrade (demo)"
              />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-accent/20 bg-accent/5 px-8 py-10 sm:flex-row">
              <div>
                <h3 className="font-display text-xl font-semibold text-white">Pronto para a próxima semana de jogo?</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Cria uma conta com email e palavra-passe — os teus dados ficam guardados neste dispositivo.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-accent-muted"
              >
                Entrar no CoachBuilder
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
