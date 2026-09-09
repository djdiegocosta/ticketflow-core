import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateTicketsPdf } from "@/lib/email/ticket-pdf.server";

export const Route = createFileRoute("/api/public/tickets/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const saleCode = url.searchParams.get("sale_code");
        if (!saleCode) return new Response("sale_code obrigatório", { status: 400 });

        const { data: sale, error: saleError } = await supabaseAdmin
          .from("sales")
          .select("created_at, events(title, event_date, location, organizations(name))")
          .eq("sale_code", saleCode.toUpperCase())
          .maybeSingle();

        if (saleError || !sale) return new Response("Venda não encontrada", { status: 404 });

        const { data: tickets, error: ticketsError } = await supabaseAdmin
          .from("tickets")
          .select("ticket_code, participant_name, ticket_batches(name), sales!inner(sale_code)")
          .eq("sales.sale_code", saleCode.toUpperCase());

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
