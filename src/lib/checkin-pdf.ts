import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Baixa a biblioteca de PDF em segundo plano, pouco depois da tela abrir.
 * Assim a tela carrega rápido e, no clique, o PDF já está no aparelho —
 * importante no dia do evento, quando a internet pode estar fraca.
 */
export function usePreloadCheckinPdf() {
  useEffect(() => {
    const t = setTimeout(() => {
      import("jspdf").catch(() => {
        /* sem rede agora: a geração tentará de novo no clique */
      });
    }, 1500);
    return () => clearTimeout(t);
  }, []);
}

/** Gera e baixa a lista de check-in (participantes) em A4 compacto. */
export async function generateCheckinListPdf(eventName: string, participantNames: string[]) {
  // Carregada sob demanda (fora do carregamento inicial da tela): biblioteca de ~400 KB.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 40;
  const topY = 52;
  const bottomLimit = pageHeight - 40;
  const lineHeight = 15;

  const names = [...participantNames].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );

  const generatedAt = new Date().toLocaleString("pt-BR");
  let page = 1;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(eventName, marginX, topY - 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Lista de check-in — ${names.length} participantes — gerada em ${generatedAt}`,
      marginX,
      topY - 10,
    );
    doc.setDrawColor(180);
    doc.line(marginX, topY - 4, pageWidth - marginX, topY - 4);
    doc.setFontSize(11);
  };

  const drawFooter = () => {
    doc.setFontSize(8);
    doc.text(`Página ${page}`, pageWidth - marginX, pageHeight - 24, { align: "right" });
    doc.setFontSize(11);
  };

  drawHeader();
  let y = topY + 12;

  names.forEach((name, index) => {
    if (y > bottomLimit) {
      drawFooter();
      doc.addPage();
      page += 1;
      drawHeader();
      y = topY + 12;
    }
    // Checkbox vazio
    doc.setDrawColor(90);
    doc.rect(marginX, y - 8, 9, 9);
    doc.text(`${index + 1}. ${name}`, marginX + 16, y);
    y += lineHeight;
  });

  drawFooter();

  const slug = eventName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`lista-checkin-${slug || "evento"}.pdf`);
}

/**
 * Nomes dos participantes de um evento para a lista de check-in: só vendas
 * pagas e cortesias (nunca pendente/expirado/cancelado/reembolsado).
 * `incluir`: "tudo" = vendas + cortesias; "cortesias" = só cortesias.
 * Um nome por INGRESSO; venda sem ingresso gerado usa o nome do comprador.
 */
export async function fetchCheckinNames(
  eventId: string,
  incluir: "tudo" | "cortesias",
): Promise<string[]> {
  const PAGE = 1000;
  const sales: { id: string; buyer_name: string | null; is_courtesy: boolean }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sales")
      .select("id, buyer_name, is_courtesy")
      .eq("event_id", eventId)
      .eq("status", "pago")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    sales.push(...((data ?? []) as typeof sales));
    if (!data || data.length < PAGE) break;
  }
  const wanted = new Map(
    sales.filter((s) => incluir === "tudo" || s.is_courtesy).map((s) => [s.id, s]),
  );

  const namesBySale = new Map<string, string[]>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tickets")
      .select("participant_name, sale_id, sales!inner(event_id)")
      .eq("sales.event_id", eventId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    (data ?? []).forEach((t: any) => {
      if (!wanted.has(t.sale_id)) return;
      const list = namesBySale.get(t.sale_id) ?? [];
      list.push(t.participant_name || "—");
      namesBySale.set(t.sale_id, list);
    });
    if (!data || data.length < PAGE) break;
  }

  return [...wanted.values()].flatMap((s) => namesBySale.get(s.id) ?? [s.buyer_name ?? "—"]);
}
