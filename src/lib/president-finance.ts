import type { PresidentPayment, PresidentPaymentHistoryEntry, PresidentPlayer } from "@/types/president-club";

export const PAYMENT_METHOD_LABELS: Record<PresidentPayment["paymentMethod"], string> = {
  numerario: "Numerário",
  transferencia: "Transferência",
  mbway: "MB Way",
  cartao: "Cartão",
  outro: "Outro",
};

export function paymentMethodFromUnknown(v: unknown): PresidentPayment["paymentMethod"] {
  const s = typeof v === "string" ? v : "";
  if (s === "numerario" || s === "transferencia" || s === "mbway" || s === "cartao" || s === "outro") return s;
  return "transferencia";
}

/** Valor da quota após desconto (nunca negativo). */
export function paymentEffectiveEUR(p: Pick<PresidentPayment, "amountEUR" | "discountEUR">): number {
  const base = Number.isFinite(p.amountEUR) ? p.amountEUR : 0;
  const disc = Number.isFinite(p.discountEUR) ? p.discountEUR : 0;
  return Math.max(0, base - disc);
}

/** Próximo vencimento mensal (mantém o dia do mês quando possível). */
export function addCalendarMonths(isoDate: string, months: number): string {
  const parts = isoDate.split("-").map((x) => parseInt(x, 10));
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2] ?? 1;
  if (!Number.isFinite(y) || !Number.isFinite(m)) return isoDate;
  const dt = new Date(y, m - 1 + months, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function defaultQuotaDueDate(): string {
  const n = new Date();
  const today0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const y = n.getFullYear();
  const m = n.getMonth();
  const day = 5;
  let due = new Date(y, m, day);
  if (due.getTime() < today0.getTime()) {
    due = new Date(y, m + 1, day);
  }
  const yy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function emptyPaymentRow(
  base: Pick<PresidentPayment, "playerName"> &
    Partial<Pick<PresidentPayment, "playerSourceId" | "team" | "familyContact" | "coachEmail" | "coachTeamLabel">>
): Omit<PresidentPayment, "id"> {
  return {
    playerSourceId: base.playerSourceId,
    playerName: base.playerName,
    team: base.team ?? "",
    familyContact: base.familyContact ?? "",
    personalContact: "",
    status: "pendente",
    amountEUR: 0,
    discountEUR: 0,
    dueDate: defaultQuotaDueDate(),
    note: "",
    lastPaidAt: "",
    paymentMethod: "transferencia",
    archived: false,
    coachEmail: base.coachEmail ?? "",
    coachTeamLabel: base.coachTeamLabel ?? base.team ?? "",
    history: [],
  };
}

export function paymentFromPlayer(pl: PresidentPlayer): Omit<PresidentPayment, "id"> {
  return emptyPaymentRow({
    playerName: pl.name,
    playerSourceId: pl.id,
    team: pl.team || "—",
    familyContact: pl.familyContacts || "",
    coachEmail: pl.coachEmail ?? "",
    coachTeamLabel: pl.team || "",
  });
}

/** Meses em atraso (0 se pago ou ainda não venceu). */
export function monthsLateCount(p: Pick<PresidentPayment, "status" | "dueDate">, todayIso: string): number {
  if (p.status === "pago") return 0;
  if (!p.dueDate || p.dueDate.length < 10) return 0;
  if (p.dueDate >= todayIso) return 0;
  const [ty, tm, td] = todayIso.split("-").map((x) => parseInt(x, 10));
  const [dy, dm, dd] = p.dueDate.split("-").map((x) => parseInt(x, 10));
  if (![ty, tm, td, dy, dm, dd].every(Number.isFinite)) return 0;
  let months = (ty - dy) * 12 + (tm - dm);
  if (td < dd) months -= 1;
  return Math.max(0, months);
}

export function normalizePaymentRow(raw: Partial<PresidentPayment> & { id: string }): PresidentPayment {
  const historyArr = Array.isArray(raw.history)
    ? (raw.history as PresidentPaymentHistoryEntry[]).filter((h) => h && typeof h.id === "string")
    : [];
  return {
    id: raw.id,
    playerSourceId: typeof raw.playerSourceId === "string" ? raw.playerSourceId : undefined,
    playerName: typeof raw.playerName === "string" ? raw.playerName : "",
    team: typeof raw.team === "string" ? raw.team : "",
    familyContact: typeof raw.familyContact === "string" ? raw.familyContact : "",
    personalContact: typeof raw.personalContact === "string" ? raw.personalContact : "",
    status: raw.status === "pago" || raw.status === "pendente" || raw.status === "atrasado" ? raw.status : "pendente",
    amountEUR: typeof raw.amountEUR === "number" && Number.isFinite(raw.amountEUR) ? raw.amountEUR : 0,
    discountEUR: typeof raw.discountEUR === "number" && Number.isFinite(raw.discountEUR) ? raw.discountEUR : 0,
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : "",
    note: typeof raw.note === "string" ? raw.note : "",
    lastPaidAt: typeof raw.lastPaidAt === "string" ? raw.lastPaidAt : "",
    paymentMethod: paymentMethodFromUnknown(raw.paymentMethod),
    archived: Boolean(raw.archived),
    coachEmail: typeof raw.coachEmail === "string" ? raw.coachEmail : "",
    coachTeamLabel: typeof raw.coachTeamLabel === "string" ? raw.coachTeamLabel : "",
    history: historyArr,
  };
}
