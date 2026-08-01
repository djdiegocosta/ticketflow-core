export type SaleOrigin = "TicketFlow" | "Manual" | "Bilheteria" | "Importada";
export type SaleStatus = "Pago" | "Pendente" | "Cancelado";

export type SaleTicket = {
  code: string;
  participantName: string;
  checkedIn: boolean;
};

export type Sale = {
  id: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerEmail?: string;
  eventName: string;
  lotName: string;
  origin: SaleOrigin;
  quantity: number;
  amount: number;
  status: SaleStatus;
  createdAt: string;
  paymentMethod: string;
  note?: string;
  tickets: SaleTicket[];
};

export const EVENTS = [
  {
    id: "1",
    name: "Festa de Verão",
    lots: [
      { id: "1a", name: "1º Lote", price: 90 },
      { id: "1b", name: "2º Lote", price: 110 },
    ],
  },
  {
    id: "2",
    name: "Show do Ano",
    lots: [
      { id: "2a", name: "Pista", price: 90 },
      { id: "2b", name: "VIP", price: 180 },
    ],
  },
  {
    id: "3",
    name: "Festival Outono",
    lots: [{ id: "3a", name: "Ingresso único", price: 70 }],
  },
];

const ticket = (code: string, participantName: string, checkedIn = false): SaleTicket => ({
  code,
  participantName,
  checkedIn,
});

export const MOCK_SALES: Sale[] = [
  {
    id: "1001",
    buyerName: "João Silva",
    buyerWhatsapp: "(34) 99123-4567",
    buyerEmail: "joao.silva@email.com",
    eventName: "Festa de Verão",
    lotName: "1º Lote",
    origin: "TicketFlow",
    quantity: 2,
    amount: 180,
    status: "Pago",
    createdAt: "28/07/2026 19:42",
    paymentMethod: "Pix",
    tickets: [ticket("TF-2A9F-0011", "João Silva"), ticket("TF-2A9F-0012", "Marina de Souza", true)],
  },
  {
    id: "1002",
    buyerName: "Maria Souza",
    buyerWhatsapp: "(34) 99811-2233",
    buyerEmail: "maria@email.com",
    eventName: "Festa de Verão",
    lotName: "1º Lote",
    origin: "TicketFlow",
    quantity: 1,
    amount: 90,
    status: "Pendente",
    createdAt: "28/07/2026 18:10",
    paymentMethod: "Pix",
    tickets: [ticket("TF-3B1C-0021", "Maria Souza")],
  },
  {
    id: "1003",
    buyerName: "Carlos Mendes",
    buyerWhatsapp: "(34) 99777-8899",
    eventName: "Show do Ano",
    lotName: "Pista",
    origin: "Manual",
    quantity: 4,
    amount: 360,
    status: "Pago",
    createdAt: "27/07/2026 21:05",
    paymentMethod: "Dinheiro",
    note: "Pagamento recebido na sede.",
    tickets: [
      ticket("TF-7D2E-0031", "Carlos Mendes"),
      ticket("TF-7D2E-0032", "Aline dos Santos"),
      ticket("TF-7D2E-0033", "Bruno Carvalho", true),
      ticket("TF-7D2E-0034", "Débora e Silva"),
    ],
  },
  {
    id: "1004",
    buyerName: "Ana Lima",
    buyerWhatsapp: "(34) 99555-1010",
    buyerEmail: "ana.lima@email.com",
    eventName: "Festa de Verão",
    lotName: "2º Lote",
    origin: "Bilheteria",
    quantity: 2,
    amount: 220,
    status: "Pago",
    createdAt: "27/07/2026 20:31",
    paymentMethod: "Cartão",
    tickets: [ticket("TF-9F4A-0041", "Ana Lima"), ticket("TF-9F4A-0042", "Rodrigo de Paula")],
  },
  {
    id: "1005",
    buyerName: "Pedro Costa",
    buyerWhatsapp: "(34) 99444-2020",
    eventName: "Show do Ano",
    lotName: "VIP",
    origin: "TicketFlow",
    quantity: 1,
    amount: 180,
    status: "Cancelado",
    createdAt: "26/07/2026 15:20",
    paymentMethod: "Pix",
    tickets: [ticket("TF-1E8B-0051", "Pedro Costa")],
  },
  {
    id: "1006",
    buyerName: "Juliana Ramos",
    buyerWhatsapp: "(34) 99333-3030",
    buyerEmail: "juliana@email.com",
    eventName: "Festa de Verão",
    lotName: "1º Lote",
    origin: "TicketFlow",
    quantity: 3,
    amount: 270,
    status: "Pago",
    createdAt: "26/07/2026 11:48",
    paymentMethod: "Pix",
    tickets: [
      ticket("TF-5C6D-0061", "Juliana Ramos"),
      ticket("TF-5C6D-0062", "Felipe da Costa"),
      ticket("TF-5C6D-0063", "Larissa Nogueira"),
    ],
  },
  {
    id: "1007",
    buyerName: "Rafael Oliveira",
    buyerWhatsapp: "(34) 99222-4040",
    eventName: "Show do Ano",
    lotName: "Pista",
    origin: "Importada",
    quantity: 2,
    amount: 160,
    status: "Pago",
    createdAt: "25/07/2026 09:14",
    paymentMethod: "Outro",
    note: "Importado da planilha de pré-venda.",
    tickets: [ticket("TF-8A3F-0071", "Rafael Oliveira"), ticket("TF-8A3F-0072", "Camila de Andrade")],
  },
  {
    id: "1008",
    buyerName: "Camila Ferreira",
    buyerWhatsapp: "(34) 99111-5050",
    eventName: "Festa de Verão",
    lotName: "2º Lote",
    origin: "Manual",
    quantity: 1,
    amount: 110,
    status: "Pendente",
    createdAt: "24/07/2026 22:02",
    paymentMethod: "Pix manual",
    tickets: [ticket("TF-4B7C-0081", "Camila Ferreira")],
  },
  {
    id: "1009",
    buyerName: "Thiago Barbosa",
    buyerWhatsapp: "(34) 98888-6060",
    eventName: "Festival Outono",
    lotName: "Ingresso único",
    origin: "Bilheteria",
    quantity: 5,
    amount: 350,
    status: "Pago",
    createdAt: "24/07/2026 14:37",
    paymentMethod: "Dinheiro",
    tickets: [
      ticket("TF-6E9A-0091", "Thiago Barbosa"),
      ticket("TF-6E9A-0092", "Vanessa do Carmo"),
      ticket("TF-6E9A-0093", "Igor Machado"),
      ticket("TF-6E9A-0094", "Sofia das Neves"),
      ticket("TF-6E9A-0095", "Otávio Lins"),
    ],
  },
  {
    id: "1010",
    buyerName: "Beatriz Almeida",
    buyerWhatsapp: "(34) 98777-7070",
    buyerEmail: "bia@email.com",
    eventName: "Show do Ano",
    lotName: "VIP",
    origin: "TicketFlow",
    quantity: 2,
    amount: 360,
    status: "Pago",
    createdAt: "23/07/2026 17:55",
    paymentMethod: "Cartão",
    tickets: [ticket("TF-2F5D-0101", "Beatriz Almeida"), ticket("TF-2F5D-0102", "Henrique de Moura")],
  },
  {
    id: "1011",
    buyerName: "Lucas Pereira",
    buyerWhatsapp: "(34) 98666-8080",
    eventName: "Festival Outono",
    lotName: "Ingresso único",
    origin: "Importada",
    quantity: 1,
    amount: 70,
    status: "Cancelado",
    createdAt: "22/07/2026 10:23",
    paymentMethod: "Outro",
    tickets: [ticket("TF-7C1B-0111", "Lucas Pereira")],
  },
  {
    id: "1012",
    buyerName: "Fernanda Dias",
    buyerWhatsapp: "(34) 98555-9090",
    eventName: "Festa de Verão",
    lotName: "1º Lote",
    origin: "Manual",
    quantity: 3,
    amount: 270,
    status: "Pago",
    createdAt: "21/07/2026 20:41",
    paymentMethod: "Pix manual",
    tickets: [
      ticket("TF-3D8E-0121", "Fernanda Dias"),
      ticket("TF-3D8E-0122", "Gustavo de Lima"),
      ticket("TF-3D8E-0123", "Patrícia da Rocha"),
    ],
  },
];

export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
