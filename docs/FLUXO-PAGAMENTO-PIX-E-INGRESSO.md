# Fluxo de pagamento Pix e entrega do ingresso

## Regra oficial

Após o Mercado Pago confirmar uma cobrança Pix como `approved`, o TicketFlow deve:

1. Confirmar a venda.
2. Criar os ingressos.
3. Atualizar o checkout para a confirmação da compra.
4. Exibir os ingressos de forma clara na página de confirmação.
5. Permitir o download dos ingressos em PDF.
6. Enviar os ingressos em PDF anexados ao e-mail de confirmação.

## Checkout Pix

- O botão principal para o código Pix é `COPIAR CÓDIGO PIX`.
- A página verifica o status da venda automaticamente a cada 2 segundos enquanto aguarda o pagamento.
- Também existe a ação `Já paguei — verificar pagamento` para uma verificação manual imediata.
- A confirmação real depende do status persistido da venda; o contador de expiração não confirma pagamento.

## Pós-pagamento

A página de confirmação informa explicitamente:

- pagamento recebido;
- ingresso disponível;
- download do PDF;
- QR Code que deve ser apresentado na entrada;
- orientação para manter o ingresso salvo no celular;
- orientação para não compartilhar ou repassar o ingresso.

## PDF oficial do ingresso

O PDF é gerado por um único renderer server-side em `src/lib/email/ticket-pdf.server.ts`.

O mesmo arquivo é usado para:

- download na página de confirmação;
- anexo do e-mail de confirmação.

Isso garante paridade funcional e visual entre o PDF baixado e o PDF recebido por e-mail.

Cada ingresso ocupa uma página e contém o mesmo QR Code baseado no `ticket_code`, além de evento, data, participante, posição do ingresso e instrução para apresentação na entrada.

## E-mail

O e-mail de confirmação não depende mais de um link para recuperar o ingresso.

O PDF oficial é anexado diretamente ao e-mail.

O envio de e-mail continua desacoplado da confirmação financeira: uma falha no SMTP não desfaz o pagamento nem a criação dos ingressos.
