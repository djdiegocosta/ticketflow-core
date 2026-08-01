export type AbandonType = "Não gerou Pix" | "Pix não pago";
export type AbandonStatus = "Não contactado" | "Contactado" | "Convertido" | "Não finalizou";
export type RemarketingPeriod = "24h" | "72h" | "7d";

export type Abandon = {
  id: string;
  name?: string;
  whatsapp?: string;
  event: string;
  lot: string;
  type: AbandonType;
  createdAt: string;
  status: AbandonStatus;
};

export const REMARKETING_EVENTS = ["Festa de Verão", "Show do Ano", "Festival Outono"];

export const PERIOD_LABELS: Record<RemarketingPeriod, string> = {
  "24h": "Últimas 24h",
  "72h": "Últimas 72h",
  "7d": "Última semana",
};

export const PERIOD_METRICS: Record<
  RemarketingPeriod,
  { recoveredRevenue: number; recoveredTickets: number; abandons: number; recoveryRate: number }
> = {
  "24h": { recoveredRevenue: 90, recoveredTickets: 3, abandons: 8, recoveryRate: 11 },
  "72h": { recoveredRevenue: 270, recoveredTickets: 9, abandons: 22, recoveryRate: 14 },
  "7d": { recoveredRevenue: 630, recoveredTickets: 21, abandons: 48, recoveryRate: 16 },
};

export const DEFAULT_TEMPLATES: Record<AbandonType, string> = {
  "Não gerou Pix":
    "Oi {nome}! Vi que você estava de olho no {evento} 👀 Ainda dá tempo de garantir seu ingresso! Precisa de ajuda para finalizar?",
  "Pix não pago":
    "Oi {nome}! Notei que você chegou a gerar o Pix para o {evento} mas não finalizou o pagamento. Posso te ajudar a concluir?",
};

export const MOCK_ABANDONS: Abandon[] = [
  {
    id: "a01",
    name: "João Silva", // Correspondência com Venda 1001 (Comprador)
    whatsapp: "(34) 99123-4567",
    event: "Festa de Verão",
    lot: "1º Lote",
    type: "Pix não pago",
    createdAt: "01/08/2026 16:42",
    status: "Não contactado",
  },
  {
    id: "a02",
    name: "Marina de Souza", // Correspondência com Venda 1001 (Participante)
    whatsapp: "(34) 99999-0000",
    event: "Festa de Verão",
    lot: "1º Lote",
    type: "Não gerou Pix",
    createdAt: "01/08/2026 15:10",
    status: "Não contactado",
  },
  {
    id: "a03",
    name: "Rodrigo de Paula",
    whatsapp: "(34) 99811-2233",
    event: "Show do Ano",
    lot: "Pista",
    type: "Pix não pago",
    createdAt: "01/08/2026 12:05",
    status: "Contactado",
  },
  {
    id: "a04",
    name: "Aline dos Santos",
    event: "Show do Ano",
    lot: "VIP",
    type: "Não gerou Pix",
    createdAt: "31/07/2026 22:31",
    status: "Não contactado",
  },
  {
    id: "a05",
    name: "Bruno Carvalho",
    whatsapp: "(34) 99777-8899",
    event: "Festival Outono",
    lot: "Ingresso único",
    type: "Pix não pago",
    createdAt: "31/07/2026 20:14",
    status: "Convertido",
  },
  {
    id: "a06",
    event: "Show do Ano",
    lot: "Pista",
    type: "Não gerou Pix",
    createdAt: "31/07/2026 18:03",
    status: "Não finalizou",
  },
  {
    id: "a07",
    name: "Larissa Nogueira",
    whatsapp: "(34) 99555-1010",
    event: "Festa de Verão",
    lot: "2º Lote",
    type: "Pix não pago",
    createdAt: "30/07/2026 21:47",
    status: "Contactado",
  },
  {
    id: "a08",
    name: "Felipe da Costa",
    whatsapp: "(34) 99444-2020",
    event: "Festa de Verão",
    lot: "2º Lote",
    type: "Não gerou Pix",
    createdAt: "30/07/2026 19:22",
    status: "Não contactado",
  },
  {
    id: "a09",
    event: "Festival Outono",
    lot: "Ingresso único",
    type: "Não gerou Pix",
    createdAt: "30/07/2026 11:08",
    status: "Não finalizou",
  },
  {
    id: "a10",
    name: "Camila de Andrade",
    whatsapp: "(34) 99333-3030",
    event: "Show do Ano",
    lot: "VIP",
    type: "Pix não pago",
    createdAt: "29/07/2026 23:55",
    status: "Convertido",
  },
  {
    id: "a11",
    name: "Igor Machado",
    whatsapp: "(34) 99222-4040",
    event: "Festival Outono",
    lot: "Ingresso único",
    type: "Pix não pago",
    createdAt: "29/07/2026 17:36",
    status: "Não contactado",
  },
  {
    id: "a12",
    name: "Sofia das Neves",
    event: "Festa de Verão",
    lot: "1º Lote",
    type: "Não gerou Pix",
    createdAt: "28/07/2026 14:19",
    status: "Contactado",
  },
];

export function buildMessage(template: string, data: { name?: string | undefined; event: string; lot: string }) {
  return template
    .replaceAll("{nome}", data.name ?? "tudo bem")
    .replaceAll("{evento}", data.event)
    .replaceAll("{lote}", data.lot);
}
