import { createFileRoute } from "@tanstack/react-router";
import { decrypt } from "@/lib/mp/utils.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const orgId = url.searchParams.get("org_id");
        let dataId = url.searchParams.get("data.id");
        if (!dataId) {
          try {
             const body = await request.clone().json();
             dataId = body?.data?.id;
          } catch(e) {}
        }

        if (!orgId || !dataId) {
          return new Response("Invalid request", { status: 400 });
        }

        try {
          const signatureHeader = request.headers.get("x-signature");
          const requestId = request.headers.get("x-request-id");

          if (!signatureHeader || !requestId) throw new Error("Missing headers");

          const parts = signatureHeader.split(",");
          const ts = parts.find(p => p.startsWith("ts="))?.split("=")[1];
          const v1 = parts.find(p => p.startsWith("v1="))?.split("=")[1];

          if (!ts || !v1) throw new Error("Invalid signature format");

          const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;

          const { data: configs } = await supabaseAdmin
            .from("mp_config")
            .select("*")
            .eq("organization_id", orgId);

          let validated = false;
          let validConfig = null;

          for (const config of (configs || [])) {
            if (!config.webhook_secret_encrypted) continue;
            const secret = await decrypt(config.webhook_secret_encrypted);
            
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
              "raw",
              encoder.encode(secret),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            );
            
            const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
            const hashArray = Array.from(new Uint8Array(signature));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

            if (hashHex.length === v1.length) {
              let diff = 0;
              for (let i = 0; i < hashHex.length; i++) {
                diff |= hashHex.charCodeAt(i) ^ v1.charCodeAt(i);
              }
              if (diff === 0) {
                validated = true;
                validConfig = config;
                break;
              }
            }
          }

          if (!validated || !validConfig) {
            console.error("Webhook signature mismatch or config not found for org", orgId);
            return new Response("Unauthorized", { status: 401 });
          }

          // Processamento
          const accessToken = await decrypt(validConfig.access_token_encrypted!);
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          const mpData = await mpRes.json();
          if (mpData.status === "approved") {
            const saleId = mpData.external_reference;
            
            const { data: sale } = await supabaseAdmin
              .from("sales")
              .select("pending_participant_names")
              .eq("id", saleId)
              .single();

            await supabaseAdmin.rpc("confirm_sale_paid", {
              _sale_id: saleId,
              _mp_payment_id: dataId
            });

            if (sale?.pending_participant_names) {
              await supabaseAdmin.rpc("create_locked_tickets", {
                _sale_id: saleId,
                _participant_names: sale.pending_participant_names
              });
            }
          }

          return new Response("ok", { status: 200 });

        } catch (err) {
          console.error("Webhook error", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      }
    }
  }
});
