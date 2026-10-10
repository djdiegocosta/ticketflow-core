// Pagamento aprovado depois que a reserva expirou.
// Regra do negócio: o prazo da reserva serve para dar urgência ao cliente, mas
// todo pagamento aprovado é bem-vindo e deve virar ingresso.
// Lógica pura (sem rede nem banco) para poder ser testada.

export type LateConfirmationResult =
  | "confirmed"
  | "already_paid"
  | "sold_out"
  | "invalid_state"
  | "not_found";

export type LatePaymentAction =
  /** A venda foi confirmada agora: segue o fluxo normal (ingresso, e-mail, aviso). */
  | { kind: "continue" }
  /** A venda já estava paga (aviso repetido): nada a fazer, não reenviar e-mail. */
  | { kind: "already_done" }
  /** Precisa de decisão humana: avisar a equipe. */
  | { kind: "alert"; title: string; body: string };

function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function interpretLateConfirmation(
  result: unknown,
  sale: { sale_code: string | null; total_amount: number },
): LatePaymentAction {
  const code = sale.sale_code ?? "";
  switch (result) {
    case "confirmed":
      return { kind: "continue" };
    case "already_paid":
      return { kind: "already_done" };
    case "sold_out":
      return {
        kind: "alert",
        title: "Pagamento recebido sem estoque",
        body: `Venda ${code} (${brl(sale.total_amount)}) foi paga depois do prazo e o lote esgotou. Decida: reembolsar ou liberar o ingresso.`,
      };
    default:
      // invalid_state, not_found ou qualquer resposta inesperada: nunca engolir em silêncio.
      return {
        kind: "alert",
        title: "Pagamento recebido, venda não confirmada",
        body: `Venda ${code} (${brl(sale.total_amount)}) recebeu um pagamento aprovado, mas não pôde ser confirmada automaticamente. Confira no painel.`,
      };
  }
}
