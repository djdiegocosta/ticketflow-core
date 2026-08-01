export type Client = {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  age: number;
  totalEvents: number;
  totalTickets: number;
  totalSpent: number;
  lastEvent: string;
  lastPurchaseAt: string;
  avatarUrl?: string;
};

export const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "Mariana Costa Silva", whatsapp: "(34) 99123-4567", email: "mariana@email.com", age: 29, totalEvents: 9, totalTickets: 24, totalSpent: 2640, lastEvent: "Festa de Verão", lastPurchaseAt: "28/07/2026" },
  { id: "c2", name: "João Pedro Almeida", whatsapp: "(34) 99811-2233", email: "joaopedro@email.com", age: 34, totalEvents: 7, totalTickets: 19, totalSpent: 2310, lastEvent: "Show do Ano", lastPurchaseAt: "27/07/2026" },
  { id: "c3", name: "Beatriz Santos Lima", whatsapp: "(34) 99777-8899", email: "beatriz@email.com", age: 26, totalEvents: 6, totalTickets: 17, totalSpent: 1980, lastEvent: "Festa de Verão", lastPurchaseAt: "27/07/2026" },
  { id: "c4", name: "Rafael Oliveira Souza", whatsapp: "(34) 99555-1010", age: 31, totalEvents: 6, totalTickets: 15, totalSpent: 1725, lastEvent: "Festival Outono", lastPurchaseAt: "25/07/2026" },
  { id: "c5", name: "Camila Ferreira", whatsapp: "(34) 99111-5050", email: "camila@email.com", age: 24, totalEvents: 5, totalTickets: 14, totalSpent: 1540, lastEvent: "Festa de Verão", lastPurchaseAt: "24/07/2026" },
  { id: "c6", name: "Lucas Mendes", whatsapp: "(34) 99444-2020", age: 38, totalEvents: 5, totalTickets: 12, totalSpent: 1320, lastEvent: "Show do Ano", lastPurchaseAt: "23/07/2026" },
  { id: "c7", name: "Juliana Ramos", whatsapp: "(34) 99333-3030", email: "juliana@email.com", age: 27, totalEvents: 4, totalTickets: 11, totalSpent: 1210, lastEvent: "Festa de Verão", lastPurchaseAt: "26/07/2026" },
  { id: "c8", name: "Pedro Henrique Costa", whatsapp: "(34) 98888-6060", age: 41, totalEvents: 4, totalTickets: 9, totalSpent: 900, lastEvent: "Festival Outono", lastPurchaseAt: "22/07/2026" },
  { id: "c9", name: "Ana Carolina Dias", whatsapp: "(34) 98777-7070", email: "anacarolina@email.com", age: 22, totalEvents: 3, totalTickets: 8, totalSpent: 880, lastEvent: "Show do Ano", lastPurchaseAt: "21/07/2026" },
  { id: "c10", name: "Rodrigo Alves", whatsapp: "(34) 98666-8080", age: 36, totalEvents: 3, totalTickets: 7, totalSpent: 700, lastEvent: "Festa de Verão", lastPurchaseAt: "20/07/2026" },
  { id: "c11", name: "Fernanda Dias", whatsapp: "(34) 98555-9090", email: "fernanda@email.com", age: 30, totalEvents: 3, totalTickets: 6, totalSpent: 660, lastEvent: "Festa de Verão", lastPurchaseAt: "19/07/2026" },
  { id: "c12", name: "Thiago Barbosa", whatsapp: "(34) 98444-1122", age: 45, totalEvents: 2, totalTickets: 6, totalSpent: 420, lastEvent: "Festival Outono", lastPurchaseAt: "18/07/2026" },
  { id: "c13", name: "Larissa Nogueira", whatsapp: "(34) 98333-2211", email: "larissa@email.com", age: 25, totalEvents: 2, totalTickets: 5, totalSpent: 550, lastEvent: "Show do Ano", lastPurchaseAt: "17/07/2026" },
  { id: "c14", name: "Gustavo de Lima", whatsapp: "(34) 98222-3344", age: 33, totalEvents: 2, totalTickets: 5, totalSpent: 470, lastEvent: "Festa de Verão", lastPurchaseAt: "16/07/2026" },
  { id: "c15", name: "Patrícia da Rocha", whatsapp: "(34) 98111-4455", email: "patricia@email.com", age: 39, totalEvents: 2, totalTickets: 4, totalSpent: 440, lastEvent: "Festa de Verão", lastPurchaseAt: "15/07/2026" },
  { id: "c16", name: "Henrique de Moura", whatsapp: "(34) 97999-5566", age: 28, totalEvents: 2, totalTickets: 4, totalSpent: 720, lastEvent: "Show do Ano", lastPurchaseAt: "14/07/2026" },
  { id: "c17", name: "Vanessa do Carmo", whatsapp: "(34) 97888-6677", email: "vanessa@email.com", age: 23, totalEvents: 2, totalTickets: 4, totalSpent: 280, lastEvent: "Festival Outono", lastPurchaseAt: "13/07/2026" },
  { id: "c18", name: "Igor Machado", whatsapp: "(34) 97777-7788", age: 35, totalEvents: 1, totalTickets: 3, totalSpent: 210, lastEvent: "Festival Outono", lastPurchaseAt: "12/07/2026" },
  { id: "c19", name: "Sofia das Neves", whatsapp: "(34) 97666-8899", email: "sofia@email.com", age: 21, totalEvents: 1, totalTickets: 3, totalSpent: 330, lastEvent: "Festa de Verão", lastPurchaseAt: "11/07/2026" },
  { id: "c20", name: "Otávio Lins", whatsapp: "(34) 97555-9900", age: 47, totalEvents: 1, totalTickets: 2, totalSpent: 140, lastEvent: "Festival Outono", lastPurchaseAt: "10/07/2026" },
  { id: "c21", name: "Aline dos Santos", whatsapp: "(34) 97444-1010", email: "aline@email.com", age: 32, totalEvents: 1, totalTickets: 2, totalSpent: 180, lastEvent: "Show do Ano", lastPurchaseAt: "09/07/2026" },
  { id: "c22", name: "Bruno Carvalho", whatsapp: "(34) 97333-2020", age: 40, totalEvents: 1, totalTickets: 2, totalSpent: 180, lastEvent: "Show do Ano", lastPurchaseAt: "08/07/2026" },
  { id: "c23", name: "Débora e Silva", whatsapp: "(34) 97222-3030", email: "debora@email.com", age: 37, totalEvents: 1, totalTickets: 2, totalSpent: 220, lastEvent: "Festa de Verão", lastPurchaseAt: "07/07/2026" },
  { id: "c24", name: "Rodrigo de Paula", whatsapp: "(34) 97111-4040", age: 29, totalEvents: 1, totalTickets: 1, totalSpent: 110, lastEvent: "Festa de Verão", lastPurchaseAt: "06/07/2026" },
  { id: "c25", name: "Marina de Souza", whatsapp: "(34) 96999-5050", email: "marina@email.com", age: 26, totalEvents: 1, totalTickets: 1, totalSpent: 90, lastEvent: "Festa de Verão", lastPurchaseAt: "05/07/2026" },
  { id: "c26", name: "Felipe da Costa", whatsapp: "(34) 96888-6060", age: 44, totalEvents: 1, totalTickets: 1, totalSpent: 90, lastEvent: "Festa de Verão", lastPurchaseAt: "04/07/2026" },
  { id: "c27", name: "Carlos Mendes", whatsapp: "(34) 96777-7070", email: "carlos@email.com", age: 50, totalEvents: 1, totalTickets: 1, totalSpent: 90, lastEvent: "Show do Ano", lastPurchaseAt: "03/07/2026" },
  { id: "c28", name: "Ana Lima", whatsapp: "(34) 96666-8080", age: 31, totalEvents: 1, totalTickets: 1, totalSpent: 110, lastEvent: "Festa de Verão", lastPurchaseAt: "02/07/2026" },
];

export const TOP_CLIENTS = [...MOCK_CLIENTS]
  .sort((a, b) => b.totalTickets - a.totalTickets)
  .slice(0, 10);

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function whatsappLink(whatsapp: string) {
  return `https://wa.me/55${whatsapp.replace(/\D/g, "")}`;
}
