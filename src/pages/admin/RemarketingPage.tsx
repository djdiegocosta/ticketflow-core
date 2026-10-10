import { useMemo } from "react";
import { MessageCircle, Target, Wallet, CheckCircle, TrendingUp } from "lucide-react";
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
import { useAbandonedCheckouts, useMarkRemarketingContacted } from "@/lib/remarketing-queries";

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

  const { data: leads = [], isLoading } = useAbandonedCheckouts(selectedEventId);
  const { mutate: markContacted } = useMarkRemarketingContacted();

  const stats = useMemo(() => {
    const naoRecuperados = leads.filter((l) => !l.recovered);
    const valorPotencial = naoRecuperados.reduce((sum, l) => sum + Number(l.total_amount || 0), 0);
    const jaContactados = leads.filter((l) => l.remarketing_contacted_at !== null).length;
    // Conta pessoas (não reservas): quem foi contactado por mais de uma reserva e comprou, vale 1.
    const recuperados = new Set(
      leads.filter((l) => l.recovered).map((l) => `${l.event_id}|${l.buyer_whatsapp.replace(/\D/g, "")}`),
    ).size;
    return { total: leads.length, valorPotencial, jaContactados, recuperados };
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
          title="Valor potencial"
          value={formatCurrency(stats.valorPotencial)}
          icon={Wallet}
        />
        <MiniMetricCard
          title="Já contactados"
          value={stats.jaContactados}
          icon={CheckCircle}
          iconColor="text-success"
        />
        <MiniMetricCard
          title="Recuperados"
          value={stats.recuperados}
          subtext={
            stats.jaContactados > 0
              ? `${Math.round((stats.recuperados / stats.jaContactados) * 100)}% dos contactados`
              : "Ninguém contactado ainda"
          }
          icon={TrendingUp}
          iconColor="text-success"
        />
      </MiniMetricGrid>

      <DataTableShell>
        <DataTable>
          <DataTableHeadRow
            columns={["Cliente", "Evento", "Qtd.", "Valor", "Quando", "Status", "Contato", ""]}
          />
          <tbody>
            {isLoading ? (
              <DataTableRow>
                <DataTableCell colSpan={8}>Carregando...</DataTableCell>
              </DataTableRow>
            ) : leads.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={8}>
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
                    {lead.recovered ? (
                      <StatusPill tone="success">Recuperado</StatusPill>
                    ) : lead.remarketing_contacted_at ? (
                      <StatusPill tone="info">Já contactado</StatusPill>
                    ) : (
                      <StatusPill tone={lead.status === "pendente" ? "warning" : "neutral"}>
                        {lead.status === "pendente" ? "Aguardando pagamento" : "Expirado"}
                      </StatusPill>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {lead.remarketing_contacted_at ? (
                      <span className="flex items-center gap-1 text-small text-success">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {timeAgo(lead.remarketing_contacted_at)}
                      </span>
                    ) : (
                      <span className="text-small text-text-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {lead.recovered ? (
                      <span className="text-small text-text-tertiary">—</span>
                    ) : (
                      <a
                        href={remarketingWhatsappLink(lead)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markContacted(lead.id)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-small font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-accent-hover"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
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
