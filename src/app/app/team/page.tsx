"use client";

import { useEffect, useMemo, useState } from "react";
import type { Position, TeamDoubleRoleId, TeamSingleRoleId } from "@/types";
import { PlayerCard } from "@/components/team/PlayerCard";
import { AddPlayerModal } from "@/components/players/AddPlayerModal";
import { PlayerDetailModal } from "@/components/players/PlayerDetailModal";
import { AddStaffModal } from "@/components/team/AddStaffModal";
import { StaffDetailModal } from "@/components/team/StaffDetailModal";
import { TeamCallupPanel } from "@/components/team/TeamCallupPanel";
import { playerHasPosition, sortSquadRoster, type SquadSortBy } from "@/lib/player-positions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/contexts/AppDataContext";
import { useLanguage } from "@/contexts/LanguageContext";

const positions: (Position | "all")[] = [
  "all",
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

const SORT_OPTIONS: { id: SquadSortBy; label: string }[] = [
  { id: "number", label: "Team number" },
  { id: "position", label: "Position" },
  { id: "name", label: "Name" },
];

const SINGLE_ROLE_LABELS: Array<{ id: TeamSingleRoleId; label: string }> = [
  { id: "captain", label: "Capitão" },
  { id: "viceCaptain", label: "Sub Capitão" },
  { id: "thirdCaptain", label: "3º Capitão" },
  { id: "fourthCaptain", label: "4º Capitão" },
];

const DOUBLE_ROLE_LABELS: Array<{ id: TeamDoubleRoleId; label: string }> = [
  { id: "penalties", label: "Penáltis" },
  { id: "freeKickRight", label: "Livre do lado direito" },
  { id: "freeKickLeft", label: "Livre do lado esquerdo" },
  { id: "cornerRight", label: "Canto do lado direito" },
  { id: "cornerLeft", label: "Canto do lado esquerdo" },
];

const YELLOW_CARD_RISK_COUNTS = new Set([4, 7, 10, 13, 16]);

export default function TeamPage() {
  const {
    players,
    staff,
    teamRoles,
    setTeamSingleRole,
    setTeamDoubleRole,
    addPlayer,
    removePlayer,
    updatePlayer,
    addStaff,
    updateStaff,
    removeStaff,
    tacticMatches,
  } = useAppData();
  const { language } = useLanguage();
  const isPt = language === "pt-PT";
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "all">("all");
  const [sortBy, setSortBy] = useState<SquadSortBy>("number");
  const [tab, setTab] = useState<"players" | "staff" | "roles" | "data" | "callup">("players");
  const [dataSort, setDataSort] = useState<{
    key:
      | "name"
      | "games"
      | "goals"
      | "assists"
      | "yellowCards"
      | "redCards"
      | "minutes"
      | "wins"
      | "draws"
      | "losses"
      | "winRate";
    dir: "asc" | "desc";
  }>({ key: "games", dir: "desc" });
  const [cellColors, setCellColors] = useState<Record<string, "white" | "red" | "yellow" | "green">>({});
  const [colorPickerCell, setColorPickerCell] = useState<{ playerId: string; statKey: string } | null>(null);
  const [yellowCardRiskCell, setYellowCardRiskCell] = useState<{ playerId: string; statKey: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailStaffId, setDetailStaffId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);

  const detailPlayer = useMemo(() => players.find((p) => p.id === detailId) ?? null, [players, detailId]);
  const detailStaff = useMemo(() => staff.find((s) => s.id === detailStaffId) ?? null, [staff, detailStaffId]);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchQ =
        q.trim() === "" || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.number).includes(q);
      const matchP = pos === "all" || playerHasPosition(p, pos);
      return matchQ && matchP;
    });
  }, [players, q, pos]);

  const sortedFiltered = useMemo(() => sortSquadRoster(filtered, sortBy), [filtered, sortBy]);
  const sortedAllPlayers = useMemo(() => sortSquadRoster(players, "position"), [players]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("team-data-cell-colors-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, "white" | "red" | "yellow" | "green">;
      if (parsed && typeof parsed === "object") setCellColors(parsed);
    } catch {
      // ignore invalid stored colors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("team-data-cell-colors-v1", JSON.stringify(cellColors));
    } catch {
      // ignore save errors
    }
  }, [cellColors]);

  const playerDataRows = useMemo(() => {
    const byId = new Map<
      string,
      {
        games: number;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        minutes: number;
        wins: number;
        draws: number;
        losses: number;
      }
    >();
    for (const m of tacticMatches) {
      for (const line of m.playerStats) {
        const row = byId.get(line.playerId) ?? {
          games: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutes: 0,
          wins: 0,
          draws: 0,
          losses: 0,
        };
        row.games += 1;
        row.goals += line.goals;
        row.assists += line.assists;
        row.yellowCards += line.yellowCards;
        row.redCards += line.redCards;
        row.minutes += line.minutesPlayed;
        if (m.outcome === "win") row.wins += 1;
        else if (m.outcome === "draw") row.draws += 1;
        else row.losses += 1;
        byId.set(line.playerId, row);
      }
    }
    const baseRows = sortSquadRoster(players, "number").map((p) => ({
      player: p,
      stats: byId.get(p.id) ?? {
        games: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      },
    }));
    const sorted = [...baseRows].sort((a, b) => {
      const mult = dataSort.dir === "asc" ? 1 : -1;
      if (dataSort.key === "name") {
        return a.player.name.localeCompare(b.player.name, "pt") * mult;
      }
      if (dataSort.key === "winRate") {
        const av = a.stats.games > 0 ? Math.round((a.stats.wins / a.stats.games) * 100) : 0;
        const bv = b.stats.games > 0 ? Math.round((b.stats.wins / b.stats.games) * 100) : 0;
        if (av !== bv) return (av - bv) * mult;
        return a.player.name.localeCompare(b.player.name, "pt");
      }
      const av = a.stats[dataSort.key];
      const bv = b.stats[dataSort.key];
      if (av !== bv) return (av - bv) * mult;
      return a.player.name.localeCompare(b.player.name, "pt");
    });
    return sorted;
  }, [players, tacticMatches, dataSort]);

  const headerButtonClass =
    "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-white/5";

  const colorClass = (color: "white" | "red" | "yellow" | "green" | undefined) => {
    if (color === "red") return "text-red-400";
    if (color === "yellow") return "text-amber-300";
    if (color === "green") return "text-emerald-300";
    return "text-zinc-300";
  };

  const setSortKey = (key: typeof dataSort.key) => {
    setDataSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }
    );
  };

  const handleAddPlayer = (input: Parameters<typeof addPlayer>[0]) => {
    addPlayer(input);
    setSortBy("number");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddPlayer} />
      <AddStaffModal open={addStaffOpen} onClose={() => setAddStaffOpen(false)} onSave={addStaff} />
      <PlayerDetailModal
        player={detailPlayer}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        onSave={(id, patch) => updatePlayer(id, patch)}
        onRemove={(id) => {
          removePlayer(id);
          setDetailId(null);
        }}
      />
      <StaffDetailModal
        member={detailStaff}
        open={detailStaffId != null}
        onClose={() => setDetailStaffId(null)}
        onSave={(id, patch) => updateStaff(id, patch)}
        onRemove={(id) => {
          removeStaff(id);
          setDetailStaffId(null);
        }}
      />

      <div className="print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Squad roster</h2>
          <p className="text-sm text-zinc-500">
            {isPt
              ? `${players.length} jogador${players.length !== 1 ? "es" : ""} · ${staff.length} staff · mesma lista em toda a app (táticas, treino, mensagens).`
              : `${players.length} player${players.length !== 1 ? "s" : ""} · ${staff.length} staff · same list everywhere you pick names (tactics, training, messages).`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {tab === "players" ? (
            <Input
              placeholder={isPt ? "Procurar jogadores…" : "Search players…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="sm:w-56"
            />
          ) : null}
          {tab !== "callup" ? (
            <>
              <Button type="button" onClick={() => setAddOpen(true)}>
                {isPt ? "Adicionar jogador" : "Add player"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setAddStaffOpen(true)}>
                {isPt ? "Adicionar staff" : "Add staff"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-1">
        <button
          type="button"
          onClick={() => setTab("players")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "players" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Jogadores
        </button>
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "staff" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Staff
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "roles" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Funções
        </button>
        <button
          type="button"
          onClick={() => setTab("data")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "data" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Dados
        </button>
        <button
          type="button"
          onClick={() => setTab("callup")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "callup" ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Convocatória
        </button>
      </div>
      </div>

      {tab === "players" ? (
        <div className="print:hidden">
        <>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {isPt ? "Filtrar por posição" : "Filter by position"}
              </p>
              <div className="flex flex-wrap gap-2">
                {positions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPos(p)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                      pos === p ? "bg-accent/15 text-accent" : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p === "all" ? (isPt ? "Todas as posições" : "All positions") : p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {isPt ? "Ordenar por" : "Sort by"}
              </p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortBy === s.id
                        ? "bg-sky-500/15 text-sky-300"
                        : "bg-surface-raised text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {isPt
                  ? "Ordem: GK → CB → LB → RB → CDM → CM → CAM → LW → RW → ST. Jogadores multi-posição são ordenados pela primeira posição dessa lista."
                  : "Position order: GK → CB → LB → RB → CDM → CM → CAM → LW → RW → ST. Multi-position players sort by their earliest role in that list."}
              </p>
            </div>
          </div>
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-white">Jogadores</h3>
            </div>
            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border p-12 text-center">
                <p className="text-zinc-400">{isPt ? "Ainda sem jogadores." : "No players yet."}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  {isPt
                    ? "Adiciona o plantel — ficará disponível nas táticas, treino e chat."
                    : "Add your squad — they’ll be available on tactics, training, and chat."}
                </p>
                <Button type="button" className="mt-6" onClick={() => setAddOpen(true)}>
                  {isPt ? "Adicionar primeiro jogador" : "Add your first player"}
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border p-12 text-center text-zinc-500">
                {isPt ? "Nenhum jogador corresponde aos filtros." : "No players match your filters."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedFiltered.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    roleBadge={
                      teamRoles.captain === player.id ? "C" : teamRoles.viceCaptain === player.id ? "SC" : null
                    }
                    onOpen={() => setDetailId(player.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
        </div>
      ) : null}

      {tab === "staff" ? (
        <section className="space-y-4 print:hidden">
          <div className="flex items-end justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-white">Staff</h3>
          </div>
          {staff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-zinc-500">
              {isPt ? "Ainda não adicionaste membros de staff." : "No staff members added yet."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((member) => (
                <article key={member.id} className="rounded-2xl border border-surface-border bg-surface-raised/50 p-4">
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">{member.role}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {member.dateOfBirth
                      ? isPt
                        ? `Nascimento: ${member.dateOfBirth}`
                        : `Birth date: ${member.dateOfBirth}`
                      : isPt
                        ? "Sem data de nascimento"
                        : "No birth date"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setDetailStaffId(member.id)}>
                      {isPt ? "Abrir" : "Open"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => removeStaff(member.id)}
                    >
                      {isPt ? "Remover" : "Remove"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "callup" ? <TeamCallupPanel /> : null}

      {tab === "data" ? (
        <section className="space-y-4 print:hidden">
          <div>
            <h3 className="font-display text-base font-semibold text-white">Dados dos jogadores</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Tracking automático por jogador a partir dos jogos registados nas Táticas.
            </p>
          </div>
          {players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-zinc-500">
              {isPt ? "Ainda sem jogadores para mostrar dados." : "No players yet to display data."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-surface-border">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-zinc-900/50 text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2 font-medium">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("name")}>
                        Jogador
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("games")}>
                        Jogos
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("goals")}>
                        Golos
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("assists")}>
                        Assist.
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("yellowCards")}>
                        Amarelos
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("redCards")}>
                        Vermelhos
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("minutes")}>
                        Minutos
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("wins")}>
                        Vitórias
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("draws")}>
                        Empates
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("losses")}>
                        Derrotas
                      </button>
                    </th>
                    <th className="px-2 py-2 font-medium text-center">
                      <button type="button" className={headerButtonClass} onClick={() => setSortKey("winRate")}>
                        % Vitória
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {playerDataRows.map(({ player, stats }) => (
                    <tr key={player.id} className="border-b border-surface-border/60 last:border-0">
                      <td className="px-2 py-2 text-zinc-200">
                        #{player.number} {player.name}
                      </td>
                      {(
                        [
                          ["games", stats.games],
                          ["goals", stats.goals],
                          ["assists", stats.assists],
                          ["yellowCards", stats.yellowCards],
                          ["redCards", stats.redCards],
                          ["minutes", stats.minutes],
                          ["wins", stats.wins],
                          ["draws", stats.draws],
                          ["losses", stats.losses],
                          ["winRate", stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0],
                        ] as const
                      ).map(([statKey, value]) => {
                        const color = cellColors[`${player.id}:${statKey}`];
                        const isYellowCards = statKey === "yellowCards";
                        const isYellowRisk = isYellowCards && YELLOW_CARD_RISK_COUNTS.has(Number(value));
                        return (
                          <td key={`${player.id}-${statKey}`} className="relative px-2 py-2 text-center tabular-nums">
                            {isYellowCards ? (
                              isYellowRisk ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setYellowCardRiskCell((prev) =>
                                      prev?.playerId === player.id && prev.statKey === statKey
                                        ? null
                                        : { playerId: player.id, statKey }
                                    )
                                  }
                                  className="rounded px-1 font-semibold text-amber-300 hover:text-amber-200"
                                  title="Risco de suspensão por acumulação de amarelos"
                                >
                                  {value}
                                </button>
                              ) : (
                                <span className="rounded px-1 text-zinc-300">{value}</span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setColorPickerCell({ playerId: player.id, statKey })}
                                className={`rounded px-1 ${colorClass(color)}`}
                              >
                                {statKey === "winRate" ? `${value}%` : value}
                              </button>
                            )}
                            {colorPickerCell?.playerId === player.id && colorPickerCell.statKey === statKey ? (
                              <div className="absolute right-1 top-full z-20 mt-1 flex gap-1 rounded-lg border border-surface-border bg-zinc-950 p-1">
                                {(
                                  [
                                    ["white", "Branco"],
                                    ["red", "Vermelho"],
                                    ["yellow", "Amarelo"],
                                    ["green", "Verde"],
                                  ] as const
                                ).map(([c, label]) => (
                                  <button
                                    key={`${player.id}-${statKey}-${c}`}
                                    type="button"
                                    title={label}
                                    className={`h-5 w-5 rounded-full border ${
                                      c === "white"
                                        ? "border-zinc-400 bg-white"
                                        : c === "red"
                                          ? "border-red-500 bg-red-500"
                                          : c === "yellow"
                                            ? "border-amber-400 bg-amber-400"
                                            : "border-emerald-500 bg-emerald-500"
                                    }`}
                                    onClick={() => {
                                      setCellColors((prev) => ({ ...prev, [`${player.id}:${statKey}`]: c }));
                                      setColorPickerCell(null);
                                    }}
                                  />
                                ))}
                              </div>
                            ) : null}
                            {yellowCardRiskCell?.playerId === player.id && yellowCardRiskCell.statKey === statKey ? (
                              <div className="absolute right-1 top-full z-20 mt-1 w-64 rounded-lg border border-amber-400/40 bg-zinc-950 p-2 text-left text-[11px] leading-relaxed text-amber-200">
                                Risco de falhar o próximo jogo por acumulação de amarelos. Caso leve amarelo falha o
                                próximo jogo.
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "roles" ? (
        <section className="space-y-6 print:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-surface-border bg-surface-raised/50 p-4">
              <h3 className="font-display text-base font-semibold text-white">{isPt ? "Capitania" : "Captaincy"}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {isPt ? "Escolhe um jogador para cada função." : "Choose one player for each role."}
              </p>
              <div className="mt-4 space-y-4">
                {SINGLE_ROLE_LABELS.map((role) => (
                  <label key={role.id} className="block space-y-1">
                    <span className="text-sm text-zinc-300">{role.label}</span>
                    <select
                      value={teamRoles[role.id] ?? ""}
                      onChange={(e) => setTeamSingleRole(role.id, e.target.value || null)}
                      className="h-10 w-full rounded-xl border border-surface-border bg-surface px-3 text-sm text-zinc-200"
                    >
                      <option value="">{isPt ? "Sem jogador" : "No player"}</option>
                      {sortedAllPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-surface-border bg-surface-raised/50 p-4">
              <h3 className="font-display text-base font-semibold text-white">{isPt ? "Bolas paradas" : "Set pieces"}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {isPt ? "Podes escolher até 2 jogadores por função." : "You can choose up to 2 players per role."}
              </p>
              <div className="mt-4 space-y-4">
                {DOUBLE_ROLE_LABELS.map((role) => (
                  <div key={role.id} className="space-y-2">
                    <span className="text-sm text-zinc-300">{role.label}</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[0, 1].map((slot) => {
                        const chosen = teamRoles[role.id][slot] ?? "";
                        return (
                          <select
                            key={`${role.id}-${slot}`}
                            value={chosen}
                            onChange={(e) => {
                              const next = [...teamRoles[role.id]];
                              next[slot] = e.target.value;
                              const cleaned = next.filter(Boolean).filter((pid, i, arr) => arr.indexOf(pid) === i);
                              setTeamDoubleRole(role.id, cleaned);
                            }}
                            className="h-10 w-full rounded-xl border border-surface-border bg-surface px-3 text-sm text-zinc-200"
                          >
                            <option value="">{isPt ? "Sem jogador" : "No player"}</option>
                            {sortedAllPlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                #{p.number} {p.name}
                              </option>
                            ))}
                          </select>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

    </div>
  );
}
