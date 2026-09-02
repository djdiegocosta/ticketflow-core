import { ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Brandmark } from "@/components/Brandmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useApplyCustomerDesign } from "@/lib/customer-queries";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface MobileLayoutProps {
  children?: ReactNode;
  headerContent?: ReactNode;
  showFooter?: boolean;
}

export function MobileLayout({ children, headerContent, showFooter = true }: MobileLayoutProps) {
  useApplyCustomerDesign();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] overflow-x-hidden">
      {/* Header simples mobile */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/cliente" className="flex items-center gap-2">
            <Brandmark size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            {headerContent && <div className="flex-1">{headerContent}</div>}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Área de conteúdo */}
      <main className={cn("flex-1", showFooter ? "pb-20 md:pb-6" : "")}>
        <div className="mx-auto h-full max-w-md md:max-w-2xl lg:max-w-4xl">
          {children || <Outlet />}
        </div>
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-2 md:left-60 md:rounded-tl-xl">
          <div className="mx-auto flex h-full max-w-md items-center justify-around text-[var(--text-secondary)] lg:max-w-4xl">
            <Link
              to="/cliente"
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-[10px]">Início</span>
            </Link>
            <Link
              to="/cliente/eventos"
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                <line x1="16" x2="16" y1="2" y2="6"></line>
                <line x1="8" x2="8" y1="2" y2="6"></line>
                <line x1="3" x2="21" y1="10" y2="10"></line>
              </svg>
              <span className="text-[10px]">Eventos</span>
            </Link>
            <Link
              to={"/cliente/ingressos" as any}

              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
              <span className="text-[10px]">Ingressos</span>
            </Link>
            <Link
              to={"/cliente/pontos" as any}
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-[10px]">Pontos</span>
            </Link>
            <Link
              to={"/cliente/perfil" as any}
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-[10px]">Perfil</span>
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
