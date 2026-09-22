import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventHistorySnapshot {
  event: {
    id: string;
    title: string;
    date: string;
    venue: string;
    imageUrl: string | null;
  };
  closedAt: string;
  audience: {
    presale: number;
    boxOffice: number;
    courtesies: number;
    paidTickets: number;
    attendancePresent: number;
  };
  boxOfficeSale: {
    quantity: number;
    revenue: number;
  };
  batches: Array<{
    id: string;
    name: string;
    quantity: number;
    unitValue: number;
    revenue: number;
  }>;
  finance: {
    ticketsRevenue: number;
    barRevenue: number;
    totalRevenue: number;
    eventCost: number;
    barCost: number;
    totalCosts: number;
    netResult: number;
    margin: number;
  };
  bar: {
    totalSales: number;
    productCost: number;
    grossResult: number;
    costPercent: number;
  };
  notes: string | null;
}

export interface EventHistoryListItem {
  id: string;
  eventId: string;
  closedAt: string;
  snapshot: EventHistorySnapshot;
}

export interface EventClosurePreviewBatch {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface EventClosurePreview {
  paidTickets: number;
  ticketRevenue: number;
  batches: EventClosurePreviewBatch[];
  checkins: number;
  courtesyCheckins: number;
}

function asSnapshot(value: unknown): EventHistorySnapshot {
  return value as EventHistorySnapshot;
}

export async function fetchEventHistoryList(): Promise<EventHistoryListItem[]> {
  const { data, error } = await supabase
    .from("event_closures")
    .select("id, event_id, closed_at, snapshot")
    .order("closed_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    closedAt: row.closed_at,
    snapshot: asSnapshot(row.snapshot),
  }));
}

export async function fetchEventHistoryDetail(id: string): Promise<EventHistorySnapshot | null> {
  const { data, error } = await supabase
    .from("event_closures")
    .select("snapshot")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? asSnapshot(data.snapshot) : null;
}

export function useEventHistoryList() {
  return useQuery({
    queryKey: ["event-history"],
    queryFn: fetchEventHistoryList,
  });
}

export function useEventHistoryDetail(id: string) {
  return useQuery({
    queryKey: ["event-history", id],
    queryFn: () => fetchEventHistoryDetail(id),
    enabled: !!id,
  });
}

export async function fetchEventClosurePreview(eventId: string): Promise<EventClosurePreview> {
  const [{ data: sales, error: salesError }, { data: checkins, error: checkinsError }] = await Promise.all([
    supabase
      .from("sales")
      .select("batch_id, quantity, total_amount, is_courtesy, status, ticket_batches(id, name)")
      .eq("event_id", eventId)
      .eq("status", "pago"),
    supabase
      .from("tickets")
      .select("id, checked_in_at, sales!inner(is_courtesy, event_id)")
      .eq("sales.event_id", eventId)
      .eq("status", "utilizado"),
  ]);

  if (salesError) throw salesError;
  if (checkinsError) throw checkinsError;

  const paidSales = (sales ?? []).filter((sale) => !sale.is_courtesy);
  const paidTickets = paidSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
  const ticketRevenue = paidSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

  const batchesMap = new Map<string, EventClosurePreviewBatch>();
  for (const sale of paidSales) {
    const batch = Array.isArray(sale.ticket_batches) ? sale.ticket_batches[0] : sale.ticket_batches;
    if (!batch?.id) continue;

    const current = batchesMap.get(batch.id) ?? {
      id: batch.id,
      name: batch.name,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += Number(sale.quantity || 0);
    current.revenue += Number(sale.total_amount || 0);
    batchesMap.set(batch.id, current);
  }

  const checkinRows = (checkins ?? []) as Array<{
    id: string;
    checked_in_at: string | null;
    sales: { is_courtesy: boolean; event_id: string } | { is_courtesy: boolean; event_id: string }[];
  }>;

  let courtesyCheckins = 0;
  let normalCheckins = 0;
  for (const ticket of checkinRows) {
    const sale = Array.isArray(ticket.sales) ? ticket.sales[0] : ticket.sales;
    if (!sale) continue;
    if (sale.is_courtesy) courtesyCheckins += 1;
    else normalCheckins += 1;
  }

  return {
    paidTickets,
    ticketRevenue,
    batches: Array.from(batchesMap.values()),
    checkins: normalCheckins,
    courtesyCheckins,
  };
}

export function useEventClosurePreview(eventId: string | null) {
  return useQuery({
    queryKey: ["event-closure-preview", eventId],
    queryFn: () => fetchEventClosurePreview(eventId!),
    enabled: !!eventId,
  });
}

export interface CloseEventInput {
  eventId: string;
  boxOfficeQuantity: number;
  boxOfficeRevenue: number;
  courtesiesPresent: number;
  attendancePresent: number;
  barRevenue: number;
  barProductCost: number;
  eventCost: number;
  notes: string;
}

export async function closeEvent(input: CloseEventInput): Promise<EventHistorySnapshot> {
  const { data, error } = await supabase.rpc("close_event", {
    _event_id: input.eventId,
    _box_office_quantity: input.boxOfficeQuantity,
    _box_office_revenue: input.boxOfficeRevenue,
    _courtesies_present: input.courtesiesPresent,
    _attendance_present: input.attendancePresent,
    _bar_revenue: input.barRevenue,
    _bar_product_cost: input.barProductCost,
    _event_cost: input.eventCost,
    _notes: input.notes.trim() || null,
  });

  if (error) throw error;
  return asSnapshot(data);
}

export function useCloseEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeEvent,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["event-history"] }),
        queryClient.invalidateQueries({ queryKey: ["event-closure-preview"] }),
      ]);
    },
  });
}
