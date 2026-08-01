import { Gift, CheckCircle } from "lucide-react";

export interface Courtesy {
  id: string;
  name: string;
  event: string;
  issuedAt: string;
  checkinStatus: "Pendente" | "Realizado";
}

export const MOCK_COURTESIES: Courtesy[] = [
  {
    id: "1",
    name: "Adriano de Araújo",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-01T10:00:00Z",
    checkinStatus: "Realizado",
  },
  {
    id: "2",
    name: "Beatriz Silva",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-01T11:30:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "3",
    name: "Carlos Eduardo",
    event: "Festival de Jazz",
    issuedAt: "2024-05-02T09:15:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "4",
    name: "Daniela Oliveira",
    event: "Festival de Jazz",
    issuedAt: "2024-05-02T14:45:00Z",
    checkinStatus: "Realizado",
  },
  {
    id: "5",
    name: "Eduardo Santos",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-03T08:00:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "6",
    name: "Fernanda Lima",
    event: "Festival de Jazz",
    issuedAt: "2024-05-03T16:20:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "7",
    name: "Gabriel Costa",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-04T10:10:00Z",
    checkinStatus: "Realizado",
  },
  {
    id: "8",
    name: "Helena Souza",
    event: "Festival de Jazz",
    issuedAt: "2024-05-04T13:40:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "9",
    name: "Igor Mendes",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-05T09:00:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "10",
    name: "Julia Rocha",
    event: "Festival de Jazz",
    issuedAt: "2024-05-05T15:30:00Z",
    checkinStatus: "Realizado",
  },
  {
    id: "11",
    name: "Kevin Pereira",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-06T11:00:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "12",
    name: "Larissa Nunes",
    event: "Festival de Jazz",
    issuedAt: "2024-05-06T14:20:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "13",
    name: "Marcos Vinicius",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-07T10:45:00Z",
    checkinStatus: "Realizado",
  },
  {
    id: "14",
    name: "Natália Ferreira",
    event: "Festival de Jazz",
    issuedAt: "2024-05-07T17:10:00Z",
    checkinStatus: "Pendente",
  },
  {
    id: "15",
    name: "Otávio Augusto",
    event: "Show de Rock 2024",
    issuedAt: "2024-05-08T09:30:00Z",
    checkinStatus: "Pendente",
  },
];
