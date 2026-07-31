/**
 * Cliente Supabase preparado, porém SEM conexão ativa.
 * As variáveis ficam vazias até o backend ser conectado (Prompt futuro).
 */
export const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] ?? "";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function getSupabaseConfig() {
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY, configured: isSupabaseConfigured };
}
