import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateTicketsPdf } from "@/lib/email/ticket-pdf.server";

export const Route = createFileRoute("/api/public/tickets/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const saleCode = url.searchParams.get("sale_code")?.trim();

        if (!saleCode) {
          return new Response("Código da compra não informado", { status: 400 });
        }

        try {
          const { data: sale, error: saleError } = await supabaseAdmin
            .from("sales")
            .select("id, sale_code, buyer_name, status, total_amount, events(title, event_date)")
            .eq("sale_code", saleCode)
            .eq("status", "pago")
            .maybeSingle();

          if (saleError) throw saleError;
          if (!sale) return new Response("Ingresso não encontrado", { status: 404 });

          const { data: tickets, error: ticketsError } = await supabaseAdmin
            .from("tickets")
            .select("ticket_code, participant_name")
            .eq("sale_id", sale.id)
            .order("created_at", { ascending: true });

          if (ticketsError) throw ticketsError;
          if (!tickets?.length) return new Response("Ingressos não encontrados", { status: 404 });

          const event = (sale as unknown as { events?: { title?: string; event_date?: string | null } }).events;
          const pdf = await generateTicketsPdf({
            eventTitle: event?.title ?? "Evento",
            eventDate: event?.event_date ?? null,
            buyerName: sale.buyer_name ?? "",
            saleCode: sale.sale_code ?? saleCode,
            tickets,
          });

          return new Response(pdf, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="ingressos-${sale.sale_code ?? saleCode}.pdf"`,
              "Cache-Control": "private, no-store",
            },
          });
        } catch (error) {
          console.error("Ticket PDF generation error", error);
          return new Response("Não foi possível gerar o PDF", { status: 500 });
        }
      },
    },
  },
});
