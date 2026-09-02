import { useState, useMemo } from "react";
import { MoreHorizontal, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { formatName } from "@/lib/form-format";
import { useOrganizationUsers, useRemoveUser } from "@/lib/users-queries";

import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTablePagination,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterBar, FilterSearch } from "@/components/admin/FilterBar";
import { CreateUserPanel } from "@/components/admin/CreateUserPanel";
import { useAdminPageAction } from "@/components/layouts/AdminPageActionContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function UsersListPage() {
  const { data: users = [], isLoading } = useOrganizationUsers();
  const removeMutation = useRemoveUser();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  useAdminPageAction(
    <PrimaryActionButton onClick={() => setPanelOpen(true)}>
      Convidar Usuário
    </PrimaryActionButton>
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u: any) => {
      return (
        !term ||
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const handleInviteSuccess = () => {
    setPanelOpen(false);
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    removeMutation.mutate({ user_id: userToDelete.id }, {
      onSuccess: () => {
        setUserToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou e-mail"
        />
        <div className="hidden md:block" />
      </FilterBar>

      <DataTableShell>
        <DataTable className="min-w-[800px]">
          <DataTableHeadRow
            columns={["Nome", "E-mail", "Papel", "Entrada/Convite", "Status", <span className="block text-right">Ações</span>]}
          />
          <tbody>
            {isLoading ? (
              <tr>
                <DataTableCell colSpan={6} className="py-10 text-center text-body">
                  Carregando usuários...
                </DataTableCell>
              </tr>
            ) : pageRows.map((user) => (
              <DataTableRow key={user.id}>
                <DataTableCell variant="primary">{user.full_name ? formatName(user.full_name) : (user.status === 'Convite pendente' ? 'Pendente' : '—')}</DataTableCell>
                <DataTableCell>{user.email}</DataTableCell>
                <DataTableCell>
                  <StatusPill tone={user.role === "admin" ? "accent" : "neutral"}>
                    {user.role}
                  </StatusPill>
                </DataTableCell>
                <DataTableCell>{user.invitedAt ? new Date(user.invitedAt).toLocaleDateString('pt-BR') : '—'}</DataTableCell>
                <DataTableCell>
                  <StatusPill tone={user.status === "Ativo" ? "accent" : "neutral"}>
                    {user.status}
                  </StatusPill>
                </DataTableCell>
                <DataTableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Ações de ${user.full_name || user.email}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-error focus:text-error">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DataTableCell>
              </DataTableRow>
            ))}
            {!isLoading && pageRows.length === 0 && (
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
        onInvite={handleInviteSuccess}
      />

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-6">
          <div className="w-full max-w-[400px] rounded-[var(--radius-lg)] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 text-error mb-2">
              <UserX className="h-5 w-5" />
              <h3 className="text-heading-2">Remover usuário?</h3>
            </div>
            <p className="text-body text-text-secondary">
              O usuário <strong>{userToDelete.full_name || userToDelete.email}</strong> perderá o acesso ao sistema imediatamente.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-[var(--radius-sm)] px-4 py-2 text-body text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={handleDelete}
                className="rounded-[var(--radius-sm)] bg-error px-4 py-2 text-body font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {removeMutation.isPending ? "Removendo..." : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
