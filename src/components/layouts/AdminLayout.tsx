import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
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
  Wrench,
  Target,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/cortesias", label: "Cortesias", icon: Gift },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/checkin", label: "Check-in", icon: ShieldCheck },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/importacao", label: "Importação", icon: Upload },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/admin/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredMenu = menu.filter((item) => {
    if (userRole === "colaborador") {
      return ["/admin/vendas", "/checkin"].includes(item.to);
    }
    return true;
  });

  useEffect(() => {
    if (userRole === "operador_checkin") {
      navigate({ to: "/checkin", replace: true });
      return;
    }

    if (userRole === "colaborador") {
      const isPermitted = filteredMenu.some((item) =>
        item.exact ? pathname === item.to : pathname.startsWith(item.to)
      );

      if (!isPermitted && pathname.startsWith("/admin")) {
        navigate({ to: "/admin/vendas", replace: true });
      }
    }
  }, [userRole, pathname, filteredMenu, navigate]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          "flex h-full w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-transform duration-300",
          isMobile ? "fixed left-0 top-0 z-50 transform" : "relative translate-x-0",
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--accent-text)] animate-pulse" />
            <span className="text-heading-2 text-[var(--text-primary)]">TicketFlow</span>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="text-[var(--text-secondary)]"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-6 scrollbar-thin">
          <div className="flex flex-col gap-1">
            {filteredMenu.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-body transition-colors",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] dark:border-l-4"
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-end border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[var(--text-secondary)]">
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-[var(--error)]">
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
