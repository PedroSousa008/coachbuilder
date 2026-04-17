"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formationDisplayLabel } from "@/data/formations";
import { tallyForTactic } from "@/lib/tactics-match-stats";
import {
  coachClubLabel,
  recentLeagueMatchesForTeams,
  serializePlayersForAi,
  tableRowsForTeams,
  upcomingFixturesSorted,
} from "@/lib/opponent-analysis-context";
import { openPrintableHtml } from "@/lib/training-print-html";

export function SketchOpponentAnalysisPanel() {
  const {
    players,
    fixtures,
    coachProfile,
    savedTactics,
    tacticMatches,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
  } = useAppData();

  const upcoming = useMemo(() => upcomingFixturesSorted(fixtures), [fixtures]);
  const [fixtureId, setFixtureId] = useState<string>("");

  useEffect(() => {
    if (fixtureId) return;
    const first = upcoming[0]?.id;
    if (first) setFixtureId(first);
  }, [fixtureId, upcoming]);

  const selectedFixture = useMemo(
    () => upcoming.find((f) => f.id === fixtureId) ?? upcoming[0] ?? null,
    [upcoming, fixtureId]
  );

  const defaultAvailable = useMemo(() => {
    const s = new Set<string>();
    for (const p of players) {
      if (p.availability !== "out") s.add(p.id);
    }
    if (s.size === 0 && players.length) players.forEach((p) => s.add(p.id));
    return s;
  }, [players]);

  const [availableIds, setAvailableIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setAvailableIds(new Set(defaultAvailable));
  }, [defaultAvailable]);

  const togglePlayer = useCallback((id: string, on: boolean) => {
    setAvailableIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const buildPayload = useCallback(() => {
    if (!selectedFixture) return null;
    const club = coachClubLabel(coachProfile);
    const availablePlayers = serializePlayersForAi(players, availableIds);
    const tacticById = new Map(savedTactics.map((t) => [t.id, t] as const));
    const tacticsSummarized = savedTactics.map((t) => {
      const tally = tallyForTactic(tacticMatches, t.id);
      return {
        id: t.id,
        name: t.name,
        formation: formationDisplayLabel(t.formation),
        wins: tally.wins,
        draws: tally.draws,
        losses: tally.losses,
        matches: tally.matchesUsed,
      };
    });
    const tacticMatchesRecent = [...tacticMatches]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 40)
      .map((m) => {
        const t = tacticById.get(m.tacticId);
        return {
          tacticName: t?.name ?? "Tática",
          formation: t ? formationDisplayLabel(t.formation) : "—",
          opponent: m.opponent,
          outcome: m.outcome,
          date: m.date,
          teamGoals: m.teamGoals,
          opponentGoals: m.opponentGoals,
        };
      });
    const { ours, theirs } = recentLeagueMatchesForTeams(leagueMatches, club, selectedFixture.opponent, 14);
    const leagueRowsSample = tableRowsForTeams(leagueTableRows, club, selectedFixture.opponent).slice(0, 20);

    return {
      coachName: coachProfile.name?.trim() || "Treinador",
      coachClub: club,
      fixture: selectedFixture,
      availablePlayers,
      tacticsSummarized,
      tacticMatchesRecent,
      leagueRowsSample,
      leagueMatchesOurs: ours.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoff: m.kickoff,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
      leagueMatchesTheirs: theirs.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoff: m.kickoff,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
      competitionName: leagueCompetitionName,
    };
  }, [
    availableIds,
    coachProfile,
    leagueCompetitionName,
    leagueMatches,
    leagueTableRows,
    players,
    savedTactics,
    selectedFixture,
    tacticMatches,
  ]);

  const onGenerate = useCallback(async () => {
    setErr(null);
    const payload = buildPayload();
    if (!payload) {
      setErr("Adiciona um próximo jogo em Equipa / Calendário para seleccionar o adversário.");
      return;
    }
    if (payload.availablePlayers.length < 11) {
      setErr("Selecciona pelo menos 11 jogadores disponíveis (convocados).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sketch/opponent-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { html?: string; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Não foi possível gerar o relatório.");
        return;
      }
      if (!data.html) {
        setErr("Resposta inválida do servidor.");
        return;
      }
      openPrintableHtml(data.html);
    } catch {
      setErr("Erro de rede ao gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  const convokedCount = availableIds.size;

  return (
    <div className="no-print space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.75} />
            Análise Adversário AI
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Gera um documento para impressão / PDF com probabilidade de vitória, tendência de golos, plano de jogo, 11
            sugerido e papéis (capitão, penáltis, …). Os jogadores <strong>não</strong> marcados como disponíveis ficam
            de fora da análise; a IA usa as qualidades individuais para alternativas quando faz sentido.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {players.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Adiciona jogadores na secção{" "}
              <Link className="text-accent underline hover:text-white" href="/app/team">
                Equipa
              </Link>{" "}
              para usar esta ferramenta.
            </p>
          ) : null}
          {upcoming.length === 0 ? (
            <p className="text-sm text-amber-200/90">
              Não há jogos futuros na lista de calendário. Adiciona o próximo adversário em{" "}
              <Link className="underline hover:text-white" href="/app/team">
                Equipa
              </Link>{" "}
              (jogos) ou cria um evento ligado a um jogo no Sketch Calendar.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Próximo adversário</label>
              <select
                className="h-10 w-full max-w-xl rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-zinc-200"
                value={selectedFixture?.id ?? ""}
                onChange={(e) => setFixtureId(e.target.value)}
              >
                {upcoming.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.opponent} · {f.competition} · {new Date(f.kickoff).toLocaleString("pt-PT")} (
                    {f.venue === "home" ? "Casa" : "Fora"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-200">Jogadores disponíveis (convocados)</p>
              <Badge variant="muted">
                {convokedCount} / {players.length}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Desmarca quem não vai a jogo. A análise e o 11 inicial usam apenas estes jogadores. Importa a classificação
              / resultados na secção da liga para enriquecer golos e forma.
            </p>
            <div className="max-h-[min(52vh,420px)] overflow-auto rounded-xl border border-surface-border bg-black/20 p-2">
              <ul className="grid gap-1 sm:grid-cols-2">
                {players.map((p) => {
                  const on = availableIds.has(p.id);
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => togglePlayer(p.id, e.target.checked)}
                          className="rounded border-surface-border"
                        />
                        <span className="text-zinc-200">
                          {p.name}{" "}
                          <span className="text-zinc-500">
                            #{p.number} · {p.position}
                            {p.availability === "out" ? " · fora" : p.availability === "doubt" ? " · dúvida" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {err ? <p className="text-sm text-red-400">{err}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onGenerate} disabled={loading || !selectedFixture || convokedCount < 11}>
              {loading ? "A gerar…" : "Gerar documento (PDF)"}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Usa <strong>Gemini</strong> com <strong>Google Search</strong> (pesquisa automática na Web). Configura{" "}
            <code className="text-zinc-400">GEMINI_API_KEY</code> no servidor (ex.:{" "}
            <a
              className="text-accent underline hover:text-white"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Google AI Studio
            </a>
            ). Opcional: <code className="text-zinc-400">GEMINI_OPPONENT_ANALYSIS_MODEL</code> (ex.: gemini-2.0-flash).
            Alternativa: <code className="text-zinc-400">GOOGLE_GEMINI_API_KEY</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
