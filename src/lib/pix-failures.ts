// Regra do alerta "falhas recentes na geração de Pix" do painel.
// Fica separada de dashboard-queries.ts para poder ser testada sem banco.

export const PIX_FAILURE_STAGES = ["mp_rejected", "missing_qr_code", "exception"];

export interface PixFailureSaleRow {
  mp_debug_response: string | null;
  mp_payment_id: string | null;
}

/**
 * Uma falha só conta como "ativa" se a venda ficou sem Pix.
 * Se o cliente tentou de novo e o Pix saiu (mp_payment_id preenchido), a falha
 * antiga já foi resolvida e não deve manter a faixa vermelha do painel.
 */
export function isUnresolvedPixFailure(sale: PixFailureSaleRow): boolean {
  if (!sale.mp_debug_response) return false;
  if (sale.mp_payment_id) return false;
  try {
    const parsed = JSON.parse(sale.mp_debug_response) as { stage?: string };
    return !!parsed.stage && PIX_FAILURE_STAGES.includes(parsed.stage);
  } catch {
    return false;
  }
}
