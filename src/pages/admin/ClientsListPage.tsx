import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Copy,
  Eye,
  MessageCircle,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getInitials,
  whatsappLink,
} from "@/lib/clients-data";
import { useCustomers, useDeleteCustomer } from "@/lib/customers-queries";
import { CreateClientPanel } from "@/components/admin/clients/CreateClientPanel";
import {
  DataTable,
  DataTableCell,
  DataTablePagination,
  DataTableRow,
  DataTableShell,
} from "@/components/admin/DataTable";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { FilterBar, FilterSearch } from "@/components/admin/FilterBar";

type SortKey = "name" | "age" | "totalEvents" | "totalTickets" | "registeredAt" | "lastPurchaseAt";

const parseDate = (value: string) => {
  const [d, m, y] = value.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};

import { useNewCustomersCount } from "@/lib/dashboard-queries";

function NewClientsCard() {
  const [period, setPeriod] = useState("30");
  const { data: count = 0 } = useNewCustomersCount(Number(period));

  return (
    <MiniMetricCard
      title="Novos Clientes"
      value={count}
      subtext="novos cadastros"
      headerRight={
        <select
          aria-label="Período"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="cursor-pointer border-none bg-transparent text-micro font-medium text-accent-text outline-none"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="15">Últimos 15 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      }
    />
  );
}


function CopyWhatsapp({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copiar WhatsApp ${value}`}
      title="Copiar número"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Número copiado");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
      className="rounded-[var(--radius-sm)] p-1 text-text-disabled transition-colors hover:bg-bg-tertiary hover:text-text-primary"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent-text" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ClientsListPage() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useCustomers();
  const deleteMutation = useDeleteCustomer();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalTickets");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const totalClients = clients.length;
  const averageAge =
    totalClients === 0
      ? 0
      : Math.round(clients.reduce((sum, c) => sum + (c.age || 0), 0) / totalClients);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const list = clients.filter((c) => {
      if (!term) return true;
      return (
        c.full_name.toLowerCase().includes(term) ||
        (digits.length > 0 && c.whatsapp.replace(/\D/g, "").includes(digits))
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.full_name.localeCompare(b.full_name, "pt-BR") * dir;
      if (sortKey === "registeredAt" || sortKey === "lastPurchaseAt") {
        const key = sortKey === "registeredAt" ? "created_at" : "last_purchase_at";
        return (new Date((a as any)[key] || 0).getTime() - new Date((b as any)[key] || 0).getTime()) * dir;
      }
      return (((a as any)[sortKey] as number) - ((b as any)[sortKey] as number)) * dir;
    });
  }, [clients, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => setToDelete(null)
    });
  };

  const columns: { key: SortKey | null; label: string; className?: string }[] = [
    { key: "name", label: "Nome" },
    { key: null, label: "WhatsApp" },
    { key: "age", label: "Idade" },
    { key: "totalEvents", label: "Eventos" },
    { key: "totalTickets", label: "Ingressos" },
    { key: "registeredAt", label: "Cadastro" },
    { key: null, label: "Último evento" },
    { key: null, label: "Ações" },
  ];

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Clientes"
        action={
          <PrimaryActionButton onClick={() => {
            setIsPanelOpen(true);
          }}>

            Novo Cliente
          </PrimaryActionButton>
        }
      />

      {/* Dashboard */}
      <MiniMetricGrid className="xl:grid-cols-3">
        <MiniMetricCard title="Clientes" icon={Users} iconColor="text-accent-text">
          <div className="text-heading-1 text-text-primary">{totalClients}</div>
          <div className="mt-0.5 text-small text-text-secondary">cadastrados na base</div>
        </MiniMetricCard>

        <MiniMetricCard title="Idade média" icon={CalendarDays}>
          <div className="text-heading-1 text-text-primary">{averageAge} anos</div>
          <div className="mt-0.5 text-small text-text-secondary">
            média de idade dos clientes
          </div>
        </MiniMetricCard>

        <NewClientsCard />
      </MiniMetricGrid>

      {/* Filtros */}
      <FilterBar>
        <FilterSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou WhatsApp"
        />
        <div className="flex items-center md:items-end">
          <span className="text-small text-text-secondary">
            {"\n"}
          </span>
        </div>
      </FilterBar>

      <DataTableShell>
        <DataTable className="min-w-[980px]">
          <thead>
            <tr className="border-b border-border-subtle text-left bg-bg-tertiary transition-colors">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className="px-4 py-3 text-small font-medium text-text-secondary"
                >
                  {col.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key as SortKey)}
                      className={cn(
                        "flex items-center gap-1 transition-colors hover:text-text-primary",
                        sortKey === col.key && "text-text-primary",
                      )}
                    >
                      {col.label}
                      {sortKey === col.key &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((client) => (
              <DataTableRow
                key={client.id}
                className={cn(
                  "cursor-pointer",
                  client.total_tickets >= 10 && "border-l-2 border-l-accent",
                )}
              >
                <DataTableCell
                  variant="primary"
                  onClick={() =>
                    navigate({ to: "/admin/clientes/$id", params: { id: client.id } })
                  }
                >
                  {client.full_name}
                </DataTableCell>
                <DataTableCell>
                  <span className="flex items-center gap-1">
                    {client.whatsapp}
                    <CopyWhatsapp value={client.whatsapp} />
                  </span>
                </DataTableCell>
                <DataTableCell>{client.age} anos</DataTableCell>
                <DataTableCell>{client.total_events}</DataTableCell>
                <DataTableCell variant="strong">{client.total_tickets}</DataTableCell>
                <DataTableCell>{new Date(client.created_at).toLocaleDateString('pt-BR')}</DataTableCell>
                <DataTableCell>{client.last_event_name || "—"}</DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      to="/admin/clientes/$id"
                      params={{ id: client.id }}
                      aria-label={`Visualizar ${client.full_name}`}
                      title="Visualizar / editar"
                      className="p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <a
                      href={whatsappLink(client.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp de ${client.full_name}`}
                      title="WhatsApp"
                      className="p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-accent-text"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setToDelete(client)}
                      aria-label={`Excluir ${client.full_name}`}
                      title="Excluir"
                      className="p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <DataTableCell colSpan={8} className="py-10 text-center text-body">
                  {isLoading ? "Carregando clientes..." : "Nenhum cliente encontrado."}
                </DataTableCell>
              </tr>
            )}
          </tbody>
        </DataTable>
      </DataTableShell>

      {/* Paginação */}
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

      {/* Confirmação de exclusão */}
      {toDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-[var(--radius-md)] border border-border-default bg-bg-primary p-5 shadow-[var(--shadow-lg)]"
          >
            <h2 className="text-heading-2 text-text-primary">Excluir cliente</h2>
            <p className="mt-2 text-body text-text-secondary">
              Tem certeza que deseja excluir <strong className="text-text-primary">{toDelete.full_name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="rounded-[var(--radius-sm)] border border-border-default px-4 py-2 text-body text-text-primary transition-colors hover:bg-bg-tertiary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
                className="rounded-[var(--radius-sm)] bg-error px-4 py-2 text-body font-semibold text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateClientPanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSave={() => {
          // A lista será atualizada automaticamente pelo React Query devido à invalidação no onSuccess
          setIsPanelOpen(false);
        }}
      />
    </div>
  );
}
