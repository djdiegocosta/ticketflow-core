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

## Layout do checkout

O checkout utiliza um wizard visual de 3 etapas, sempre destacado no topo da página:

1. `DADOS DO COMPRADOR` — ícone de pessoa.
2. `NOME DO(S) PARTICIPANTE(S)` — ícone de ingresso.
3. `PAGAMENTO` — ícone de QR Code/Pix.

O progresso utiliza a cor de tema do evento para as etapas já alcançadas e cinza claro para as etapas ainda não alcançadas. As conexões entre os círculos também acompanham esse estado, deixando o avanço visualmente evidente.

O checkout mantém a navegação sequencial existente. O usuário pode avançar após a validação de cada etapa e voltar da etapa de participantes para os dados do comprador. Depois que a reserva e o Pix são gerados, a etapa de pagamento permanece focada no pagamento e na confirmação da venda.

O card `Você está comprando`, com evento, lote, quantidade e valor, é exibido somente na etapa de pagamento. As etapas de dados do comprador e participantes ficam mais limpas e focadas na ação atual.

Na etapa de participantes, a orientação para compra de ingresso próprio é: `Se o ingresso for seu, marque a opção no canto direito abaixo (Sou eu).`

Esta alteração é exclusivamente visual/estrutural no frontend. Não altera backend, banco de dados, RPCs, Mercado Pago ou regras financeiras da venda.

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
