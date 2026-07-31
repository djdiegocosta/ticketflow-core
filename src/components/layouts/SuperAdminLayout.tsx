import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Package, Ticket } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const menu: { to: string; label: string; icon: typeof Ticket; exact?: boolean }[] = [
  { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/superadmin/organizacoes", label: "Organizações", icon: Building2 },
  { to: "/superadmin/planos", label: "Planos", icon: Package },
];

export function SuperAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex h-16 items-center gap-2 px-6">
          <Ticket className="h-5 w-5 text-[var(--accent-text)]" />
          <span className="text-heading-2 text-[var(--text-primary)]">Super Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
          {menu.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to as "/superadmin"}
                className={[
                  "flex items-center gap-3 rounded-[var(--radius-md)] border-l-[3px] px-3 py-2 text-body transition-colors",
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
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-8">
          <span className="text-body text-[var(--text-secondary)]">Dono da plataforma</span>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
