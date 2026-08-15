import { useState, useMemo } from "react";
import { Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MOCK_USERS, User, UserRoleType } from "@/lib/users-data";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTablePagination,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterBar, FilterSearch } from "@/components/admin/FilterBar";
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
      <ListPageHeader
        title="Usuários"
        action={
          <PrimaryActionButton onClick={() => setPanelOpen(true)}>
            Convidar Usuário
          </PrimaryActionButton>
        }
      />

      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou e-mail"
        />
        <div className="hidden min-[480px]:block" />
      </FilterBar>

      <DataTableShell>
        <DataTable className="min-w-[800px]">
          <DataTableHeadRow
            columns={["Nome", "E-mail", "Papel", "Convite/Entrada", "Status", "Ações"]}
          />
          <tbody>
            {pageRows.map((user) => (
              <DataTableRow key={user.id}>
                <DataTableCell variant="primary">{user.name}</DataTableCell>
                <DataTableCell>{user.email}</DataTableCell>
                <DataTableCell>
                  <StatusPill tone={user.role === "Admin" ? "accent" : "neutral"}>
                    {user.role}
                  </StatusPill>
                </DataTableCell>
                <DataTableCell>{user.invitedAt}</DataTableCell>
                <DataTableCell>
                  <StatusPill tone={user.status === "Ativo" ? "accent" : "neutral"}>
                    {user.status}
                  </StatusPill>
                </DataTableCell>
                <DataTableCell>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(user)}
                    className="p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-error"
                    title="Remover usuário"
                    aria-label={`Remover ${user.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </DataTableCell>
              </DataTableRow>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <DataTableCell colSpan={6} className="py-10 text-center text-body">
                  Nenhum usuário encontrado.
                </DataTableCell>
              </tr>
            )}
          </tbody>
        </DataTable>
      </DataTableShell>

      <DataTablePagination
        pageSize={pageSize}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        startIndex={start}
        onPageChange={setPage}
      />

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
