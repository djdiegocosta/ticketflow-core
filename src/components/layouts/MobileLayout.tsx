import { ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";

interface MobileLayoutProps {
  children?: ReactNode;
  headerContent?: ReactNode;
}

export function MobileLayout({ children, headerContent }: MobileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] overflow-x-hidden">
      {/* Header simples mobile */}
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)]">
              {/* Ticket Icon Placeholder */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#111111" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
              </svg>
            </div>
            <Link to="/" className="text-heading-2 font-bold text-[var(--text-primary)]">TicketFlow</Link>
          </div>
          {headerContent && <div className="flex-1">{headerContent}</div>}
        </div>
      </header>

      {/* Área de conteúdo */}
      <main className="flex-1 pb-20">
        {children || <Outlet />}
      </main>

      {/* Espaço reservado para Bottom Navigation futura */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-2">
        <div className="flex h-full items-center justify-around text-[var(--text-secondary)]">
          <Link 
            to="/" 
            className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
            activeProps={{ className: "text-[var(--accent)]" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Início</span>
          </Link>
          <Link 
            to="/meus-ingressos" 
            className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
            activeProps={{ className: "text-[var(--accent)]" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
            <span>Ingressos</span>
          </Link>
          <Link 
            to="/login" 
            className="flex flex-col items-center justify-center gap-1 px-3 text-small hover:text-[var(--accent)]"
            activeProps={{ className: "text-[var(--accent)]" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Perfil</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}