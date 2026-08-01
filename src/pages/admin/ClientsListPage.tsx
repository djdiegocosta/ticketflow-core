import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MessageCircle,
  Search,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MOCK_CLIENTS,
  getInitials,
  whatsappLink,
  type Client,
} from "@/lib/clients-data";

type SortKey = "name" | "age" | "totalEvents" | "totalTickets" | "registeredAt" | "lastPurchaseAt";

const parseDate = (value: string) => {
  const [d, m, y] = value.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};

function MiniMetricCard({
  title,
  children,
  icon: Icon,
  iconColor,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-3.5 shadow-[var(--shadow-sm)]">
      <div className="mb-1.5 flex items-start justify-between">
        <span className="text-micro text-text-secondary">{title}</span>
        <Icon className={cn("h-4 w-4", iconColor ?? "text-text-secondary")} />
      </div>
      <div className="flex flex-1 flex-col justify-end">{children}</div>
    </div>
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
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalTickets");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const totalClients = clients.length;
  const averageAge =
    totalClients === 0
      ? 0
      : Math.round(clients.reduce((sum, c) => sum + c.age, 0) / totalClients);
  const topThree = useMemo(
    () => [...clients].sort((a, b) => b.totalTickets - a.totalTickets).slice(0, 3),
    [clients],
  );

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
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "pt-BR") * dir;
      if (sortKey === "registeredAt" || sortKey === "lastPurchaseAt")
        return (parseDate(a[sortKey]) - parseDate(b[sortKey])) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
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
    setClients((prev) => prev.filter((c) => c.id !== toDelete.id));
    toast.success(`${toDelete.name} removido`);
    setToDelete(null);
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
      <h1 className="text-heading-1 text-text-primary">Clientes</h1>

      {/* Dashboard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetricCard title="Clientes" icon={Users} iconColor="text-accent-text">
          <div className="text-heading-2 text-text-primary">{totalClients}</div>
          <div className="mt-0.5 text-micro text-text-secondary">cadastrados na base</div>
        </MiniMetricCard>

        <MiniMetricCard title="Idade média" icon={CalendarDays}>
          <div className="text-heading-2 text-text-primary">{averageAge} anos</div>
          <div className="mt-0.5 text-micro text-text-secondary">
            média de idade dos clientes
          </div>
        </MiniMetricCard>

        <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-3.5 shadow-[var(--shadow-sm)] sm:col-span-2">
          <div className="mb-2 flex items-start justify-between">
            <span className="text-micro text-text-secondary">Top 3 clientes</span>
            <Trophy className="h-4 w-4 text-accent-text" />
          </div>
          <ul className="space-y-1.5">
            {topThree.map((client, index) => (
              <li key={client.id}>
                <Link
                  to="/admin/clientes/$id"
                  params={{ id: client.id }}
                  className="flex items-center justify-between gap-3 transition-colors hover:text-accent-text"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "w-5 shrink-0 text-center text-small tabular-nums",
                        index === 0
                          ? "font-semibold text-accent-text"
                          : "text-text-secondary",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-bg-tertiary text-micro text-text-primary">
                      {getInitials(client.name)}
                    </span>
                    <span className="truncate text-small text-text-primary">{client.name}</span>
                  </span>
                  <span className="shrink-0 text-micro text-text-secondary">
                    {client.totalTickets} ingressos
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Filtros */}
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
        <span className="text-small text-text-secondary">
          Clique no título da coluna para ordenar
        </span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left">
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
              <tr
                key={client.id}
                onClick={() => navigate({ to: "/admin/clientes/$id", params: { id: client.id } })}
                className={cn(
                  "cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-bg-tertiary",
                  client.totalTickets >= 10 && "border-l-2 border-l-accent",
                )}
              >
                <td className="px-4 py-3 text-body text-text-primary">{client.name}</td>
                <td className="px-4 py-3 text-small text-text-secondary">
                  <span className="flex items-center gap-1">
                    {client.whatsapp}
                    <CopyWhatsapp value={client.whatsapp} />
                  </span>
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">{client.age} anos</td>
                <td className="px-4 py-3 text-small text-text-secondary">{client.totalEvents}</td>
                <td className="px-4 py-3 text-body font-semibold text-text-primary">
                  {client.totalTickets}
                </td>
                <td className="px-4 py-3 text-small text-text-secondary">{client.registeredAt}</td>
                <td className="px-4 py-3 text-small text-text-secondary">{client.lastEvent}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Link
                      to="/admin/clientes/$id"
                      params={{ id: client.id }}
                      aria-label={`Visualizar ${client.name}`}
                      title="Visualizar / editar"
                      className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                    >
                      <Eye className="h-4 w-4" />
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
                      onClick={() => setToDelete(client)}
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
                <td colSpan={8} className="px-4 py-10 text-center text-small text-text-secondary">
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
              Tem certeza que deseja excluir <strong className="text-text-primary">{toDelete.name}</strong>?
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
                onClick={confirmDelete}
                className="rounded-[var(--radius-sm)] bg-error px-4 py-2 text-body font-semibold text-[#ffffff] transition-opacity hover:opacity-90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
