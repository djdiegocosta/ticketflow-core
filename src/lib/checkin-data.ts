import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// O histórico agora é consumido diretamente do banco via queries reais.
// O sistema em memória 'attempts' foi removido para evitar dados duplicados ou inconsistentes.


/** Pre-carrega os dados do evento no IndexedDB */
export async function preloadEventTickets(eventId: string, eventName: string) {
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("ticket_code, participant_name, status")
    .eq("event_id", eventId);

  if (error) {
    console.error("[Checkin] Erro ao pré-carregar ingressos:", error);
    return 0;
  }

  const offlineTickets: OfflineTicket[] = (tickets || []).map((t) => ({
    code: t.ticket_code,
    name: t.participant_name,
    eventName: eventName,
    status: t.status === "utilizado" ? "already_used" : "valid",
  }));

  await offlineDB.saveTickets(offlineTickets);
  return offlineTickets.length;
}

/** Lógica de Check-in Offline First */
export async function resolveCheckin(code: string, eventId: string, eventName: string) {
  const isOnline = navigator.onLine;
  const cleanCode = code.trim().toUpperCase();
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  
  // 1. Tentar cache local (IndexedDB)
  const localTicket = await offlineDB.getTicket(cleanCode);
  
  if (localTicket) {
    if (localTicket.status === 'already_used') {
      return { status: 'already_used' as CheckinStatus, name: localTicket.name, eventName, time, isOffline: !isOnline };
    }
    
    // Validado localmente
    await offlineDB.updateTicketStatus(cleanCode, 'already_used');
    
    // Se estiver offline, adicionar à fila de sync
    if (!isOnline) {
      await offlineDB.addToSyncQueue({
        id: `${Date.now()}-${cleanCode}`,
        code: cleanCode,
        eventName,
        timestamp: Date.now()
      });
    } else {
      // Se online, tenta sincronizar imediatamente via RPC
      try {
        await supabase.rpc('checkin_ticket', { _ticket_code: cleanCode });
      } catch (e) {
        console.warn("[Checkin] Erro ao sincronizar check-in online, caindo para fila offline", e);
        await offlineDB.addToSyncQueue({
          id: `${Date.now()}-${cleanCode}`,
          code: cleanCode,
          eventName,
          timestamp: Date.now()
        });
      }
    }
    
    return { status: 'valid' as CheckinStatus, name: localTicket.name, eventName, time, isOffline: !isOnline };
  }

  // 2. Se não está no cache e está offline, é inválido (pois pré-carregamos tudo)
  if (!isOnline) {
    return { status: 'invalid' as CheckinStatus, name: cleanCode, eventName, time, isOffline: true };
  }

  // 3. Tentar validação online via RPC
  try {
    const { data, error } = await supabase.rpc('checkin_ticket', { _ticket_code: cleanCode });
    
    if (error || !data || data.length === 0) {
      return { status: 'invalid' as CheckinStatus, name: cleanCode, eventName, time, isOffline: false };
    }

    const first = data[0];
    if (!first) {
      return { status: 'invalid' as CheckinStatus, name: cleanCode, eventName, time, isOffline: false };
    }
    
    const status: CheckinStatus = first.result === 'sucesso' ? 'valid' : first.result === 'duplicidade' ? 'already_used' : 'invalid';
    
    return {
      status,
      name: first.participant_name || cleanCode,
      eventName: first.event_title || eventName,
      time,
      isOffline: false
    };
  } catch (e) {
    console.error("[Checkin] Erro RPC:", e);
    return { status: 'invalid' as CheckinStatus, name: cleanCode, eventName, time, isOffline: false };
  }
}

export async function processSyncQueue() {
  const queue = await offlineDB.getSyncQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      const { data, error } = await supabase.rpc('checkin_ticket', { _ticket_code: item.code });
      
      // Se processou com sucesso (ou já era duplicidade conhecida pelo servidor), remove da fila
      if (!error && data) {
        await offlineDB.removeItemFromSyncQueue(item.id);
      }
    } catch (e) {
      console.error(`[Checkin] Erro crítico ao sincronizar ticket ${item.code}:`, e);
    }
  }
}
}
