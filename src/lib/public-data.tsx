import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Ticket {
  id: string;
  ticket_code: string;
  participant_name: string;
  event_name: string;
  event_date: string;
  event_location: string;
  status: 'Válido' | 'Utilizado' | 'Cancelado';
}

export interface Sale {
  id: string;
  sale_code: string;
  event_slug: string;
  event_name: string;
  event_date: string;
  amount_paid: number;
  quantity: number;
  status: 'pendente' | 'pago' | 'cancelado';
  tickets: Ticket[];
}

interface PublicDataContextType {
  sales: Sale[];
  addSale: (sale: Sale) => void;
  getSaleByCode: (code: string) => Sale | undefined;
  getTicketByCode: (code: string) => Ticket | undefined;
}

const PublicDataContext = createContext<PublicDataContextType | undefined>(undefined);

// Mock initial data
const MOCK_SALES: Sale[] = [
  {
    id: 's1',
    sale_code: 'TF-123456',
    event_slug: 'festa-de-verao',
    event_name: 'Festa de Verão',
    event_date: '2026-12-20T22:00:00',
    amount_paid: 150,
    quantity: 2,
    status: 'pago',
    tickets: [
      {
        id: 't1',
        ticket_code: 'TKT-789-ABC',
        participant_name: 'Adriano de Araújo',
        event_name: 'Festa de Verão',
        event_date: '2026-12-20T22:00:00',
        event_location: 'Arena Praia, Guarujá',
        status: 'Válido'
      },
      {
        id: 't2',
        ticket_code: 'TKT-789-DEF',
        participant_name: 'Mariana Silva',
        event_name: 'Festa de Verão',
        event_date: '2026-12-20T22:00:00',
        event_location: 'Arena Praia, Guarujá',
        status: 'Válido'
      }
    ]
  }
];

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>(MOCK_SALES);

  useEffect(() => {
    const saved = localStorage.getItem('ticketflow_public_sales');
    if (saved) {
      try {
        setSales(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved sales", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ticketflow_public_sales', JSON.stringify(sales));
  }, [sales]);

  const addSale = (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
  };

  const getSaleByCode = (code: string) => {
    return sales.find(s => s.sale_code.toUpperCase() === code.toUpperCase());
  };

  const getTicketByCode = (code: string) => {
    for (const sale of sales) {
      const ticket = sale.tickets.find(t => t.ticket_code.toUpperCase() === code.toUpperCase());
      if (ticket) return ticket;
    }
    return undefined;
  };

  return (
    <PublicDataContext.Provider value={{ sales, addSale, getSaleByCode, getTicketByCode }}>
      {children}
    </PublicDataContext.Provider>
  );
}

export function usePublicData() {
  const context = useContext(PublicDataContext);
  if (context === undefined) {
    throw new Error('usePublicData must be used within a PublicDataProvider');
  }
  return context;
}
