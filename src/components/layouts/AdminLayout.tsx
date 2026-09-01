import { Component, useEffect, useState, type ReactNode } from "react";
import {
  Link,
  Outlet,
  useRouterState,
  useNavigate,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
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

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/eventos": "Eventos",
  "/admin/vendas": "Vendas",
  "/admin/cortesias": "Cortesias",
  "/admin/clientes": "Clientes",
  "/checkin": "Check-in",
  "/admin/relatorios": "Relatórios",
  "/admin/ferramentas": "Ferramentas",
  "/admin/ferramentas/vitrine": "Vitrine",
  "/admin/historico": "Histórico de Eventos",
  "/admin/usuarios": "Usuários",
  "/admin/configuracoes": "Configurações",
  "/admin/checklist": "Checklist",
  "/admin/remarketing": "Remarketing",
  "/admin/simulador": "Simulador",
};

const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/cortesias", label: "Cortesias", icon: Gift },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/checkin", label: "Check-in", icon: ShieldCheck },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/admin/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

// Isola erros de renderização de uma página filha para que apenas a área de
// conteúdo quebre — o AdminLayout (sidebar + header) continua visível e
// navegável mesmo se a página atual falhar (ex.: dado inesperado vindo do
// banco). Sem isso, o erro sobe até o errorComponent da rota raiz, que
// substitui a tela inteira e derruba o menu lateral junto.
class AdminContentErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[TicketFlow] Erro ao renderizar página admin:", error, info.componentStack);
  }

  override componentDidUpdate(prevProps: { children: ReactNode }) {
    if (this.state.error && prevProps.children !== this.props.children) {
      // Rota mudou (usuário navegou) — limpa o erro para tentar renderizar a nova página.
      this.setState({ error: null });
    }
  }

  override render() { 
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <h2 className="text-heading-2 text-[var(--text-primary)]">Esta página não carregou</h2>
          <p className="max-w-md text-body text-[var(--text-secondary)]">
            Ocorreu um erro ao exibir esta seção. Você pode tentar novamente ou navegar para outra
            página pelo menu.
          </p>
          <Button
            onClick={() => {
              this.setState({ error: null });
              this.props.onRetry();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const location = useLocation();
  // useAuth com fallback seguro — nunca joga exceção fora do provider
  let userRole: string | null = null;
  let logout: () => Promise<void> = async () => {};
  try {
    const auth = useAuth();
    userRole = auth.userRole;
    logout = auth.logout;
  } catch {
    // AuthProvider não disponível — redirect will happen via route guard
  }
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
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
        item.exact ? pathname === item.to : pathname.startsWith(item.to),
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

  const getPageTitle = () => {
    const current = location.pathname;

    // Primeiro: match exato
    if (pageTitles[current]) return pageTitles[current];

    // Segundo: match de prefixo — mais específico primeiro (ordem decrescente de tamanho)
    const matches = Object.entries(pageTitles)
      .filter(([path]) => path !== current && current.startsWith(path + "/"))
      .sort(([a], [b]) => b.length - a.length);

    return matches[0]?.[1] ?? "";
  };

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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:px-6">
          <span className="text-heading-2 text-[var(--text-primary)]">{getPageTitle()}</span>
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
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer gap-2 text-[var(--error)]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
          <AdminContentErrorBoundary key={pathname} onRetry={() => router.invalidate()}>
            <Outlet />
          </AdminContentErrorBoundary>
        </main>
      </div>
    </div>
  );
}
