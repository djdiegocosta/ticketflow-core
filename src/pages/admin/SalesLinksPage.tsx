import { useEffect, useMemo, useState } from "react";
import { Copy, DollarSign, Link2, Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ListPageHeader } from "@/components/admin/PrimaryActionButton";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import {
  SidePanel,
  PanelCancelButton,
  PanelPrimaryButton,
  panelInputClass,
  panelLabelClass,
} from "@/components/admin/SidePanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEvents, useOperationalEvent } from "@/lib/events-queries";
import { formatCurrency } from "@/lib/sales-queries";
import {
  SALES_LINK_CHANNELS,
  channelLabel,
  eventDefaultUrl,
  salesLinkUrl,
  useDeactivateSalesLink,
  useDeleteSalesLink,
  useSalesLinkStats,
  useUpdateSalesLink,
  type SalesLinkStat,
} from "@/lib/sales-links-queries";

const copy = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Link copiado");
  } catch {
    toast.error("Não foi possível copiar o link");
  }
};

export function SalesLinksPage() {
  const { data: events = [] } = useEvents();
  const { event: operationalEvent } = useOperationalEvent();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEventId) return;
    const fallback = operationalEvent?.id ?? events[0]?.id ?? null;
    if (fallback) setSelectedEventId(fallback);
  }, [events, operationalEvent, selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId],
  );

  const { data, isLoading } = useSalesLinkStats(selectedEventId);
  const updateLink = useUpdateSalesLink();
  const setActive = useDeactivateSalesLink();
  const deleteLink = useDeleteSalesLink();

  const [editing, setEditing] = useState<SalesLinkStat | null>(null);
  const [editName, setEditName] = useState("");
  const [editChannel, setEditChannel] = useState("outro");
  const [saving, setSaving] = useState(false);

  const links = data?.links ?? [];
  const direct = data?.direct ?? { sales_count: 0, revenue: 0 };
  const trackedRevenue = links.reduce((acc, l) => acc + l.revenue, 0);
  const totalRevenue = trackedRevenue + direct.revenue;

  const openEdit = (link: SalesLinkStat) => {
    setEditing(link);
    setEditName(link.name);
    setEditChannel(link.channel);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editName.trim()) {
      toast.error("Informe o nome do canal");
      return;
    }
    setSaving(true);
    try {
      await updateLink(editing.sales_link_id, { name: editName.trim(), channel: editChannel });
      toast.success("Link atualizado");
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar link");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (link: SalesLinkStat) => {
    try {
      await setActive(link.sales_link_id, !link.is_active);
      toast.success(link.is_active ? "Link desativado" : "Link ativado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar o link");
    }
  };

  const handleDelete = async (link: SalesLinkStat) => {
    if (link.sales_count > 0) {
      toast.error("Este link já possui vendas — desative em vez de excluir.");
      return;
    }
    if (!window.confirm(`Excluir o link "${link.name}"?`)) return;
    try {
      await deleteLink(link.sales_link_id);
      toast.success("Link excluído");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir link");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ListPageHeader
        title="Links de Venda"
        action={
          events.length > 0 ? (
            <select
              aria-label="Selecionar evento"
              className="border border-border-default bg-bg-secondary px-3 py-2 text-small outline-none focus:border-accent"
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <MiniMetricGrid>
        <MiniMetricCard
          title="Receita total do evento"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="text-accent"
        />
        <MiniMetricCard
          title="Via canais rastreados"
          value={formatCurrency(trackedRevenue)}
          subtext={`${links.reduce((a, l) => a + l.sales_count, 0)} venda(s)`}
          icon={Link2}
          iconColor="text-success"
        />
        <MiniMetricCard
          title="Link padrão"
          value={formatCurrency(direct.revenue)}
          subtext={`${direct.sales_count} venda(s)`}
          icon={Link2}
        />
      </MiniMetricGrid>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <DataTableShell>
          <DataTable className="min-w-[820px]">
            <DataTableHeadRow
              columns={["Canal", "Tipo", "Vendas", "Receita", "Status", "Ações"]}
            />
            <tbody>
              <DataTableRow>
                <DataTableCell variant="primary">
                  <div className="flex items-center gap-2">
                    <span>Link padrão</span>
                    {selectedEvent && (
                      <button
                        type="button"
                        aria-label="Copiar link padrão"
                        onClick={() => copy(eventDefaultUrl(selectedEvent.slug))}
                        className="p-1 text-text-secondary transition-colors hover:text-accent"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell>Sem canal informado</DataTableCell>
                <DataTableCell>{direct.sales_count}</DataTableCell>
                <DataTableCell variant="strong">{formatCurrency(direct.revenue)}</DataTableCell>
                <DataTableCell>
                  <StatusPill tone="neutral">Fixo</StatusPill>
                </DataTableCell>
                <DataTableCell variant="muted">—</DataTableCell>
              </DataTableRow>

              {links.map((link) => (
                <DataTableRow key={link.sales_link_id}>
                  <DataTableCell variant="primary">
                    <div className="flex items-center gap-2">
                      <span>{link.name}</span>
                      {selectedEvent && (
                        <button
                          type="button"
                          aria-label={`Copiar link de ${link.name}`}
                          onClick={() => copy(salesLinkUrl(selectedEvent.slug, link.code))}
                          className="p-1 text-text-secondary transition-colors hover:text-accent"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{channelLabel(link.channel)}</DataTableCell>
                  <DataTableCell>{link.sales_count}</DataTableCell>
                  <DataTableCell variant="strong">{formatCurrency(link.revenue)}</DataTableCell>
                  <DataTableCell>
                    <StatusPill tone={link.is_active ? "success" : "neutral"}>
                      {link.is_active ? "Ativo" : "Inativo"}
                    </StatusPill>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Ações do link ${link.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEdit(link)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar nome/canal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(link)}>
                          <Power className="mr-2 h-4 w-4" />
                          {link.is_active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={link.sales_count > 0}
                          onClick={() => handleDelete(link)}
                          className="text-error focus:text-error"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {link.sales_count > 0 ? "Possui vendas" : "Excluir"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DataTableCell>
                </DataTableRow>
              ))}

              {links.length === 0 && (
                <tr>
                  <DataTableCell colSpan={6} className="py-10 text-center text-body">
                    Nenhum canal rastreado neste evento. Crie os links na tela do evento.
                  </DataTableCell>
                </tr>
              )}
            </tbody>
          </DataTable>
        </DataTableShell>
      )}

      <SidePanel
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar link de venda"
        footer={
          <>
            <PanelCancelButton onClick={() => setEditing(null)} />
            <PanelPrimaryButton onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </PanelPrimaryButton>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={panelLabelClass}>Nome do canal</label>
            <input
              className={panelInputClass}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className={panelLabelClass}>Canal</label>
            <select
              className={panelInputClass}
              value={editChannel}
              onChange={(e) => setEditChannel(e.target.value)}
            >
              {SALES_LINK_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {editing && selectedEvent && (
            <div>
              <label className={panelLabelClass}>Link</label>
              <div className="break-all text-small text-text-secondary">
                {salesLinkUrl(selectedEvent.slug, editing.code)}
              </div>
            </div>
          )}
        </div>
      </SidePanel>
    </div>
  );
}

export default SalesLinksPage;
