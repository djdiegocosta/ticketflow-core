# Plano de Implementação: Edge Functions Mercado Pago

Este plano detalha a criação das Edge Functions do Mercado Pago e a integração com o painel administrativo do TicketFlow.

## 1. Banco de Dados (Migrations)
- Criar a tabela `public.mp_config` para armazenar chaves e configurações por organização.
- Criar a RPC `confirm_sale_paid` para processar pagamentos aprovados.
- Adicionar a coluna `pending_participant_names` (jsonb) na tabela `sales` para persistir nomes até a confirmação do pagamento.

## 2. Edge Functions (Deno)
- **mp-save-credentials**: Cifrar `access_token` com AES-256-GCM e salvar no banco.
- **mp-validate-credentials**: Decifrar e testar contra a API `/users/me` do Mercado Pago.
- **mp-create-pix**: Gerar pagamento PIX real, salvar IDs e retornar QR Code.
- **mp-webhook**: Validar assinatura oficial do MP (HMAC-SHA256) e confirmar vendas.
- **mp-test-webhook**: Validar decifragem do segredo do webhook.

## 3. Frontend (Wizard do Mercado Pago)
- Conectar a Etapa 3 para usar a Edge Function de validação real.
- Conectar a Etapa 4 para exibir a URL dinâmica e testar o webhook.
- Conectar a Etapa 5 para gerar um PIX real de R$ 0,01.

## Detalhes Técnicos
- **Segurança**: Uso de `APP_ENCRYPTION_KEY` (Secret do Supabase) para cifragem em repouso.
- **Performance**: Resposta imediata (200 OK) no webhook antes de processamentos longos.
- **Resiliência**: Validação de assinatura rigorosa para prevenir fraudes.

---
**Observação**: O sistema já possui `APP_ENCRYPTION_KEY`. A coluna `pending_participant_names` será criada na migração inicial deste fluxo.
