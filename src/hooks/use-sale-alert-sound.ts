import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { playSaleAlertSound } from "@/lib/sale-alert-sound";

/**
 * Toca um som sempre que uma venda vira "pago", em tempo real, enquanto o
 * admin estiver com a tela aberta. Não manda nada pro cliente, não altera
 * nenhuma venda — só escuta.
 */
export function useSaleAlertSound(organizationId: string | null) {
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`sales-paid-alert-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sales",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const before = payload.old as { status?: string } | null;
          const after = payload.new as {
            status?: string;
            buyer_name?: string;
            is_courtesy?: boolean;
          } | null;
          // Só toca na transição pra "pago" — não em toda atualização da
          // venda (ex: check-in de um ingresso também atualiza a linha).
          if (before?.status !== "pago" && after?.status === "pago") {
            playSaleAlertSound();
            if (!after.is_courtesy) {
              toast.success(`Venda confirmada${after.buyer_name ? ` — ${after.buyer_name}` : ""}`);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);
}
