import { useState, useMemo } from "react";
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, UserX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MOCK_USERS, User, UserRoleType } from "@/lib/users-data";
import { StatusPill } from "@/components/admin/DataTable";
import { CreateUserPanel } from "@/components/admin/CreateUserPanel";

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      return (
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const handleInvite = (userData: { name: string; email: string; role: UserRoleType }) => {
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      invitedAt: new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(",", ""),
      status: "Convite pendente",
    };

    setUsers((prev) => [newUser, ...prev]);
    toast.success("Convite enviado com sucesso!");
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    toast.success(`Usuário ${userToDelete.name} removido.`);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-heading-1 text-text-primary">Usuários</h1>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-2.5 text-body font-semibold text-[#111111] transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Convidar Usuário
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" />
          <input
            aria-label="Buscar por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[320px] rounded-none border border-border-default bg-bg-secondary py-2 pl-9 pr-3 text-body text-text-primary outline-none placeholder:text-text-disabled focus:border-accent"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left bg-bg-tertiary/50">
              <th className="px-4 py-3 text-small font-medium text-text-secondary">Nome</th>
              <th className="px-4 py-3 text-small font-medium text-text-secondary">E-mail</th>
              <th className="px-4 py-3 text-small font-medium text-text-secondary">Papel</th>
              <th className="px-4 py-3 text-small font-medium text-text-secondary">Convite/Entrada</th>
              <th className="px-4 py-3 text-small font-medium text-text-secondary">Status</th>
              <th className="px-4 py-3 text-small font-medium text-text-secondary text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border-subtle last:border-0 transition-colors hover:bg-bg-tertiary/30"
              >
                <td className="px-4 py-4 text-body text-text-primary">{user.name}</td>
                <td className="px-4 py-4 text-small text-text-secondary">{user.email}</td>
                <td className="px-4 py-4">
                  <StatusPill tone={user.role === "Admin" ? "accent" : "neutral"}>
                    {user.role}
                  </StatusPill>
                </td>
                <td className="px-4 py-4 text-small text-text-secondary">{user.invitedAt}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      user.status === "Ativo" ? "bg-accent" : "bg-text-disabled"
                    )} />
                    <span className="text-small text-text-secondary">{user.status}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={() => setUserToDelete(user)}
                    className="p-1.5 text-text-secondary hover:bg-error/10 hover:text-error transition-colors rounded-none"
                    title="Remover usuário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-body text-text-secondary">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
        <div className="flex items-center gap-4 text-small text-text-secondary">
          <div className="flex items-center gap-2">
            Mostrar
            <select
              aria-label="Itens por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-none border border-border-default bg-bg-secondary px-2 py-1 outline-none focus:border-accent"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <span>
            {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, filtered.length)} de {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-none border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-small text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-none border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CreateUserPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onInvite={handleInvite}
      />

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-6">
          <div className="w-full max-w-[400px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 text-error mb-2">
              <UserX className="h-5 w-5" />
              <h3 className="text-heading-2">Remover usuário?</h3>
            </div>
            <p className="text-body text-text-secondary">
              O usuário <strong>{userToDelete.name}</strong> perderá o acesso ao sistema imediatamente.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-body text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="bg-error px-4 py-2 text-body font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
