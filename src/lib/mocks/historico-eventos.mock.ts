/**
 * MOCK — Histórico de Eventos (etapa visual)
 * ---------------------------------------------------------------------------
 * Dados fictícios, isolados neste arquivo, usados apenas para construir a
 * interface visual da ferramenta "Histórico de Eventos".
 *
 * NÃO há integração com banco de dados, RPCs ou tabelas reais aqui.
 * Quando a etapa de dados reais for implementada, este arquivo deixa de ser
 * usado e é substituído por consultas reais (ex.: `historico-eventos-queries.ts`).
 *
 * Ver /docs/HISTORICO-DE-EVENTOS.md para o status completo da ferramenta,
 * incluindo a definição de cada indicador e quais dados serão informados
 * manualmente no encerramento do evento.
 */

export interface MockEventHistorySummary {
  id: string;
  title: string;
  date: string; // ISO
  venue: string;
  city: string;
  /** Usada apenas na miniatura da lista — o cabeçalho do detalhe não exibe imagem. */
  coverImage: string;
  status: "encerrado";
  closedAt: string; // ISO
  /** Público presente — comparecimento real, informado manualmente no encerramento. */
  attendancePresent: number;
  /** Ingressos pagos (antecipados + bilheteria), sem contar cortesias. */
  ticketsSold: number;
  /** Receita total (ingressos + bar). */
  revenue: number;
  /** Resultado líquido do evento. */
  result: number;
}

export interface MockEventHistoryDetail extends MockEventHistorySummary {
  audience: {
    presale: number;
    /** Bilheteria — dado MANUAL informado pelo produtor no encerramento, não vem do TicketFlow. */
    boxOffice: number;
    courtesies: number;
  };
  /** Lotes vendidos pelo TicketFlow (não inclui bilheteria). */
  batches: Array<{
    name: string;
    quantity: number;
    unitValue: number;
  }>;
  /** Bilheteria — dado MANUAL informado no encerramento. */
  boxOfficeSale: {
    quantity: number;
    revenue: number;
  };
  finance: {
    ticketsRevenue: number;
    barRevenue: number;
    /** Custo total do evento (dado único, informado manualmente no encerramento). */
    eventCost: number;
    /** Custo dos produtos vendidos no bar (dado MANUAL — nunca um percentual fixo). */
    barCost: number;
  };
  bar: {
    totalSales: number;
    productCost: number;
  };
  notes: string;
}

// Dados fictícios — não representam eventos, vendas ou valores reais.
// Inclui casos de valores pequenos, médios e grandes para validar o layout dos KPIs.
const EVENT_1: MockEventHistorySummary = {
  id: "mock-1",
  coverImage:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
  title: "É o Beat",
  date: "2026-09-19",
  venue: "Clube União",
  city: "Itaocara/RJ",
  status: "encerrado",
  closedAt: "2026-09-20",
  attendancePresent: 307,
  ticketsSold: 291,
  revenue: 25460,
  result: 3360,
};

const EVENT_2: MockEventHistorySummary = {
  id: "mock-2",
  coverImage:
    "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?q=80&w=800&auto=format&fit=crop",
  title: "Sunset Session",
  date: "2026-08-15",
  venue: "Espaço Vila Aberta",
  city: "Nova Friburgo/RJ",
  status: "encerrado",
  closedAt: "2026-08-16",
  attendancePresent: 180,
  ticketsSold: 198,
  revenue: 12780,
  result: 3480,
};

const EVENT_3: MockEventHistorySummary = {
  id: "mock-3",
  coverImage:
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop",
  title: "Baile do Dudu",
  date: "2026-07-04",
  venue: "Chácara Recanto",
  city: "Cantagalo/RJ",
  status: "encerrado",
  closedAt: "2026-07-05",
  attendancePresent: 2450,
  ticketsSold: 2600,
  revenue: 124680,
  result: -18320,
};

const EVENT_4: MockEventHistorySummary = {
  id: "mock-4",
  coverImage:
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop",
  title: "Festival Verão RJ",
  date: "2026-01-10",
  venue: "Orla de Macaé",
  city: "Macaé/RJ",
  status: "encerrado",
  closedAt: "2026-01-11",
  attendancePresent: 7000,
  ticketsSold: 7500,
  revenue: 1245800,
  result: 385800,
};

export const MOCK_EVENT_HISTORY_LIST: MockEventHistorySummary[] = [EVENT_1, EVENT_2, EVENT_3, EVENT_4];

export const MOCK_EVENT_HISTORY_DETAIL: Record<string, MockEventHistoryDetail> = {
  "mock-1": {
    ...EVENT_1,
    audience: { presale: 241, boxOffice: 50, courtesies: 36 },
    batches: [
      { name: "1º lote", quantity: 80, unitValue: 40 },
      { name: "2º lote", quantity: 90, unitValue: 50 },
      { name: "3º lote", quantity: 71, unitValue: 60 },
    ],
    boxOfficeSale: { quantity: 50, revenue: 3500 },
    finance: { ticketsRevenue: 15460, barRevenue: 10000, eventCost: 17100, barCost: 5000 },
    bar: { totalSales: 10000, productCost: 5000 },
    notes:
      "Casa cheia a partir de 00h. Bar teve maior movimento entre 00h30 e 02h. 2º lote esgotou rapidamente.",
  },
  "mock-2": {
    ...EVENT_2,
    audience: { presale: 160, boxOffice: 38, courtesies: 14 },
    batches: [
      { name: "1º lote", quantity: 70, unitValue: 25 },
      { name: "2º lote", quantity: 90, unitValue: 30 },
    ],
    boxOfficeSale: { quantity: 38, revenue: 1330 },
    finance: { ticketsRevenue: 5780, barRevenue: 7000, eventCost: 6500, barCost: 2800 },
    bar: { totalSales: 7000, productCost: 2800 },
    notes: "Público chegou cedo. Pico de bar logo após o pôr do sol.",
  },
  "mock-3": {
    ...EVENT_3,
    audience: { presale: 1800, boxOffice: 800, courtesies: 150 },
    batches: [
      { name: "1º lote", quantity: 600, unitValue: 30 },
      { name: "2º lote", quantity: 650, unitValue: 35 },
      { name: "3º lote", quantity: 550, unitValue: 40 },
    ],
    boxOfficeSale: { quantity: 800, revenue: 31930 },
    finance: { ticketsRevenue: 94680, barRevenue: 30000, eventCost: 125000, barCost: 18000 },
    bar: { totalSales: 30000, productCost: 18000 },
    notes: "Custo de atração acima do orçado. Resultado negativo neste evento — revisar cachê para a próxima edição.",
  },
  "mock-4": {
    ...EVENT_4,
    audience: { presale: 6000, boxOffice: 1500, courtesies: 500 },
    batches: [
      { name: "1º lote", quantity: 2000, unitValue: 60 },
      { name: "2º lote", quantity: 2200, unitValue: 70 },
      { name: "3º lote", quantity: 1800, unitValue: 80 },
    ],
    boxOfficeSale: { quantity: 1500, revenue: 427800 },
    finance: { ticketsRevenue: 845800, barRevenue: 400000, eventCost: 700000, barCost: 160000 },
    bar: { totalSales: 400000, productCost: 160000 },
    notes: "Maior evento da temporada. Estrutura de bar ampliada funcionou bem mesmo com o público acima da média.",
  },
};
