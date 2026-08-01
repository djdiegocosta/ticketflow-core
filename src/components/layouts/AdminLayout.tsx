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
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";


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
  const { logout, userName } = useAuth();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);


  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar - Fixed Height and Independent Scroll */}
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex h-16 shrink-0 items-center gap-2 px-6">
          <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
          <span className="text-heading-2 text-[var(--text-primary)]">TicketFlow</span>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-6 scrollbar-thin">
          <div className="flex flex-col gap-1">
            {menu.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-body transition-colors",
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
          </div>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header - Fixed at top */}
        <header className="flex h-16 shrink-0 items-center justify-end gap-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-8">
          <div className="flex items-center gap-4">
            <span className="text-body text-[var(--text-secondary)]">{userName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 text-text-secondary hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </div>
          <ThemeToggle />
        </header>

        {/* Content Area - Independent Scroll */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
