import nodemailer from "nodemailer";

/**
 * Envio de e-mail de confirmação de compra (QUA-002).
 *
 * Usa uma conta Gmail comum + "senha de app" como transporte SMTP —
 * opção de custo zero, sem depender de domínio próprio verificado.
 * Se as credenciais não estiverem configuradas, ou o envio falhar por
 * qualquer motivo, a função nunca lança erro: a confirmação de pagamento
 * e a criação dos ingressos NUNCA podem ser bloqueadas por causa do e-mail.
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
  saleCode: string;
}

export async function sendPurchaseConfirmationEmail(input: ConfirmationEmailInput): Promise<void> {
  try {
    const t = getTransporter();
    if (!t) {
      console.warn("sendPurchaseConfirmationEmail: GMAIL_USER/GMAIL_APP_PASSWORD não configurados, envio ignorado.");
      return;
    }
    if (!input.buyerEmail) return;

    const siteUrl = process.env["VITE_SITE_URL"] || "https://ticketflow2.lovable.app";
    const ticketsUrl = `${siteUrl}/meus-ingressos?codigo=${encodeURIComponent(input.saleCode)}`;
    const fromUser = process.env["GMAIL_USER"];

    await t.sendMail({
      from: `TicketFlow <${fromUser}>`,
      to: input.buyerEmail,
      subject: `Ingresso confirmado — ${input.eventTitle}`,
      text:
        `Oi, ${input.buyerName}!\n\n` +
        `Seu pagamento foi confirmado para o evento "${input.eventTitle}".\n\n` +
        `Código da sua compra: ${input.saleCode}\n` +
        `Acesse seu(s) ingresso(s) aqui: ${ticketsUrl}\n\n` +
        `Guarde este e-mail — ele é a forma mais fácil de recuperar seu ingresso caso precise.`,
      html:
        `<p>Oi, ${escapeHtml(input.buyerName)}!</p>` +
        `<p>Seu pagamento foi confirmado para o evento <strong>${escapeHtml(input.eventTitle)}</strong>.</p>` +
        `<p>Código da sua compra: <strong>${escapeHtml(input.saleCode)}</strong></p>` +
        `<p><a href="${ticketsUrl}">Clique aqui para acessar seu(s) ingresso(s)</a></p>` +
        `<p style="color:#666;font-size:13px">Guarde este e-mail — ele é a forma mais fácil de recuperar seu ingresso caso precise.</p>`,
    });
  } catch (err) {
    // Nunca deixar o envio de e-mail derrubar o fluxo de confirmação de pagamento.
    console.error("sendPurchaseConfirmationEmail failed", err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
