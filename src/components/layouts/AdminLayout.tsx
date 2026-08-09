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
  LogOut,
  Wrench,
  Target,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";



const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/cortesias", label: "Cortesias", icon: Gift },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/checkin", label: "Check-in", icon: ShieldCheck },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/admin/importacao", label: "Importação", icon: Upload },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout, userName, userRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredMenu = menu.filter((item) => {
    if (userRole === "colaborador") {
      return ["/admin/vendas", "/admin/checkin"].includes(item.to);
    }
    return true;
  });

  useEffect(() => {
    if (userRole === "colaborador") {
      const isPermitted = filteredMenu.some((item) => 
        item.exact ? pathname === item.to : pathname.startsWith(item.to)
      );
      
      if (!isPermitted && pathname.startsWith("/admin")) {
        navigate({ to: "/admin/vendas", replace: true });
      }
    }
  }, [userRole, pathname, filteredMenu, navigate]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Overlay for mobile sidebar */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Height and Independent Scroll */}
      <aside 
        className={[
          "flex h-full w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-transform duration-300",
          isMobile 
            ? "fixed left-0 top-0 z-50 transform" 
            : "relative translate-x-0",
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
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

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header - Fixed at top */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:px-8">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="text-[var(--text-primary)]"
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-4 sm:flex">
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
            {/* Simple logout for mobile if needed, or just theme toggle */}
            {!isMobile && <ThemeToggle />}
            {isMobile && (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-text-secondary hover:text-error"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area - Independent Scroll */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

