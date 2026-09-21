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
 * Ver /docs/HISTORICO-DE-EVENTOS.md para o status completo da ferramenta.
 */

export interface MockEventHistorySummary {
  id: string;
  title: string;
  date: string; // ISO
  venue: string;
  city: string;
  coverImage: string;
  status: "encerrado";
  closedAt: string; // ISO
  attendance: number;
  ticketsSold: number;
  revenue: number;
  result: number;
}

export interface MockEventHistoryDetail extends MockEventHistorySummary {
  audience: {
    presale: number;
    boxOffice: number;
    courtesies: number;
  };
  batches: Array<{
    name: string;
    quantity: number;
    unitValue: number;
  }>;
  finance: {
    ticketsRevenue: number;
    barRevenue: number;
    costs: {
      attractions: number;
      venue: number;
      soundAndLighting: number;
      security: number;
      staff: number;
      marketing: number;
      structure: number;
      barCost: number;
      other: number;
    };
  };
  bar: {
    totalSales: number;
    productCost: number;
    consumers: number;
  };
  notes: string;
}

// Dados fictícios — não representam eventos, vendas ou valores reais.
const EVENT_1: MockEventHistorySummary = {
  id: "mock-1",
  title: "É o Beat",
  date: "2026-09-19",
  venue: "Clube União",
  city: "Itaocara/RJ",
  coverImage:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop",
  status: "encerrado",
  closedAt: "2026-09-20",
  attendance: 327,
  ticketsSold: 291,
  revenue: 24680,
  result: 8420,
};

const EVENT_2: MockEventHistorySummary = {
  id: "mock-2",
  title: "Sunset Session",
  date: "2026-08-15",
  venue: "Espaço Vila Aberta",
  city: "Nova Friburgo/RJ",
  coverImage:
    "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?q=80&w=800&auto=format&fit=crop",
  status: "encerrado",
  closedAt: "2026-08-16",
  attendance: 212,
  ticketsSold: 198,
  revenue: 15840,
  result: 4120,
};

const EVENT_3: MockEventHistorySummary = {
  id: "mock-3",
  title: "Baile do Dudu",
  date: "2026-07-04",
  venue: "Chácara Recanto",
  city: "Cantagalo/RJ",
  coverImage:
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop",
  status: "encerrado",
  closedAt: "2026-07-05",
  attendance: 540,
  ticketsSold: 501,
  revenue: 41200,
  result: -2300,
};

export const MOCK_EVENT_HISTORY_LIST: MockEventHistorySummary[] = [EVENT_1, EVENT_2, EVENT_3];

export const MOCK_EVENT_HISTORY_DETAIL: Record<string, MockEventHistoryDetail> = {
  "mock-1": {
    ...EVENT_1,
    audience: { presale: 241, boxOffice: 50, courtesies: 36 },
    batches: [
      { name: "1º lote", quantity: 20, unitValue: 20 },
      { name: "2º lote", quantity: 30, unitValue: 25 },
      { name: "3º lote", quantity: 50, unitValue: 30 },
      { name: "Porta", quantity: 50, unitValue: 35 },
    ],
    finance: {
      ticketsRevenue: 14680,
      barRevenue: 10000,
      costs: {
        attractions: 8000,
        venue: 3000,
        soundAndLighting: 2000,
        security: 1200,
        staff: 800,
        marketing: 600,
        structure: 1000,
        barCost: 5000,
        other: 500,
      },
    },
    bar: { totalSales: 10000, productCost: 5000, consumers: 327 },
    notes:
      "Casa cheia a partir de 00h. Bar teve maior movimento entre 00h30 e 02h. 2º lote esgotou rapidamente.",
  },
  "mock-2": {
    ...EVENT_2,
    audience: { presale: 160, boxOffice: 38, courtesies: 14 },
    batches: [
      { name: "1º lote", quantity: 40, unitValue: 25 },
      { name: "2º lote", quantity: 60, unitValue: 30 },
      { name: "Porta", quantity: 98, unitValue: 40 },
    ],
    finance: {
      ticketsRevenue: 8840,
      barRevenue: 7000,
      costs: {
        attractions: 4500,
        venue: 2000,
        soundAndLighting: 1200,
        security: 800,
        staff: 600,
        marketing: 400,
        structure: 500,
        barCost: 3500,
        other: 200,
      },
    },
    bar: { totalSales: 7000, productCost: 3500, consumers: 212 },
    notes: "Público chegou cedo. Pico de bar logo após o pôr do sol.",
  },
  "mock-3": {
    ...EVENT_3,
    audience: { presale: 380, boxOffice: 90, courtesies: 31 },
    batches: [
      { name: "1º lote", quantity: 100, unitValue: 20 },
      { name: "2º lote", quantity: 150, unitValue: 25 },
      { name: "3º lote", quantity: 130, unitValue: 30 },
      { name: "Porta", quantity: 121, unitValue: 35 },
    ],
    finance: {
      ticketsRevenue: 26200,
      barRevenue: 15000,
      costs: {
        attractions: 22000,
        venue: 6000,
        soundAndLighting: 4500,
        security: 2500,
        staff: 1800,
        marketing: 1500,
        structure: 2000,
        barCost: 7500,
        other: 1200,
      },
    },
    bar: { totalSales: 15000, productCost: 7500, consumers: 540 },
    notes: "Custo de atração acima do orçado. Resultado negativo neste evento.",
  },
};
