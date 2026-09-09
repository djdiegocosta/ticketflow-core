import nodemailer from "nodemailer";
import { generateTicketsPdf } from "./ticket-pdf.server";

/**
 * Envio de e-mail de confirmação de compra.
 * O ingresso é entregue como PDF anexado ao e-mail; o e-mail não depende
 * de um link externo para permitir que o cliente apresente o ingresso.
 */

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const user = process.env["GMAIL_USER"];
  const pass = process.env["GMAIL_APP_PASSWORD"];
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export interface ConfirmationEmailInput {
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  organizationName?: string | null;
  saleCode: string;
  purchasedAt?: string | null;
  tickets: Array<{
    ticket_code: string;
    participant_name: string | null;
    batch_name?: string | null;
  }>;
}

export async function sendPurchaseConfirmationEmail(input: ConfirmationEmailInput): Promise<void> {
  try {
    const t = getTransporter();
    if (!t) {
      console.warn("sendPurchaseConfirmationEmail: GMAIL_USER/GMAIL_APP_PASSWORD não configurados, envio ignorado.");
      return;
    }
    if (!input.buyerEmail || input.tickets.length === 0) return;

    const fromUser = process.env["GMAIL_USER"];
    const pdf = await generateTicketsPdf(input);

    await t.sendMail({
      from: `TicketFlow <${fromUser}>`,
      to: input.buyerEmail,
      subject: `Ingresso confirmado — ${input.eventTitle}`,
      text:
        `Oi, ${input.buyerName}!\n\n` +
        `Seu pagamento foi confirmado para o evento "${input.eventTitle}".\n\n` +
        `O(s) seu(s) ingresso(s) estão anexados a este e-mail em PDF.\n\n` +
        `Mantenha o PDF guardado no celular e não compartilhe o ingresso ou seu código com outra pessoa. ` +
        `O ingresso deve ser apresentado na entrada do evento para validação.\n\n` +
        `Código da compra: ${input.saleCode}`,
      html:
        `<p>Oi, ${escapeHtml(input.buyerName)}!</p>` +
        `<p>Seu pagamento foi confirmado para o evento <strong>${escapeHtml(input.eventTitle)}</strong>.</p>` +
        `<p>Seu(s) ingresso(s) estão anexados a este e-mail em <strong>PDF</strong>.</p>` +
        `<p><strong>Importante:</strong> mantenha o PDF guardado no celular e não compartilhe o ingresso ou seu código com outra pessoa. O ingresso deve ser apresentado na entrada do evento para validação.</p>` +
        `<p style="color:#666;font-size:13px">Código da compra: ${escapeHtml(input.saleCode)}</p>`,
      attachments: [
        {
          filename: `ingressos-${input.saleCode}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    // Nunca deixar o envio de e-mail derrubar o fluxo de confirmação de pagamento.
    console.error("sendPurchaseConfirmationEmail failed", err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
