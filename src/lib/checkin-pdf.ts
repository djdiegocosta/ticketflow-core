import { jsPDF } from "jspdf";

/** Gera e baixa a lista de check-in (participantes) em A4 compacto. */
export function generateCheckinListPdf(eventName: string, participantNames: string[]) {
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
