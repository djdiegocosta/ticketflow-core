import { supabase } from "@/integrations/supabase/client";

export async function getActiveBanner(organizationId: string) {
  const { data, error } = await supabase
    .from("client_banners")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function toggleBannerStatus(bannerId: string, organizationId: string, isActive: boolean) {
  if (isActive) {
    await supabase
      .from("client_banners")
      .update({ is_active: false })
      .eq("organization_id", organizationId);
  }
  
  const { data, error } = await supabase
    .from("client_banners")
    .update({ is_active: isActive })
    .eq("id", bannerId);

  if (error) throw error;
  return data;
}
