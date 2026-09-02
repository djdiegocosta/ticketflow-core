import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type BatchRow = Database["public"]["Tables"]["ticket_batches"]["Row"];

export interface EventWithStats extends EventRow {
  capacity: number;
  sold: number;
}

export const eventStatusLabel = (event: EventRow) =>
  event.status === "cancelado" ? "Cancelado" : (event.is_closed ? "Encerrado" : (event.status === "publicado" ? "Publicado" : "Rascunho"));

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Define automaticamente o evento operacional da organização.
 * Prioridade: evento em andamento > próximo evento publicado e não encerrado.
 * Retorna null quando não existe evento operacional.
 */
export function getOperationalEvent(events: EventRow[], now = Date.now()): EventRow | null {
  const candidates = events.filter((event) => event.status === "publicado" && !event.is_closed);
  if (candidates.length === 0) return null;

  const inProgress = candidates
    .filter((event) => new Date(event.event_date).getTime() <= now)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  if (inProgress.length > 0) return inProgress[0] ?? null;

  return candidates
    .filter((event) => new Date(event.event_date).getTime() > now)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0] ?? null;
}

export function useOperationalEvent() {
  const query = useEvents();
  const event = getOperationalEvent(query.data ?? []);
  return { ...query, event, hasMultipleCandidates: (query.data ?? []).filter((e) => e.status === "publicado" && !e.is_closed).length > 1 };
}

export async function fetchEventsWithStats(): Promise<EventWithStats[]> {
  const [{ data: events, error }, { data: batches }, { data: stats }] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: false }),
    supabase.from("ticket_batches").select("event_id, quantity"),
    supabase.from("event_ticket_stats").select("*"),
  ]);

  if (error) throw error;

  return (events ?? []).map((event) => {
    const eventStats = (stats ?? []).find(s => s.event_id === event.id);
    return {
      ...event,
      capacity: (batches ?? [])
        .filter((b) => b.event_id === event.id)
        .reduce((acc, b) => acc + (b.quantity ?? 0), 0),
      sold: eventStats?.ingressos_vendidos || 0,
    };
  });
}

export function useEvents() {
  return useQuery({ queryKey: ["events"], queryFn: fetchEventsWithStats });
}

export async function fetchEventWithBatches(id: string) {
  const [{ data: event, error }, { data: batches }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("ticket_batches").select("*").eq("event_id", id).order("created_at"),
  ]);

  if (error) throw error;
  return { event, batches: batches ?? [] };
}

export function useEvent(id: string) {
  return useQuery({ queryKey: ["events", id], queryFn: () => fetchEventWithBatches(id) });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export interface BatchInput {
  name: string;
  price: number;
  quantity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_courtesy?: boolean;
}

export interface EventInput {
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string;
  location: string;
  slug: string;
  status: Database["public"]["Enums"]["event_status"];
}

export async function createEventWithBatches(
  organizationId: string,
  userId: string,
  input: EventInput,
  batches: BatchInput[],
) {
  const { data: event, error } = await supabase
    .from("events")
    .insert({ ...input, organization_id: organizationId, created_by: userId })
    .select("id")
    .single();

  if (error) throw error;

  if (batches.length > 0) {
    const { error: batchError } = await supabase.from("ticket_batches").insert(
      batches.map((b) => ({ ...b, event_id: event.id, organization_id: organizationId })),
    );
    if (batchError) throw batchError;
  }

  return event.id;
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const { error } = await supabase.from("events").update(input).eq("id", id);
  if (error) throw error;
}

export async function cancelEvent(id: string) {
  const { error } = await supabase.rpc("cancel_event", { _event_id: id });
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.rpc("delete_event", { _event_id: id });
  if (error) throw error;
}

export async function upsertBatch(
  organizationId: string,
  eventId: string,
  batch: BatchInput & { id?: string },
) {
  if (batch.id) {
    const { error } = await supabase
      .from("ticket_batches")
      .update({
        name: batch.name,
        price: batch.price,
        quantity: batch.quantity,
        starts_at: batch.starts_at,
        ends_at: batch.ends_at,
        is_courtesy: !!batch.is_courtesy,
      })
      .eq("id", batch.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("ticket_batches").insert({
    name: batch.name,
    price: batch.price,
    quantity: batch.quantity,
    starts_at: batch.starts_at,
    ends_at: batch.ends_at,
    is_courtesy: !!batch.is_courtesy,
    event_id: eventId,
    organization_id: organizationId,
  });
  if (error) throw error;
}

export async function deleteBatch(id: string) {
  const { error } = await supabase.from("ticket_batches").delete().eq("id", id);
  if (error) throw error;
}
