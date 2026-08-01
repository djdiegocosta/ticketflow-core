import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/sales-data";
import { MOCK_CLIENTS, whatsappLink, type Client } from "@/lib/clients-data";
import { TopClientsDock } from "@/components/admin/clients/TopClientsDock";

const SORT_OPTIONS = [
  { value: "frequente", label: "Mais frequente" },
  { value: "recente", label: "Mais recente" },
  { value: "valor", label: "Maior valor gasto" },
] as const;

const selectClass =
  "rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-3 py-2 text-body text-text-primary outline-none focus:border-accent";

const parseDate = (value: string) => {
  const [d, m, y] = value.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};

export function ClientsListPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("frequente");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const list = clients.filter((c) => {
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        (digits.length > 0 && c.whatsapp.replace(/\D/g, "").includes(digits))
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "valor") return b.totalSpent - a.totalSpent;
      if (sort === "recente") return parseDate(b.lastPurchaseAt) - parseDate(a.lastPurchaseAt);
      return b.totalTickets - a.totalTickets;
    });
  }, [clients, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const removeClient = (client: Client) => {
    setClients((prev) => prev.filter((c) => c.id !== client.id));
    toast.success(`${client.name} removido`);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Listagem */}
      <div className="min-w-0 flex-1 space-y-6">
        <h1 className="text-heading-1 text-text-primary">Clientes</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" />
            <input
              aria-label="Buscar por nome ou WhatsApp"
              placeholder="Buscar por nome ou WhatsApp"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary py-2 pl-9 pr-3 text-body text-text-primary outline-none placeholder:text-text-disabled focus:border-accent sm:w-[300px]"
            />
          </div>
          <select
            aria-label="Ordenar clientes"
            className={selectClass}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                {[
                  "Nome",
                  "WhatsApp",
                  "Idade",
                  "Eventos",
                  "Ingressos",
                  "Último evento",
                  "Ações",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-small font-medium text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((client) => (
                <tr
                  key={client.id}
                  onClick={() =>
                    navigate({ to: "/admin/clientes/$id", params: { id: client.id } })
                  }
                  className={cn(
                    "cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-bg-tertiary",
                    client.totalTickets >= 10 && "border-l-2 border-l-accent",
                  )}
                >
                  <td className="px-4 py-3 text-body text-text-primary">{client.name}</td>
                  <td className="px-4 py-3 text-small text-text-secondary">{client.whatsapp}</td>
                  <td className="px-4 py-3 text-small text-text-secondary">{client.age} anos</td>
                  <td className="px-4 py-3 text-small text-text-secondary">{client.totalEvents}</td>
                  <td className="px-4 py-3 text-body font-semibold text-text-primary">
                    {client.totalTickets}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">{client.lastEvent}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: client.id }}
                        aria-label={`Ver ${client.name}`}
                        title="Ver ficha"
                        className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: client.id }}
                        aria-label={`Editar ${client.name}`}
                        title="Editar"
                        className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <a
                        href={whatsappLink(client.whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`WhatsApp de ${client.name}`}
                        title="WhatsApp"
                        className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-accent-text"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeClient(client)}
                        aria-label={`Excluir ${client.name}`}
                        title="Excluir"
                        className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-small text-text-secondary">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-4 sm:flex-row">
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
                className="rounded-[var(--radius-sm)] border border-border-default bg-bg-secondary px-2 py-1 outline-none focus:border-accent"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <span>
              Mostrando {filtered.length === 0 ? 0 : start + 1}–
              {Math.min(start + pageSize, filtered.length)} de {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[var(--radius-sm)] border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-small text-text-secondary">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-[var(--radius-sm)] border border-border-default p-2 text-text-primary transition-colors hover:border-accent disabled:cursor-not-allowed disabled:text-text-disabled"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dock ranking */}
      <TopClientsDock
        collapsed={dockCollapsed}
        onToggle={() => setDockCollapsed((v) => !v)}
      />
    </div>
  );
}

export { formatCurrency };
