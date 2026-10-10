// Endereço público oficial do TicketFlow. Usado nos links enviados por e-mail
// (redefinir senha, confirmar cadastro) para o cliente nunca cair numa tela de
// login da Vercel.
const FALLBACK_PUBLIC_SITE_URL = "https://ticketflow-core.vercel.app";

export function getPublicSiteUrl(): string {
  const configured = (import.meta.env["VITE_SITE_URL"] as string | undefined) || FALLBACK_PUBLIC_SITE_URL;
  if (typeof window === "undefined") return configured;

  const { hostname, origin } = window.location;
  let configuredHost = "";
  try {
    configuredHost = new URL(configured).hostname;
  } catch {
    return FALLBACK_PUBLIC_SITE_URL;
  }

  // Endereços temporários da Vercel (de deploy ou de branch) pedem login da Vercel.
  // Nesses casos, o link do e-mail usa o endereço público oficial.
  const isTemporaryVercelUrl = hostname.endsWith(".vercel.app") && hostname !== configuredHost;
  return isTemporaryVercelUrl ? configured.replace(/\/$/, "") : origin;
}
