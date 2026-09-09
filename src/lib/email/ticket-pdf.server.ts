import { jsPDF } from "jspdf";

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

/**
 * Gera o PDF oficial enviado no e-mail de confirmação.
 * Cada ingresso ocupa uma página para facilitar o uso no celular e na entrada.
 */
export function generateTicketsPdf(input: TicketPdfInput): Buffer {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const tickets = input.tickets;

  tickets.forEach((ticket, index) => {
    if (index > 0) pdf.addPage();

    const eventDate = input.eventDate
      ? new Date(input.eventDate).toLocaleDateString("pt-BR")
      : "Data não informada";

    pdf.setFillColor(20, 20, 20);
    pdf.roundedRect(15, 15, 180, 255, 6, 6, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("TicketFlow", 25, 35);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text("INGRESSO OFICIAL", 25, 44);

    pdf.setFillColor(35, 35, 35);
    pdf.roundedRect(25, 58, 160, 78, 4, 4, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    const eventLines = pdf.splitTextToSize(input.eventTitle, 145);
    pdf.text(eventLines, 32, 76);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Data: ${eventDate}`, 32, 98);
    pdf.text(`Participante: ${ticket.participant_name || input.buyerName || "Não informado"}`, 32, 108);
    pdf.text(`Ingresso ${index + 1} de ${tickets.length}`, 32, 118);

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(25, 148, 160, 48, 4, 4, "F");

    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("CÓDIGO DO INGRESSO", 105, 160, { align: "center" });

    pdf.setFont("courier", "bold");
    pdf.setFontSize(20);
    pdf.text(ticket.ticket_code, 105, 177, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Compra: ${input.saleCode}`, 105, 188, { align: "center" });

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("APRESENTE ESTE INGRESSO NA ENTRADA DO EVENTO", 105, 218, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const instructions = pdf.splitTextToSize(
      "Mantenha este ingresso guardado no seu celular. Não compartilhe o código com outra pessoa. O ingresso é pessoal e deve ser apresentado na entrada para validação.",
      145,
    );
    pdf.text(instructions, 105, 232, { align: "center" });
  });

  return Buffer.from(pdf.output("arraybuffer"));
}
