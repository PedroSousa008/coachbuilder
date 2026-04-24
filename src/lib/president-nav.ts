import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Shirt,
  Users,
  UserSearch,
  UsersRound,
  Wallet,
  CreditCard,
  Handshake,
  HeartPulse,
  Scale,
  CalendarRange,
  FileBarChart,
  FolderLock,
  MessagesSquare,
  Settings,
} from "lucide-react";

export type PresidentNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Navegação principal — textos em português (modo Presidente). */
export const PRESIDENT_NAV: PresidentNavItem[] = [
  { href: "/app/president", label: "Painel executivo", icon: LayoutDashboard },
  { href: "/app/president/equipas", label: "Equipas", icon: Shirt },
  { href: "/app/president/treinadores", label: "Treinadores", icon: Users },
  { href: "/app/president/mercado-treinadores", label: "Mercado de Transferências", icon: UserSearch },
  { href: "/app/president/jogadores", label: "Jogadores", icon: UsersRound },
  { href: "/app/president/financas", label: "Finanças", icon: Wallet },
  { href: "/app/president/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/app/president/patrocinadores", label: "Patrocinadores e parceiros", icon: Handshake },
  { href: "/app/president/centro-medico", label: "Centro médico", icon: HeartPulse },
  { href: "/app/president/disciplina", label: "Disciplina", icon: Scale },
  { href: "/app/president/operacoes", label: "Operações", icon: CalendarRange },
  { href: "/app/president/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/app/president/documentos", label: "Documentos", icon: FolderLock },
  { href: "/app/president/comunicacao", label: "Comunicação", icon: MessagesSquare },
  { href: "/app/president/definicoes", label: "Definições", icon: Settings },
];

export function presidentPageTitle(pathname: string): string {
  const hit = PRESIDENT_NAV.find(
    (n) => n.href === pathname || (n.href !== "/app/president" && pathname.startsWith(n.href))
  );
  return hit?.label ?? "Clube";
}
