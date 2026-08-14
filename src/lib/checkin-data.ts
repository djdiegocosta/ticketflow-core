import { useEffect, useState } from "react";

export type CheckinStatus = "valid" | "already_used" | "invalid";

export interface CheckinAttempt {
  id: string;
  name: string;
  eventName: string;
  time: string;
  status: CheckinStatus;
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

/** Lógica mockada determinística: define o resultado a partir do próprio código lido. */
export function resolveMockCheckin(code: string, eventName: string) {
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
