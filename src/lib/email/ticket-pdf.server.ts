import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface TicketPdfInput {
  eventTitle: string;
  eventDate?: string | null;
  buyerName: string;
  saleCode: string;
  tickets: Array<{
    ticket_code: string;
    participant_name: string | null;
  }>;
}

function formatEventDate(eventDate?: string | null): string {
  if (!eventDate) return "—";
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsed);
}

async function qrCodeDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 512,
    margin: 0,
    errorCorrectionLevel: "L",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Gera o PDF oficial do ingresso.
 * Este é o único renderer usado tanto pelo download do cliente quanto pelo
 * anexo enviado por e-mail, garantindo que ambos sejam o mesmo arquivo.
 */
export async function generateTicketsPdf(input: TicketPdfInput): Promise<Buffer> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const tickets = input.tickets;
  const eventDate = formatEventDate(input.eventDate);

  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    if (index > 0) pdf.addPage();

    const qrDataUrl = await qrCodeDataUrl(ticket.ticket_code);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("TicketFlow", 20, 25);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Ingresso", 20, 40);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(input.eventTitle, 20, 50);
    pdf.text(`Data: ${eventDate}`, 20, 58);
    pdf.text(`Participante: ${ticket.participant_name || "Não informado"}`, 20, 66);
    pdf.text(`Ingresso ${index + 1} de ${tickets.length}`, 20, 74);

    pdf.setDrawColor(220, 220, 220);
    pdf.roundedRect(20, 84, 170, 125, 4, 4, "S");
    pdf.addImage(qrDataUrl, "PNG", 62, 94, 86, 86);

    pdf.setFont("courier", "bold");
    pdf.setFontSize(12);
    pdf.text(ticket.ticket_code, 105, 195, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Apresente este QR Code na entrada do evento.", 105, 201, { align: "center" });
  }

  return Buffer.from(pdf.output("arraybuffer"));
}
