// Reserva expirada não pode impedir quem quer pagar.
// O prazo da reserva serve para criar urgência, não como barreira de compra.
// Lógica pura (sem rede nem banco) para poder ser testada.

export type ReopenResult =
  | "ok"
  | "reopened"
  | "sold_out"
  | "already_paid"
  | "invalid_state"
  | "not_found";

export type ReopenDecision = { proceed: true } | { proceed: false; message: string };

export function decideReopen(result: unknown): ReopenDecision {
  switch (result) {
    case "ok":
    case "reopened":
      return { proceed: true };
    case "sold_out":
      return { proceed: false, message: "Os ingressos deste lote esgotaram. Escolha outro lote para continuar." };
    case "already_paid":
      return { proceed: false, message: "A venda já foi processada" };
    default:
      // invalid_state, not_found ou resposta inesperada
      return { proceed: false, message: "Esta reserva não está mais disponível." };
  }
}
