import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Gerador do ingresso estilizado em PDF — a MESMA identidade visual usada em
 * /ingresso/$ticket_code (TicketDetailPage): cartão estilo "boarding pass",
 * QR Code central, tarja colorida na base com código e participante.
 *
 * Este é o único gerador de PDF de ingresso do sistema. O download na tela
 * de confirmação, o anexo do e-mail e o envio manual por WhatsApp (admin)
 * sempre passam por aqui — nunca deve existir uma versão "diferente" do
 * ingresso circulando.
 */

// Mesmas cores de src/styles.css (PDF não lê variáveis CSS).
const COLORS = {
  bgPrimary: "#ffffff",
  bgSecondary: "#f8f7fb",
  textPrimary: "#1d1b22",
  textSecondary: "#716d7c",
  borderSubtle: "#ebe9f0",
  accent: "#7c3aed",
  accentOn: "#ffffff",
};

export interface TicketPdfInput {
  eventTitle: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  organizationName?: string | null;
  buyerName?: string;
  saleCode: string;
  purchasedAt?: string | null;
  tickets: Array<{
    ticket_code: string;
    participant_name: string | null;
    batch_name?: string | null;
  }>;
}

const PAGE_W = 380;
const PAGE_H = 700;
const CARD_MARGIN = 24;
const CARD_W = PAGE_W - CARD_MARGIN * 2;

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${formatDate(iso)} às ${formatTime(iso)}`;
}

async function addTicketPage(
  doc: jsPDF,
  ticket: { ticket_code: string; participant_name: string | null; batch_name?: string | null },
  sale: TicketPdfInput,
  isFirstPage: boolean,
) {
  if (!isFirstPage) doc.addPage([PAGE_W, PAGE_H]);

  const cardTop = 40;
  let y = cardTop;

  // Fundo do cartão
  doc.setFillColor(COLORS.bgSecondary);
  doc.roundedRect(CARD_MARGIN, cardTop, CARD_W, 560, 16, 16, "F");

  y = cardTop + 28;
  doc.setTextColor(COLORS.textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text((sale.organizationName || "TicketFlow").toUpperCase(), PAGE_W / 2, y, { align: "center", charSpace: 0.5 });

  // Linha data/horário
  y += 20;
  doc.setDrawColor(COLORS.borderSubtle);
  doc.line(CARD_MARGIN + 20, y, PAGE_W - CARD_MARGIN - 20, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.textSecondary);
  doc.text("DATA", PAGE_W / 2 - 60, y, { align: "center" });
  doc.text("HORÁRIO", PAGE_W / 2 + 60, y, { align: "center" });
  y += 14;
  doc.setFontSize(13);
  doc.setTextColor(COLORS.textPrimary);
  doc.text(formatDate(sale.eventDate), PAGE_W / 2 - 60, y, { align: "center" });
  doc.text(formatTime(sale.eventDate), PAGE_W / 2 + 60, y, { align: "center" });
  y += 16;
  doc.line(CARD_MARGIN + 20, y, PAGE_W - CARD_MARGIN - 20, y);

  // Título do evento
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(COLORS.textPrimary);
  const titleLines = doc.splitTextToSize(sale.eventTitle || "Evento", CARD_W - 40);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * 20;

  // Local
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textSecondary);
  doc.text(sale.eventLocation || "Local não informado", PAGE_W / 2, y, { align: "center" });

  // Linha pontilhada (perfuração) com selo
  y += 26;
  doc.setLineDashPattern([3, 3], 0);
  doc.setDrawColor(COLORS.borderSubtle);
  doc.line(CARD_MARGIN, y, PAGE_W - CARD_MARGIN, y);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(COLORS.accent);
  doc.circle(PAGE_W / 2, y, 9, "F");

  // QR Code
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.textSecondary);
  doc.text("APRESENTE ESTE CÓDIGO NA ENTRADA DO EVENTO", PAGE_W / 2, y, { align: "center", charSpace: 0.3 });

  y += 16;
  const qrSize = 170;
  const qrDataUrl = await QRCode.toDataURL(ticket.ticket_code, { margin: 1, width: 400 });
  doc.setFillColor(COLORS.bgPrimary);
  doc.roundedRect(PAGE_W / 2 - qrSize / 2 - 10, y, qrSize + 20, qrSize + 20, 12, 12, "F");
  doc.addImage(qrDataUrl, "PNG", PAGE_W / 2 - qrSize / 2, y + 10, qrSize, qrSize);

  // Tarja colorida na base
  const stripTop = y + qrSize + 40;
  const stripH = cardTop + 560 - stripTop;
  doc.setFillColor(COLORS.accent);
  doc.roundedRect(CARD_MARGIN, stripTop, CARD_W, stripH, 16, 16, "F");
  doc.rect(CARD_MARGIN, stripTop, CARD_W, stripH / 2, "F"); // cantos superiores retos

  let sy = stripTop + 26;
  doc.setTextColor(COLORS.accentOn);
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(ticket.ticket_code, PAGE_W / 2, sy, { align: "center" });

  sy += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Comprado em ${formatDateTime(sale.purchasedAt)}`, PAGE_W / 2, sy, { align: "center" });

  sy += 22;
  doc.setDrawColor(255, 255, 255);
  doc.line(CARD_MARGIN + 20, sy, PAGE_W - CARD_MARGIN - 20, sy);
  sy += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PARTICIPANTE", CARD_MARGIN + 24, sy);
  doc.text("LOTE", PAGE_W - CARD_MARGIN - 24, sy, { align: "right" });
  sy += 13;
  doc.setFontSize(10);
  doc.text(ticket.participant_name || "—", CARD_MARGIN + 24, sy);
  doc.text(ticket.batch_name || "Geral", PAGE_W - CARD_MARGIN - 24, sy, { align: "right" });
}

/**
 * Gera o PDF com um ingresso estilizado por página.
 * Este é o único renderer usado por download, e-mail e envio manual —
 * garantindo que todos entreguem exatamente o mesmo ingresso.
 */
export async function generateTicketsPdf(input: TicketPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H] });
  for (let i = 0; i < input.tickets.length; i++) {
    await addTicketPage(doc, input.tickets[i], input, i === 0);
  }
  return Buffer.from(doc.output("arraybuffer"));
}
