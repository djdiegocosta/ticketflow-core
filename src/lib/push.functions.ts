import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUser } from "./push.server";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(20),
    auth: z.string().min(10),
  }),
  userAgent: z.string().max(500).optional(),
});

async function getUserOrganization(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("organization_id, role")
    .eq("user_id", userId)
    .in("role", ["admin", "colaborador"])
    .limit(1)
    .maybeSingle();

  if (error || !data) throw new Error("Usuário não possui uma organização operacional.");
  return data.organization_id;
}

export const getVapidPublicKey = createServerFn({ method: "GET" })
  .handler(async () => {
    const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim();
    if (!publicKey) throw new Error("Web Push não configurado no servidor.");
    return publicKey;
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(subscriptionSchema.parse)
  .handler(async ({ data, context }) => {
    const organizationId = await getUserOrganization(context.userId);
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        organization_id: organizationId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        user_agent: data.userAgent ?? null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) throw error;
    return { success: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ endpoint: z.string().url() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);

    if (error) throw error;
    return { success: true };
  });

export const sendPushTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const results = await sendPushToUser(context.userId, {
      title: "TicketFlow",
      body: "Teste de notificação push recebido com sucesso.",
      url: "/admin",
      tag: "ticketflow-test",
    });
    return { success: results.some((result) => result.status === "fulfilled") };
  });
