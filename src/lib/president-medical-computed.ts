import type { PresidentExpense, PresidentInjury, PresidentMedicalInventoryItem, PresidentPlayer } from "@/types/president-club";

const MS_PER_DAY = 86400000;

export function isActiveInjury(i: PresidentInjury): boolean {
  return i.status !== "plenas_condicoes";
}

export function countAvailablePlayers(players: PresidentPlayer[]): number {
  return players.filter((p) => {
    const s = (p.injuryStatus ?? "").trim();
    return s !== "Indisponível" && s !== "Dúvida";
  }).length;
}

export function returningThisWeekCount(injuries: PresidentInjury[], now = new Date()): number {
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const endT = end.getTime();
  const startT = now.getTime();
  return injuries.filter((i) => {
    if (!isActiveInjury(i)) return false;
    const t = Date.parse(i.expectedReturn);
    if (!Number.isFinite(t)) return false;
    return t >= startT && t <= endT;
  }).length;
}

export function longTermInjuriesCount(injuries: PresidentInjury[]): number {
  return injuries.filter(
    (i) => isActiveInjury(i) && (i.severity === "longa_duracao" || i.severity === "grave" || i.status === "cirurgia")
  ).length;
}

export function medicalCostsThisMonthEUR(injuries: PresidentInjury[], expenses: PresidentExpense[], ym: string): number {
  let sum = injuries.reduce((s, i) => {
    if (!i.medicalCostEUR || i.medicalCostEUR <= 0) return s;
    const ref = (i.startDate && i.startDate.length >= 7 ? i.startDate : "").slice(0, 7);
    if (ref === ym.slice(0, 7)) return s + i.medicalCostEUR;
    return s;
  }, 0);
  sum += expenses
    .filter((e) => e.category === "saude" && e.dueDate && e.dueDate.startsWith(ym.slice(0, 7)))
    .reduce((s, e) => s + e.valueEUR, 0);
  return Math.round(sum * 100) / 100;
}

export function highestRiskTeamLabel(injuries: PresidentInjury[]): string {
  const active = injuries.filter(isActiveInjury);
  if (!active.length) return "—";
  const byTeam = new Map<string, number>();
  for (const i of active) {
    const t = (i.team ?? "").trim() || "Sem equipa";
    byTeam.set(t, (byTeam.get(t) ?? 0) + 1);
  }
  let best = "";
  let n = 0;
  for (const [t, c] of byTeam) {
    if (c > n) {
      n = c;
      best = t;
    }
  }
  return n > 0 ? `${best} (${n})` : "—";
}

export function injuriesByTeamChart(injuries: PresidentInjury[]): { label: string; value: number }[] {
  const active = injuries.filter(isActiveInjury);
  const m = new Map<string, number>();
  for (const i of active) {
    const t = (i.team ?? "").trim() || "—";
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value }));
}

export function injuriesByBodyChart(injuries: PresidentInjury[]): { label: string; value: number }[] {
  const active = injuries.filter(isActiveInjury);
  const m = new Map<string, number>();
  for (const i of active) {
    const b = (i.bodyArea ?? "").trim() || "—";
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value }));
}

export function monthlyInjuryTrend(injuries: PresidentInjury[]): { label: string; value: number }[] {
  const labels: string[] = [];
  const now = new Date();
  for (let k = 5; k >= 0; k -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return labels.map((ym) => ({
    label: ym.slice(5),
    value: injuries.filter((i) => (i.startDate ?? "").startsWith(ym)).length,
  }));
}

export type MedicalAlert = { id: string; level: "info" | "warning" | "danger"; text: string };

export function buildMedicalAlerts(
  injuries: PresidentInjury[],
  players: PresidentPlayer[],
  inventory: PresidentMedicalInventoryItem[]
): MedicalAlert[] {
  const out: MedicalAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const active = injuries.filter(isActiveInjury);

  for (const i of active) {
    if (i.expectedReturn && i.expectedReturn <= today && i.status !== "plenas_condicoes") {
      out.push({
        id: `ret-${i.id}`,
        level: "warning",
        text: `${i.playerName}: data de retorno prevista atingida — reavaliar.`,
      });
    }
    const ret = Date.parse(i.expectedReturn);
    if (Number.isFinite(ret)) {
      const days = Math.round((ret - Date.parse(today)) / MS_PER_DAY);
      if (days >= 0 && days <= 3) {
        out.push({
          id: `soon-${i.id}`,
          level: "info",
          text: `${i.playerName}: retorno previsto em ${days} dia(s).`,
        });
      }
    }
  }

  const byTeam = new Map<string, number>();
  for (const i of active) {
    const team = (i.team ?? "").trim() || "—";
    byTeam.set(team, (byTeam.get(team) ?? 0) + 1);
  }
  for (const [team, c] of byTeam) {
    if (c >= 4) {
      out.push({
        id: `spike-${team}`,
        level: "danger",
        text: `Muitas lesões activas na equipa «${team}» (${c}) — rever carga e disponibilidade.`,
      });
    }
  }

  const ham = active.filter((i) => /isquio|hamstring|posterior/i.test(`${i.injuryType} ${i.bodyArea}`));
  if (ham.length >= 2) {
    out.push({
      id: "ham-rec",
      level: "warning",
      text: "Vários casos ligados a isquiotibiais — considerar programa de prevenção.",
    });
  }

  for (const row of inventory) {
    if (row.stock <= row.minLevel) {
      out.push({
        id: `stock-${row.id}`,
        level: "warning",
        text: `Stock baixo: ${row.item} (${row.stock} ≤ mínimo ${row.minLevel}).`,
      });
    }
  }

  const seen = new Set<string>();
  return out.filter((a) => {
    if (seen.has(a.text)) return false;
    seen.add(a.text);
    return true;
  });
}
