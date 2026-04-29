import type { Player, Tactic, TacticMatch, TrainingSession } from "@/types";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { formationDisplayLabel } from "@/data/formations";
import { playerEligibleForTacticsSlot } from "@/lib/tactics-slot-positions";
import { aggregatePlayerInMatchList } from "@/lib/tactics-match-stats";

export type CoachNotesLineupSynthesisInput = {
  coachTrainingNotes: string;
  coachGeneralNotes: string;
  players: Player[];
  savedTactics: Tactic[];
  tacticMatches: TacticMatch[];
  periodStart: string;
  periodEnd: string;
  trainingSessionsInPeriod: TrainingSession[];
};

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function ymdKeyFromMatch(m: TacticMatch): string {
  const raw = (m.date ?? "").trim();
  if (!raw) return "";
  try {
    return calendarDayLisbon(raw);
  } catch {
    return raw.slice(0, 10);
  }
}

function inRange(day: string, start: string, end: string): boolean {
  return day.length >= 10 && day >= start && day <= end;
}

function filterMatchesByPeriod(matches: TacticMatch[], start: string, end: string): TacticMatch[] {
  return matches.filter((m) => inRange(ymdKeyFromMatch(m), start, end));
}

function findMentionedPlayers(note: string, players: Player[]): Player[] {
  const text = fold(note);
  if (text.length < 3) return [];
  const hits: Player[] = [];
  for (const p of players) {
    const name = fold(p.name.trim());
    if (name.length < 2) continue;
    if (text.includes(name)) {
      hits.push(p);
      continue;
    }
    const parts = name.split(/\s+/).filter((x) => x.length >= 3);
    const last = parts[parts.length - 1];
    if (last && text.includes(last)) hits.push(p);
  }
  const seen = new Set<string>();
  return hits.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function mostUsedTactic(
  periodMs: TacticMatch[],
  allMs: TacticMatch[],
  tactics: Tactic[]
): { tactic: Tactic; count: number } | null {
  const src = periodMs.length > 0 ? periodMs : allMs;
  const counts = new Map<string, number>();
  for (const m of src) {
    counts.set(m.tacticId, (counts.get(m.tacticId) ?? 0) + 1);
  }
  let best: { tactic: Tactic; count: number } | null = null;
  for (const t of tactics) {
    const c = counts.get(t.id) ?? 0;
    if (c > 0 && (!best || c > best.count)) best = { tactic: t, count: c };
  }
  return best;
}

function formScore(a: ReturnType<typeof aggregatePlayerInMatchList>): number {
  return a.goals * 4 + a.assists * 2 + a.wins * 3 + a.minutes / 30;
}

function rosterName(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

function trainingMentions(sessions: TrainingSession[], player: Player): number {
  const full = fold(player.name);
  const parts = fold(player.name.trim())
    .split(/\s+/)
    .filter((x) => x.length >= 3);
  const last = parts[parts.length - 1] ?? "";
  let n = 0;
  for (const s of sessions) {
    const blob = fold(`${s.title} ${s.description}`);
    if (blob.includes(full) || (last && blob.includes(last))) n++;
  }
  return n;
}

/**
 * Texto (pt-PT) que cruza notas livres do treinador com jogos do período, tática mais usada e concorrentes na mesma posição.
 * Sem chamadas externas de IA — só dados já guardados na app.
 */
export function buildCoachNotesLineupSynthesisPt(input: CoachNotesLineupSynthesisInput): string {
  const combined = [input.coachTrainingNotes, input.coachGeneralNotes]
    .map((x) => x.trim())
    .filter(Boolean)
    .join("\n");
  if (!combined) return "";

  const mentioned = findMentionedPlayers(combined, input.players);
  const pm = filterMatchesByPeriod(input.tacticMatches, input.periodStart, input.periodEnd);
  const mu = mostUsedTactic(pm, input.tacticMatches, input.savedTactics);

  const lines: string[] = [];
  lines.push(
    "Síntese a partir das tuas notas (indicativo — cruza sempre com o teu critério e com o que viste em treino):"
  );

  if (mentioned.length === 0) {
    lines.push(
      "Não identifiquei nomes do plantel no texto das notas. Para cruzar com jogos, tática e posições, inclui o nome ou apelido (≥3 letras) tal como está no plantel."
    );
    if (mu) {
      lines.push(
        `Tática mais utilizada ${pm.length > 0 ? "neste período" : "nos jogos registados"}: «${mu.tactic.name}» (${formationDisplayLabel(mu.tactic.formation)}), ${mu.count} jogos.`
      );
    }
    return lines.join("\n");
  }

  const worryTone = /\b(fraco|fraca|fracos|fracas|\bmal\b|má\b|insuficiente|queixa|problema|alerta|abaixo\s+do|pior)\b/i.test(
    combined
  );

  const take = mentioned.slice(0, 2);
  for (const target of take) {
    lines.push("");
    lines.push(`— ${target.name}`);
    if (worryTone) {
      lines.push(
        "  Possível leitura da nota: quebra de forma, intensidade ou envolvimento nos treinos/jogos — vias típicas: ajustar carga e exercício, conversa individual sobre papel, ou clarificar critérios de minutos (valida com os números abaixo)."
      );
    }
    const agg = aggregatePlayerInMatchList(pm, target.id);
    lines.push(
      `  Nos jogos do período (${input.periodStart} a ${input.periodEnd}): ${agg.games} jogos com linha de estatísticas, ${agg.goals} golos, ${agg.assists} assistências, ${agg.minutes} min, ${agg.wins}V ${agg.draws}E ${agg.losses}D.`
    );

    const trainN = trainingMentions(input.trainingSessionsInPeriod, target);
    if (input.trainingSessionsInPeriod.length > 0) {
      lines.push(
        `  Treinos registados no período: ${input.trainingSessionsInPeriod.length} sessões; ${trainN} com título ou descrição que menciona o nome (pesquisa simples por texto).`
      );
    }

    if (!mu) {
      lines.push(
        "  Não há tática guardada com jogos associados para comparar o 11 — guarda a formação em Táticas e associa cada jogo a uma tática."
      );
      continue;
    }

    const T = mu.tactic;
    lines.push(
      `  Tática de referência (mais jogos ${pm.length > 0 ? "no período" : "registados"}): «${T.name}» (${formationDisplayLabel(T.formation)}), ${mu.count} jogos.`
    );

    const onBoard = T.players.find((s) => s.playerId === target.id);
    let slot = onBoard ?? null;
    if (!slot) {
      const eligible = T.players.filter((s) => playerEligibleForTacticsSlot(s.formationLabel, target));
      slot = eligible.find((s) => s.playerId && s.playerId !== target.id) ?? eligible[0] ?? null;
    }

    if (!slot) {
      lines.push(
        "  Não encontrei um lugar na grelha desta tática compatível com as posições deste jogador no plantel."
      );
      continue;
    }

    const slotLabel = slot.formationLabel;
    const incumbentId = slot.playerId;
    const isStarterOnCard = Boolean(onBoard && incumbentId === target.id);

    if (isStarterOnCard) {
      lines.push(`  Nos 11 guardados desta tática ocupa o lugar «${slotLabel}» (titular na ficha).`);
    } else if (incumbentId) {
      lines.push(
        `  Para o lugar «${slotLabel}», o titular na ficha é ${rosterName(input.players, incumbentId)}. Este jogador não está nesse lugar nos 11 guardados (pode estar noutro lugar ou fora dos 11).`
      );
    } else {
      lines.push(
        `  O lugar «${slotLabel}» na ficha está vazio — preenche o 11 em Táticas para comparar titulares.`
      );
    }

    const peers = input.players.filter(
      (p) => p.id !== target.id && playerEligibleForTacticsSlot(slotLabel, p)
    );
    const peerStats = peers
      .map((p) => ({ p, a: aggregatePlayerInMatchList(pm, p.id) }))
      .filter((x) => x.a.games > 0)
      .sort((x, y) => formScore(y.a) - formScore(x.a));
    const topPeer = peerStats[0];
    if (peerStats.length > 0) {
      lines.push(
        `  Na mesma função (lugar «${slotLabel}»), outros com registo no período: ${peerStats
          .slice(0, 3)
          .map(({ p, a }) => `${p.name} (${a.goals}G ${a.assists}A, ${a.minutes}m)`)
          .join("; ")}.`
      );
    }

    if (incumbentId && incumbentId !== target.id) {
      const incAgg = aggregatePlayerInMatchList(pm, incumbentId);
      const diff = formScore(agg) - formScore(incAgg);
      if (agg.games === 0 && incAgg.games >= 1) {
        lines.push(
          `  Leitura para o 11: o titular da ficha tem dados no período (${incAgg.games} jogos) e este jogador não — se a nota reflecte forma ou envolvimento, pode fazer sentido trabalhar minutos no grupo; se é opção puramente táctica, valida com treinos e adversário.`
        );
      } else if (diff > 1.5) {
        lines.push(
          `  Leitura para o 11: indicadores desta janela (golos, assistências, vitórias em que jogou, minutos) favorecem ${target.name} face a ${rosterName(input.players, incumbentId)} — pode fazer sentido dar entrada ou titularidade, desde que encaixe no plano e na função «${slotLabel}».`
        );
      } else if (diff < -1.5) {
        lines.push(
          `  Leitura para o 11: os números do período beneficiam mais ${rosterName(input.players, incumbentId)} do que ${target.name} — titularizar este jogador só faria sentido por contexto (descanso, lesão, opção táctica) que não está nos dados objectivos.`
        );
      } else {
        lines.push(
          `  Leitura para o 11: desempenho objectivo no período é semelhante entre ambos — a decisão fica ao critério táctico, treinos e adversário.`
        );
      }
    } else if (isStarterOnCard && topPeer && topPeer.p.id !== target.id && formScore(topPeer.a) > formScore(agg) + 1.5) {
      lines.push(
        `  Leitura para o 11: ${topPeer.p.name} está com números melhores no período na mesma função — podes avaliar rotação se a nota aponta quebra de forma ou carga.`
      );
    } else if (isStarterOnCard) {
      lines.push(
        `  Leitura para o 11: como titular na ficha, os dados desta janela não apontam claramente para substituição imediata só por estatística.`
      );
    }
  }

  return lines.join("\n");
}
