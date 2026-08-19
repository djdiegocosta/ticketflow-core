import { ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Ticket } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileLayoutProps {
  children?: ReactNode;
  headerContent?: ReactNode;
  showFooter?: boolean;
}

export function MobileLayout({ children, headerContent, showFooter = true }: MobileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] overflow-x-hidden">
      {/* Header simples mobile */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/cliente" className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
            <span className="text-heading-2 font-bold text-[var(--text-primary)]">TicketFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            {headerContent && <div className="flex-1">{headerContent}</div>}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Área de conteúdo */}
      <main className={cn("flex-1", showFooter ? "pb-20" : "")}>
        {children || <Outlet />}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-2">
          <div className="flex h-full items-center justify-around text-[var(--text-secondary)]">
            <Link 
              to="/cliente" 
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="text-[10px]">Início</span>
            </Link>
            <Link 
              to={"/cliente/ingressos" as any} 
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
              <span className="text-[10px]">Ingressos</span>
            </Link>
            <Link 
              to={"/cliente/pontos" as any} 
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span className="text-[10px]">Pontos</span>
            </Link>
            <Link 
              to={"/cliente/perfil" as any} 
              className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
              activeProps={{ className: "text-[var(--accent)]" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="text-[10px]">Perfil</span>
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
