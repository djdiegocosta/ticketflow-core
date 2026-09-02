import { Component, useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState, useNavigate, useLocation, useRouter } from "@tanstack/react-router";
import { CalendarDays, Gift, LayoutDashboard, Receipt, Settings, ShieldCheck, Ticket, Users, UsersRound, Wrench, Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/lib/theme";
import { AdminPageActionProvider, useAdminPageActionValue } from "@/components/layouts/AdminPageActionContext";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard", "/admin/eventos": "Eventos", "/admin/vendas": "Vendas", "/admin/cortesias": "Cortesias", "/admin/clientes": "Clientes", "/checkin": "Check-in", "/admin/relatorios": "Relatórios", "/admin/ferramentas": "Ferramentas", "/admin/ferramentas/vitrine": "Vitrine", "/admin/historico": "Histórico de Eventos", "/admin/usuarios": "Usuários", "/admin/configuracoes": "Configurações", "/admin/checklist": "Checklist", "/admin/remarketing": "Remarketing", "/admin/simulador": "Simulador",
};

const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/cortesias", label: "Cortesias", icon: Gift },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/checkin", label: "Check-in", icon: ShieldCheck },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/admin/usuarios", label: "Usuários", icon: UsersRound },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

class AdminContentErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  override componentDidCatch(error: Error, info: { componentStack?: string | null }) { console.error("[TicketFlow] Erro ao renderizar página admin:", error, info.componentStack); }
  override componentDidUpdate(prevProps: { children: ReactNode }) { if (this.state.error && prevProps.children !== this.props.children) this.setState({ error: null }); }
  override render() {
    if (this.state.error) return <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"><h2 className="text-heading-2 text-[var(--text-primary)]">Esta página não carregou</h2><p className="max-w-md text-body text-[var(--text-secondary)]">Ocorreu um erro ao exibir esta seção. Você pode tentar novamente ou navegar para outra página pelo menu.</p><Button onClick={() => { this.setState({ error: null }); this.props.onRetry(); }}>Tentar novamente</Button></div>;
    return this.props.children;
  }
}

function AdminLayoutContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const location = useLocation();
  let userRole: string | null = null;
  let logout: () => Promise<void> = async () => {};
  try { const auth = useAuth(); userRole = auth.userRole; logout = auth.logout; } catch {}
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pageAction = useAdminPageActionValue();

  const filteredMenu = menu.filter((item) => userRole === "colaborador" ? ["/admin/vendas", "/checkin"].includes(item.to) : true);

  useEffect(() => {
    if (userRole === "operador_checkin") { navigate({ to: "/checkin", replace: true }); return; }
    if (userRole === "colaborador") {
      const isPermitted = filteredMenu.some((item) => item.exact ? pathname === item.to : pathname.startsWith(item.to));
      if (!isPermitted && pathname.startsWith("/admin")) navigate({ to: "/admin/vendas", replace: true });
    }
  }, [userRole, pathname, filteredMenu, navigate]);

  useEffect(() => { if (isMobile) setIsSidebarOpen(false); }, [pathname, isMobile]);

  const getPageTitle = () => {
    if (pageTitles[location.pathname]) return pageTitles[location.pathname];
    const matches = Object.entries(pageTitles).filter(([path]) => path !== location.pathname && location.pathname.startsWith(path + "/")).sort(([a], [b]) => b.length - a.length);
    return matches[0]?.[1] ?? "";
  };
  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
    {isMobile && isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsSidebarOpen(false)} />}
    <aside className={["flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-transform duration-300", isMobile ? "fixed left-0 top-0 z-50 transform" : "relative translate-x-0", isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"].join(" ")}>
      <div className="flex h-16 shrink-0 items-center justify-between px-6"><div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-[var(--accent-text)]" /><span className="text-heading-2 text-[var(--text-primary)]">TicketFlow</span></div>{isMobile && <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="text-[var(--text-secondary)]"><X className="h-5 w-5" /></Button>}</div>
      <nav className="min-h-0 flex-1 overflow-hidden px-3 py-2"><div className="flex flex-col gap-0.5">{filteredMenu.map((item) => { const active = isActive(item.to, item.exact); return <Link key={item.to} to={item.to} className={["flex items-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-body transition-colors", active ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)] dark:border-l-4" : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"].join(" ")}><item.icon className="h-4 w-4" /><span>{item.label}</span></Link>; })}</div></nav>
      <div className="shrink-0 border-t border-[var(--border-subtle)] px-3 pt-2 pb-5"><button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-body text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}<span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span></button><button type="button" onClick={logout} className="mt-0.5 flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-body text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"><LogOut className="h-4 w-4" /><span>Sair</span></button></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:px-6"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-[var(--text-secondary)] lg:hidden"><Menu className="h-5 w-5" /></Button><span className="truncate text-heading-2 text-[var(--text-primary)]">{getPageTitle()}</span></div><div className="flex shrink-0 items-center">{pageAction}</div></header>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin"><AdminContentErrorBoundary key={pathname} onRetry={() => router.invalidate()}><Outlet /></AdminContentErrorBoundary></main>
    </div>
  </div>;
}

export function AdminLayout() {
  return <AdminPageActionProvider><AdminLayoutContent /></AdminPageActionProvider>;
}
