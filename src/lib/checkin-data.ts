import { useEffect, useState } from "react";
import { offlineDB, type OfflineTicket } from "./offline-db";

export type CheckinStatus = "valid" | "already_used" | "invalid";

export interface CheckinAttempt {
  id: string;
  name: string;
  eventName: string;
  time: string;
  status: CheckinStatus;
  isOffline?: boolean;
}

export const CHECKIN_EVENTS = [
  { id: "1", name: "Festival de Inverno 2026" },
  { id: "2", name: "Workshop Tech Leads" },
  { id: "3", name: "Show Case Bandas Locais" },
];

const MOCK_NAMES = [
  "Alice Oliveira",
  "Bruno Fernandes",
  "Carla Mendes",
  "Daniel Rocha",
  "Elena Souza",
  "Felipe Antunes",
  "Gabriela Lima",
  "Henrique Barros",
  "Isabela Nunes",
  "João Pedro Alves",
];

// Dados mockados que representam "a base do servidor"
const SERVER_MOCK_TICKETS: OfflineTicket[] = Array.from({ length: 100 }).map((_, i) => {
  const code = `TKT-${100000 + i}`;
  const name = MOCK_NAMES[i % MOCK_NAMES.length]!;
  return {
    code,
    name,
    eventName: CHECKIN_EVENTS[i % CHECKIN_EVENTS.length]!.name,
    status: "valid"
  };
});

let attempts: CheckinAttempt[] = [
  { id: "a1", name: "Alice Oliveira", eventName: "Festival de Inverno 2026", time: "19:52", status: "valid" },
  { id: "a2", name: "Bruno Fernandes", eventName: "Festival de Inverno 2026", time: "19:50", status: "valid" },
  { id: "a3", name: "Pedro Henrique", eventName: "Festival de Inverno 2026", time: "19:47", status: "already_used" },
  { id: "a4", name: "Carla Mendes", eventName: "Festival de Inverno 2026", time: "19:45", status: "valid" },
  { id: "a5", name: "Daniel Rocha", eventName: "Festival de Inverno 2026", time: "19:41", status: "valid" },
  { id: "a6", name: "TKT-889201", eventName: "Festival de Inverno 2026", time: "19:38", status: "invalid" },
  { id: "a7", name: "Elena Souza", eventName: "Festival de Inverno 2026", time: "19:35", status: "valid" },
  { id: "a8", name: "Felipe Antunes", eventName: "Festival de Inverno 2026", time: "19:33", status: "valid" },
  { id: "a9", name: "Gabriela Lima", eventName: "Festival de Inverno 2026", time: "19:30", status: "already_used" },
  { id: "a10", name: "Henrique Barros", eventName: "Festival de Inverno 2026", time: "19:26", status: "valid" },
  { id: "a11", name: "Isabela Nunes", eventName: "Festival de Inverno 2026", time: "19:22", status: "valid" },
  { id: "a12", name: "TKT-000000", eventName: "Workshop Tech Leads", time: "19:18", status: "invalid" },
  { id: "a13", name: "João Pedro Alves", eventName: "Workshop Tech Leads", time: "19:14", status: "valid" },
  { id: "a14", name: "Marina Castro", eventName: "Workshop Tech Leads", time: "19:09", status: "valid" },
];

const listeners = new Set<(list: CheckinAttempt[]) => void>();

export function getCheckinAttempts() {
  return attempts;
}

export function addCheckinAttempt(attempt: Omit<CheckinAttempt, "id">) {
  attempts = [{ ...attempt, id: `${Date.now()}-${Math.random()}` }, ...attempts];
  listeners.forEach((l) => l(attempts));
}

export function useCheckinAttempts() {
  const [list, setList] = useState<CheckinAttempt[]>(attempts);
  useEffect(() => {
    setList(attempts);
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

/** Pre-carrega os dados do evento no IndexedDB simulando o download inicial */
export async function preloadEventTickets(eventName: string) {
  const eventTickets = SERVER_MOCK_TICKETS.filter(t => t.eventName === eventName);
  await offlineDB.saveTickets(eventTickets);
  return eventTickets.length;
}

/** Lógica de Check-in Offline First */
export async function resolveCheckin(code: string, eventName: string) {
  const isOnline = navigator.onLine;
  const cleanCode = code.trim().toUpperCase();
  
  // 1. Tentar cache local (IndexedDB)
  const localTicket = await offlineDB.getTicket(cleanCode);
  
  let result: { status: CheckinStatus; name: string; eventName: string; time: string; isOffline: boolean };
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (localTicket) {
    if (localTicket.status === 'already_used') {
      result = { status: 'already_used', name: localTicket.name, eventName, time, isOffline: !isOnline };
    } else {
      // Validado localmente
      await offlineDB.updateTicketStatus(cleanCode, 'already_used');
      result = { status: 'valid', name: localTicket.name, eventName, time, isOffline: !isOnline };
    }
  } else {
    // Se não está no IndexedDB, simulamos a lógica determinística original para "novos" códigos
    // Mas se estiver offline, novos códigos que não foram pré-carregados são considerados inválidos
    if (!isOnline) {
      result = { status: 'invalid', name: cleanCode, eventName, time, isOffline: true };
    } else {
      // Simulação online original (determinística)
      const mockResult = resolveMockCheckinSync(code, eventName);
      result = { ...mockResult, isOffline: false };
    }
  }

  // Se estiver offline e for uma validação/duplicidade, adicionar à fila de sync
  if (!isOnline && (result.status === 'valid' || result.status === 'already_used')) {
    await offlineDB.addToSyncQueue({
      id: `${Date.now()}-${cleanCode}`,
      code: cleanCode,
      eventName,
      timestamp: Date.now()
    });
  }

  return result;
}

/** Versão síncrona mantida apenas para fallback/legado interno se necessário */
function resolveMockCheckinSync(code: string, eventName: string) {
  const clean = code.trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) % 100000;
  const bucket = hash % 10;

  const status: CheckinStatus = bucket <= 6 ? "valid" : bucket <= 8 ? "already_used" : "invalid";
  const name =
    status === "invalid" ? clean.toUpperCase() || "Código inválido" : MOCK_NAMES[hash % MOCK_NAMES.length]!;

  return {
    status,
    name,
    eventName,
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

