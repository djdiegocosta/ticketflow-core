import { ReactNode, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, Home, LogOut, Menu, Moon, Sun, Ticket, User, X } from "lucide-react";
import { Brandmark } from "@/components/Brandmark";
import { useApplyCustomerDesign } from "@/lib/customer-queries";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

interface MobileLayoutProps {
  children?: ReactNode;
  headerContent?: ReactNode;
  showFooter?: boolean;
}

const menuItems = [
  { to: "/cliente", label: "Início", icon: Home, exact: true },
  { to: "/cliente/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/cliente/ingressos", label: "Ingressos", icon: Ticket },
  { to: "/cliente/pontos", label: "Pontos", icon: Check },
  { to: "/cliente/perfil", label: "Perfil", icon: User },
] as const;

export function MobileLayout({ children, headerContent, showFooter = true }: MobileLayoutProps) {
  useApplyCustomerDesign();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--bg-primary)]">
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-transform duration-300",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Brandmark size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(false)}
            className="text-[var(--text-secondary)]"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="min-h-0 flex-1 overflow-hidden px-3 py-2">
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-none border-l-[3px] px-3 py-2 text-body transition-colors",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[var(--border-subtle)] px-3 pb-5 pt-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-body text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-0.5 flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-body text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/cliente" className="flex items-center gap-2">
            <Brandmark size="sm" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            {headerContent && <div className="min-w-0">{headerContent}</div>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(true)}
              className="h-9 w-9 shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("flex-1", showFooter ? "pb-20 md:pb-6" : "")}>
        <div className="mx-auto h-full max-w-md md:max-w-2xl lg:max-w-4xl">
          {children || <Outlet />}
        </div>
      </main>

      {showFooter && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-2 md:left-60 md:rounded-tl-xl">
          <div className="mx-auto flex h-full max-w-md items-center justify-around text-[var(--text-secondary)] lg:max-w-4xl">
            {menuItems.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]",
                    active && "text-[var(--accent)]"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
}
