export type UserRoleType = "Admin" | "Colaborador" | "Operador de Check-in";
export type UserStatus = "Ativo" | "Convite pendente";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  invitedAt: string;
  status: UserStatus;
}

export const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Carlos Eduardo Oliveira",
    email: "carlos.eduardo@ticketflow.com",
    role: "Admin",
    invitedAt: "10/05/2026 14:30",
    status: "Ativo",
  },
  {
    id: "2",
    name: "Ana Beatriz Santos",
    email: "ana.beatriz@ticketflow.com",
    role: "Admin",
    invitedAt: "12/05/2026 09:15",
    status: "Ativo",
  },
  {
    id: "3",
    name: "Ricardo Mendes Silva",
    email: "ricardo.mendes@ticketflow.com",
    role: "Colaborador",
    invitedAt: "15/07/2026 16:45",
    status: "Ativo",
  },
  {
    id: "4",
    name: "Mariana Costa Lima",
    email: "mariana.costa@ticketflow.com",
    role: "Colaborador",
    invitedAt: "01/08/2026 10:00",
    status: "Convite pendente",
  },
  {
    id: "5",
    name: "Joao Operador",
    email: "checkin@ticketflow.com",
    role: "Operador de Check-in",
    invitedAt: "05/08/2026 11:00",
    status: "Ativo",
  },
];
