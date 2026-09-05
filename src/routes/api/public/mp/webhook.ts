import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getCredentials(environment: "sandbox" | "producao") {
  const { data, error } = await supabaseAdmin.rpc("get_mp_credentials", {
    _environment: environment,
  });
  if (error) throw error;
  const credentials = Array.isArray(data) ? data[0] : data;
  if (!credentials?.access_token || !credentials?.webhook_secret) return null;
  return credentials as { access_token: string; webhook_secret: string };
}

function extractSignature(signatureHeader: string) {
  const parts = signatureHeader.split(",");
  const ts = parts.find((part) => part.trim().startsWith("ts="))?.split("=").slice(1).join("=").trim();
  const v1 = parts.find((part) => part.trim().startsWith("v1="))?.split("=").slice(1).join("=").trim();
  return { ts, v1 };
}

async function matchesSignature(secret: string, dataId: string, requestId: string, ts: string, expected: string) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const actual = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index++) diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let dataId = url.searchParams.get("data.id");
        if (!dataId) {
          try {
            dataId = (await request.clone().json())?.data?.id;
          } catch {}
        }
        if (!dataId) return new Response("Invalid request", { status: 400 });

        try {
          const signatureHeader = request.headers.get("x-signature");
          const requestId = request.headers.get("x-request-id");
          if (!signatureHeader || !requestId) return new Response("Unauthorized", { status: 401 });

          const { ts, v1 } = extractSignature(signatureHeader);
          if (!ts || !v1) return new Response("Unauthorized", { status: 401 });

          let accessToken: string | null = null;
          for (const environment of ["producao", "sandbox"] as const) {
            const credentials = await getCredentials(environment);
            if (!credentials) continue;
            if (await matchesSignature(credentials.webhook_secret, dataId, requestId, ts, v1)) {
              accessToken = credentials.access_token;
              break;
            }
          }
          if (!accessToken) return new Response("Unauthorized", { status: 401 });

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
            .select("id, total_amount, pending_participant_names")
            .eq("id", saleId)
            .single();
          if (saleError || !sale) return new Response("Sale not found", { status: 404 });

          const paymentAmount = Number(mpData.transaction_amount);
          const saleAmount = Number(sale.total_amount);
          if (!Number.isFinite(paymentAmount) || !Number.isFinite(saleAmount) || paymentAmount !== saleAmount) {
            return new Response("Payment amount mismatch", { status: 400 });
          }

          const { error: confirmError } = await supabaseAdmin.rpc("confirm_sale_paid", {
            _sale_id: saleId,
            _mp_payment_id: String(mpData.id),
          });
          if (confirmError) throw confirmError;

          if (sale.pending_participant_names) {
            const { error: ticketError } = await supabaseAdmin.rpc("create_locked_tickets", {
              _sale_id: saleId,
              _participant_names: sale.pending_participant_names,
            });
            if (ticketError) throw ticketError;
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("Webhook error", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
