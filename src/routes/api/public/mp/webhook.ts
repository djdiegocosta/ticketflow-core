import { createFileRoute } from "@tanstack/react-router";
import { decrypt } from "@/lib/mp/utils.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPurchaseConfirmationEmail } from "@/lib/email/confirmation-email.server";

export const Route = createFileRoute("/api/public/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const orgId = url.searchParams.get("org_id");
        let dataId = url.searchParams.get("data.id");
        if (!dataId) {
          try { dataId = (await request.clone().json())?.data?.id; } catch {}
        }
        if (!orgId || !dataId) return new Response("Invalid request", { status: 400 });

        try {
          const signatureHeader = request.headers.get("x-signature");
          const requestId = request.headers.get("x-request-id");
          if (!signatureHeader || !requestId) return new Response("Unauthorized", { status: 401 });
          const parts = signatureHeader.split(",");
          const ts = parts.find(p => p.startsWith("ts="))?.split("=")[1];
          const v1 = parts.find(p => p.startsWith("v1="))?.split("=")[1];
          if (!ts || !v1) return new Response("Unauthorized", { status: 401 });

          const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
          const { data: configs } = await supabaseAdmin
            .from("mp_config")
            .select("*")
            .eq("organization_id", orgId);
          let validConfig: any = null;
          for (const config of configs || []) {
            if (!config.webhook_secret_encrypted) continue;
            const secret = await decrypt(config.webhook_secret_encrypted);
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
            const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
            if (hashHex.length === v1.length) {
              let diff = 0;
              for (let i = 0; i < hashHex.length; i++) diff |= hashHex.charCodeAt(i) ^ v1.charCodeAt(i);
              if (diff === 0) { validConfig = config; break; }
            }
          }
          if (!validConfig) return new Response("Unauthorized", { status: 401 });

          const accessToken = await decrypt(validConfig.access_token_encrypted!);
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!mpRes.ok) return new Response("Payment lookup failed", { status: 502 });
          const mpData = await mpRes.json();
          if (mpData.status !== "approved") return new Response("ok", { status: 200 });

          const saleId = mpData.external_reference;
          if (!saleId) return new Response("Invalid payment reference", { status: 400 });
          const { data: sale, error: saleError } = await supabaseAdmin
            .from("sales")
            .select("id, organization_id, total_amount, pending_participant_names, buyer_name, buyer_email, sale_code, created_at, events(title, event_date, location, organizations(name))")
            .eq("id", saleId)
            .single();
          if (saleError || !sale) return new Response("Sale not found", { status: 404 });
          if (sale.organization_id !== orgId) return new Response("Organization mismatch", { status: 403 });

          const paymentAmount = Number(mpData.transaction_amount);
          const saleAmount = Number(sale.total_amount);
          if (!Number.isFinite(paymentAmount) || !Number.isFinite(saleAmount) || paymentAmount !== saleAmount) {
            return new Response("Payment amount mismatch", { status: 400 });
          }

          const { data: confirmationResult, error: confirmError } = await supabaseAdmin.rpc("confirm_sale_paid", {
            _sale_id: saleId,
            _mp_payment_id: String(mpData.id),
          });
          if (confirmError) throw confirmError;

          // O RPC é idempotente. Quando um webhook repetido chega depois da
          // confirmação original, ele retorna false e não deve reenviar e-mail.
          if (confirmationResult !== true) {
            return new Response("ok", { status: 200 });
          }

          if (sale.pending_participant_names) {
            const { error: ticketError } = await supabaseAdmin.rpc("create_locked_tickets", {
              _sale_id: saleId,
              _participant_names: sale.pending_participant_names,
            });
            if (ticketError) throw ticketError;
          }

          const { data: tickets, error: ticketsError } = await supabaseAdmin
            .from("tickets")
            .select("ticket_code, participant_name, ticket_batches(name)")
            .eq("sale_id", saleId)
            .order("created_at", { ascending: true });
          if (ticketsError) throw ticketsError;

          const event = (sale as unknown as { events?: { title?: string; event_date?: string | null; location?: string | null; organizations?: { name?: string | null } } }).events;
          const eventTitle = event?.title ?? "seu evento";
          await sendPurchaseConfirmationEmail({
            buyerName: sale.buyer_name ?? "",
            buyerEmail: sale.buyer_email ?? "",
            eventTitle,
            eventDate: event?.event_date ?? null,
            eventLocation: event?.location ?? null,
            organizationName: event?.organizations?.name ?? null,
            saleCode: sale.sale_code ?? "",
            purchasedAt: sale.created_at ?? null,
            tickets: (tickets || []).map((ticket: any) => ({
              ticket_code: ticket.ticket_code,
              participant_name: ticket.participant_name,
              batch_name: ticket.ticket_batches?.name ?? null,
            })),
          });

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("Webhook error", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
