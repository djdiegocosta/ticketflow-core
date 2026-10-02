import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateTicketsPdf } from "@/lib/email/ticket-pdf.server";

export const Route = createFileRoute("/api/public/tickets/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // O acesso é pelo ID da venda (uuid aleatório de 122 bits, impossível de adivinhar).
        // O código curto (sale_code, 8 caracteres) NÃO é mais aceito: era adivinhável e
        // permitia baixar os ingressos de qualquer compra sem login.
        const saleId = url.searchParams.get("sale_id");
        if (!saleId) return new Response("sale_id obrigatório", { status: 400 });
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saleId)) {
          return new Response("sale_id inválido", { status: 400 });
        }

        const { data: sale, error: saleError } = await supabaseAdmin
          .from("sales")
          .select("created_at, sale_code, events(title, event_date, location, organizations(name))")
          .eq("id", saleId)
          .maybeSingle();

        if (saleError || !sale) return new Response("Venda não encontrada", { status: 404 });
        const saleCode = (sale as any).sale_code as string;

        const { data: tickets, error: ticketsError } = await supabaseAdmin
          .from("tickets")
          .select("ticket_code, participant_name, ticket_batches(name)")
          .eq("sale_id", saleId);

        if (ticketsError || !tickets?.length) return new Response("Nenhum ingresso encontrado para essa venda", { status: 404 });

        const event = (sale as any).events;
        const pdfBuffer = await generateTicketsPdf({
          eventTitle: event?.title || "Evento",
          eventDate: event?.event_date || null,
          eventLocation: event?.location || null,
          organizationName: event?.organizations?.name || null,
          saleCode,
          purchasedAt: sale.created_at,
          tickets: tickets.map((t: any) => ({
            ticket_code: t.ticket_code,
            participant_name: t.participant_name,
            batch_name: t.ticket_batches?.name ?? null,
          })),
        });

        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="ingressos-${saleCode}.pdf"`,
          },
        });
      },
    },
  },
});
