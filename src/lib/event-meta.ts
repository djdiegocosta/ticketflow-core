import { supabase } from "@/integrations/supabase/client";

export type EventMetaData = {
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  location: string | null;
} | null;

/**
 * Busca os dados mínimos do evento (por slug) necessários para montar
 * título, descrição e imagem de compartilhamento (OG tags) das páginas
 * públicas. Usado nos `loader`s das rotas /e/$slug/*, para que o preview
 * ao compartilhar no WhatsApp/Instagram mostre o evento real.
 */
export async function fetchEventMeta(slug: string): Promise<EventMetaData> {
  const { data } = await supabase
    .from("events")
    .select("title, description, image_url, event_date, location")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();

  return data ?? null;
}

/**
 * Monta o array de meta tags (title, description, og:*, twitter:*) a partir
 * dos dados do evento. `titleSuffix` e `descriptionOverride` permitem
 * personalizar por etapa (ex: checkout, confirmação) sem perder a imagem
 * e o nome real do evento.
 */
export function buildEventMeta(
  event: EventMetaData,
  opts?: { titleSuffix?: string; descriptionOverride?: string }
) {
  const fallbackTitle = "Evento | TicketFlow";
  const fallbackDescription = "Garanta seu ingresso para este evento exclusivo.";

  const title = event?.title
    ? `${event.title}${opts?.titleSuffix ? ` — ${opts.titleSuffix}` : ""} | TicketFlow`
    : fallbackTitle;

  let description = opts?.descriptionOverride ?? null;

  if (!description) {
    const dateLabel = event?.event_date
      ? new Date(event.event_date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    const parts = [event?.description?.trim() || null, dateLabel, event?.location?.trim() || null].filter(
      (p): p is string => Boolean(p)
    );

    description = parts.length > 0 ? parts.join(" — ") : fallbackDescription;
  }

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: event?.image_url ? "summary_large_image" : "summary" },
  ];

  if (event?.image_url) {
    meta.push({ property: "og:image", content: event.image_url });
    meta.push({ name: "twitter:image", content: event.image_url });
  }

  return meta;
}
