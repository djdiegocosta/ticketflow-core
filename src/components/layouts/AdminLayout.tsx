import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  Gift,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  ShieldCheck,
  Ticket,
  Trophy,
  Upload,
  Users,
  UsersRound,
  Wallet,
  Calculator,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/cortesias", label: "Cortesias", icon: Gift },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/checkin", label: "Check-in", icon: ShieldCheck },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/simulador", label: "Simulador", icon: Calculator },
  { to: "/admin/importacao", label: "Importação", icon: Upload },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/remarketing", label: "Remarketing", icon: Megaphone },
  { to: "/admin/sorteios", label: "Sorteios", icon: Trophy },
  { to: "/admin/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex h-16 items-center gap-2 px-6">
          <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
          <span className="text-heading-2 text-[var(--text-primary)]">TicketFlow</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
          {menu.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                className={[
                  "flex items-center gap-3 rounded-[var(--radius-md)] border-l-[3px] px-3 py-2 text-body transition-colors",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                    : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-8">
          <span className="text-body text-[var(--text-secondary)]">Marina Duarte</span>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
