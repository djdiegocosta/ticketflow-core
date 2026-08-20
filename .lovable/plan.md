# Plano de Correções — Gauntlet AAA (TicketFlow)

Implementação de correções críticas no fluxo de checkout, navegação de check-in, métricas do dashboard e sistema de remarketing.

## 1. Integridade de Tickets (Venda Pendente)
- **Objetivo**: Garantir que vendas pendentes nunca gerem tickets/QR codes.
- **Ações**:
    - Auditar `src/pages/public/CheckoutPage.tsx` (ou similar) para remover chamadas a `create_locked_tickets` após `create_pending_sale`.
    - Verificar se `confirm_sale_paid` é o único gatilho para tickets em vendas online via Webhook.

## 2. Navegação do Check-in
- **Objetivo**: Corrigir a falha na saída da tela de Check-in.
- **Ações**:
    - Localizar o interceptor de `popstate` em `src/pages/admin/CheckinPage.tsx` (ou componente de layout de check-in).
    - Ajustar a confirmação do modal para desativar temporariamente o bloqueio e executar `navigate({ to: '/admin' })`.
    - Garantir que usuários `admin` e `colaborador` sejam redirecionados para `/admin`.

## 3. Métricas: Novos Clientes
- **Objetivo**: Filtrar cadastros reais (não guest checkout).
- **Ações**:
    - Atualizar a query/RPC responsável pelo card "Novos Clientes" no Dashboard.
    - Alterar filtro de `created_at` para `account_created_at IS NOT NULL`.

## 4. Pico de Vendas por Horário
- **Objetivo**: Dados reais com fuso horário `America/Sao_Paulo`.
- **Ações**:
    - Revisar a query de agregação de vendas por hora.
    - Usar `sales.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'`.

## 5. Remarketing e Status Expirado
- **Objetivo**: Simplificar a identificação de Pix abandonado.
- **Ações**:
    - Criar migração SQL para adicionar o status `'expirado'` ao tipo enum `sale_status` (se necessário) e atualizar a lógica de remarketing para ler este status.
    - Adicionar badge visual para status "Expirado" no componente de badge de vendas.

## Detalhes Técnicos
- **Banco de Dados**: Ajuste em views de estatísticas e possivelmente no script de expiração automática de vendas.
- **Frontend**: Mudanças em `useQuery` e componentes de UI (`StatusBadge`).
