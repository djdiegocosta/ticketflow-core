import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNewCustomersCount(days: number = 30) {
  return useQuery({
    queryKey: ["customers", "new-count", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_new_customers_count", {
        _days: days,
      });
      if (error) throw error;
      return data as number;
    },
  });
}

export function useHourlySalesStats(eventId?: string) {
  return useQuery({
    queryKey: ["sales", "hourly-stats", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hourly_sales_stats", {
        _event_id: eventId === "overview" ? null : eventId,
      });
      if (error) throw error;
      return data as { hour: string; value: number }[];
    },
  });
}
