import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Target, Users, Clock, Wallet } from "lucide-react";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import {
  DataTable,
  DataTableCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableShell,
  StatusPill,
} from "@/components/admin/DataTable";
import { getInitials } from "@/lib/clients-data";
import { formatCurrency } from "@/lib/sales-queries";
import { useOperationalEvent } from "@/lib/events-queries";
import { useAbandonedCheckouts } from "@/lib/remarketing-queries";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function remarketingWhatsappLink(lead: {
  buyer_name: string;
  buyer_whatsapp: string;
  events: { title: string; slug: string } | null;
}): string {
  const eventUrl = lead.events?.slug
    ? `${window.location.origin}/e/${lead.events.slug}`
    : window.location.origin;
  const message =
    `Oi ${firstName(lead.buyer_name)}! Seus ingressos pro evento ${lead.events?.title ?? "que você estava vendo"} ainda estão te esperando! Bora!? ` +
    `Vou deixar aqui o link novamente pra você solicitar sua compra novamente: ${eventUrl}`;
  return `https://wa.me/55${lead.buyer_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function RemarketingPage() {
  const { event: operationalEvent } = useOperationalEvent();
  const selectedEventId = operationalEvent?.id ?? null;

  const { data: leads = [], isLoading } = useAbandonedCheckouts(
    selectedEventId,
  );

  const stats = useMemo(() => {
    const aguardando = leads.filter((l) => l.status === "pendente").length;
    const expirados = leads.filter((l) => l.status === "expirado").length;
    const valorPotencial = leads.reduce((sum, l) => sum + Number(l.total_amount || 0), 0);
    return { total: leads.length, aguardando, expirados, valorPotencial };
  }, [leads]);

  if (!operationalEvent) return <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-6 text-center"><div><h2 className="text-heading-2 text-text-primary">Nenhum evento ativo</h2><p className="mt-1 max-w-xl text-small text-text-secondary">Crie ou publique um novo evento para começar a operação.</p></div><a href="/admin/eventos" className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-small font-semibold text-[var(--accent-foreground)]">Ir para Eventos</a></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <p className="text-body text-text-secondary">
          Pessoas que geraram Pix (cadastradas ou não) e não terminaram a compra. Contato é manual —
          nenhuma mensagem é enviada automaticamente.
        </p>
      </div>

      <MiniMetricGrid>
        <MiniMetricCard title="Leads no total" value={stats.total} icon={Target} />
        <MiniMetricCard
          title="Aguardando pagamento"
          value={stats.aguardando}
          icon={Clock}
          iconColor="text-warning"
        />
        <MiniMetricCard title="Expirados" value={stats.expirados} icon={Users} />
        <MiniMetricCard
          title="Valor potencial"
          value={formatCurrency(stats.valorPotencial)}
          icon={Wallet}
        />
      </MiniMetricGrid>

      <DataTableShell>
        <DataTable>
          <DataTableHeadRow
            columns={["Cliente", "Evento", "Qtd.", "Valor", "Quando", "Status", ""]}
          />
          <tbody>
            {isLoading ? (
              <DataTableRow>
                <DataTableCell colSpan={7}>Carregando...</DataTableCell>
              </DataTableRow>
            ) : leads.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={7}>
                  Nenhum lead encontrado — ninguém com compra pendente ou expirada agora.
                </DataTableCell>
              </DataTableRow>
            ) : (
              leads.map((lead) => (
                <DataTableRow key={lead.id}>
                  <DataTableCell variant="primary">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-small font-semibold text-text-secondary">
                        {getInitials(lead.buyer_name)}
                      </div>
                      <div className="flex flex-col">
                        <span>{lead.buyer_name}</span>
                        <span className="text-small text-text-secondary">
                          {lead.customer_id ? "Cadastrado" : "Visitante"}
                          {lead.buyer_email ? ` · ${lead.buyer_email}` : ""}
                        </span>
                      </div>
                    </div>
                  </DataTableCell>
                  <DataTableCell>{lead.events?.title ?? "—"}</DataTableCell>
                  <DataTableCell>{lead.quantity}</DataTableCell>
                  <DataTableCell>{formatCurrency(Number(lead.total_amount || 0))}</DataTableCell>
                  <DataTableCell>{timeAgo(lead.created_at)}</DataTableCell>
                  <DataTableCell>
                    <StatusPill tone={lead.status === "pendente" ? "warning" : "neutral"}>
                      {lead.status === "pendente" ? "Aguardando pagamento" : "Expirado"}
                    </StatusPill>
                  </DataTableCell>
                  <DataTableCell>
                    <a
                      href={remarketingWhatsappLink(lead)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-small font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-accent-hover"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </tbody>
        </DataTable>
      </DataTableShell>
    </div>
  );
}
