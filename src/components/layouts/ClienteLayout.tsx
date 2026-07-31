import { Link, Outlet } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ClienteLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4">
        <Link to="/cliente" className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
          <span className="text-heading-2 text-[var(--text-primary)]">TicketFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-small text-[var(--text-secondary)]">Marina Duarte</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
