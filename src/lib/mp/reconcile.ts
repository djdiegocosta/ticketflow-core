// Conferência entre as vendas do sistema e os pagamentos do Mercado Pago.
// Lógica pura (sem rede nem banco) para poder ser testada.

export interface ReconcileSale {
  id: string;
  sale_code: string | null;
  status: string;
  total_amount: number;
  mp_payment_id: string;
  created_at: string;
  buyer_name: string | null;
}

export interface MpPaymentSnapshot {
  status: string;
  amount: number | null;
  externalReference: string | null;
}

export type DiscrepancyKind =
  | "pago_no_mp_nao_confirmado"
  | "valor_diferente"
  | "referencia_diferente"
  | "confirmado_sem_aprovacao_no_mp"
  | "consulta_falhou";

export interface Discrepancy {
  kind: DiscrepancyKind;
  severity: "critico" | "importante" | "aviso";
  saleId: string;
  saleCode: string | null;
  buyerName: string | null;
  saleStatus: string;
  saleAmount: number;
  mpPaymentId: string;
  mpStatus: string | null;
  mpAmount: number | null;
  createdAt: string;
  detail: string;
}

export function classifySale(
  sale: ReconcileSale,
  payment: MpPaymentSnapshot | null,
  lookupError?: string,
): Discrepancy | null {
  const base = {
    saleId: sale.id,
    saleCode: sale.sale_code,
    buyerName: sale.buyer_name,
    saleStatus: sale.status,
    saleAmount: Number(sale.total_amount),
    mpPaymentId: sale.mp_payment_id,
    createdAt: sale.created_at,
  };

  if (!payment) {
    return {
      ...base,
      kind: "consulta_falhou",
      severity: "aviso",
      mpStatus: null,
      mpAmount: null,
      detail: lookupError ?? "Não foi possível consultar este pagamento no Mercado Pago.",
    };
  }

  const mp = { mpStatus: payment.status, mpAmount: payment.amount };

  if (payment.status === "approved" && sale.status !== "pago") {
    if (payment.externalReference && payment.externalReference !== sale.id) {
      return {
        ...base,
        ...mp,
        kind: "referencia_diferente",
        severity: "critico",
        detail: "Pagamento aprovado no Mercado Pago, mas ligado a outra venda. Conferir manualmente.",
      };
    }
    if (payment.amount === null || payment.amount !== Number(sale.total_amount)) {
      return {
        ...base,
        ...mp,
        kind: "valor_diferente",
        severity: "critico",
        detail: "Pagamento aprovado no Mercado Pago com valor diferente do da venda. Conferir manualmente.",
      };
    }
    return {
      ...base,
      ...mp,
      kind: "pago_no_mp_nao_confirmado",
      severity: "critico",
      detail: "O cliente pagou no Mercado Pago, mas a venda não foi confirmada no sistema.",
    };
  }

  if (sale.status === "pago" && payment.status !== "approved") {
    return {
      ...base,
      ...mp,
      kind: "confirmado_sem_aprovacao_no_mp",
      severity: "importante",
      detail: `Venda confirmada no sistema, mas o Mercado Pago mostra o pagamento como "${payment.status}" (estorno, contestação ou cancelamento).`,
    };
  }

  return null;
}

const SEVERITY_ORDER = { critico: 0, importante: 1, aviso: 2 } as const;

export function sortDiscrepancies(items: Discrepancy[]): Discrepancy[] {
  return [...items].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.createdAt.localeCompare(a.createdAt),
  );
}
