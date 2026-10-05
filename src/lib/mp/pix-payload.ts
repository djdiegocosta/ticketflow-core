/**
 * Montagem do pedido de Pix enviado ao Mercado Pago.
 * Lógica pura, sem acesso a banco, para poder ser testada.
 */

// Nome que aparece na fatura do cartão (máx. 22 caracteres, sem acento).
export const MP_STATEMENT_DESCRIPTOR = "INGRESSO-TICKETFLOW";

// Identificador do dispositivo: só letras, números e . _ : -
export const DEVICE_ID_PATTERN = /^[\w.:-]+$/;

export type PixSaleInput = {
  id: string;
  sale_code: string;
  total_amount: number;
  batch_id: string;
  quantity: number;
  unit_price: number;
  buyer_email: string | null;
  buyer_name: string;
};

export function buildPixHeaders(accessToken: string, saleId: string, deviceId?: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": saleId,
    ...(deviceId ? { "X-meli-session-id": deviceId } : {}),
  };
}

export function buildPixPayload(args: {
  sale: PixSaleInput;
  eventTitle?: string | null | undefined;
  batchName?: string | null | undefined;
  notificationUrl: string;
}) {
  const { sale } = args;
  const eventTitle = String(args.eventTitle ?? "Evento").slice(0, 250);
  const batchName = String(args.batchName ?? "Ingresso").slice(0, 200);
  return {
    transaction_amount: sale.total_amount,
    description: `Ingresso TicketFlow - Venda ${sale.sale_code}`,
    statement_descriptor: MP_STATEMENT_DESCRIPTOR,
    additional_info: {
      items: [
        {
          id: String(sale.batch_id),
          title: eventTitle,
          description: `Ingresso ${batchName} - ${eventTitle}`.slice(0, 250),
          category_id: "tickets",
          quantity: Number(sale.quantity),
          unit_price: Number(sale.unit_price),
        },
      ],
    },
    payment_method_id: "pix",
    external_reference: sale.id,
    notification_url: args.notificationUrl,
    payer: {
      email: sale.buyer_email,
      first_name: sale.buyer_name.split(" ")[0],
      last_name: sale.buyer_name.split(" ").slice(1).join(" ") || "Cliente",
    },
  };
}
