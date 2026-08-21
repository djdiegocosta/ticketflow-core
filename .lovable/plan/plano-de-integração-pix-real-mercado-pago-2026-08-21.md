# Plano de Integração Pix Real Mercado Pago

Este plano descreve a substituição do Pix simulado pela integração real com o Mercado Pago no checkout, incluindo monitoramento automático do status de pagamento.

## Alterações Técnicas

### 1. `src/lib/sales-queries.ts`
- Implementar o hook `useGenerateSalePix` utilizando `useServerFn` para chamar a função de servidor `createMpPix`.
- Implementar o hook `useSaleStatus` utilizando `useQuery` para realizar o polling do status da venda no Supabase (`refetchInterval: 4000ms`), parando automaticamente quando o status for `'pago'`.

### 2. `src/pages/CheckoutPage.tsx`
- **Limpeza:** Remover `pixKey` estático, imports de `QRCodeSVG`, `useConfirmSalePaid` e a função `simulatePayment`.
- **Fluxo de Pagamento:**
    - Adicionar estado `pixData` para armazenar o QR Code real.
    - No `onSubmit`, após criar a reserva, gerar o Pix real via `useGenerateSalePix`.
    - Bloquear o avanço para a etapa de pagamento se a geração do Pix falhar.
- **Interface:**
    - Substituir o `<QRCodeSVG />` por um elemento `<img>` renderizando o QR Code em Base64.
    - Exibir spinner enquanto o Pix está sendo gerado.
    - Atualizar a função `copyPix` para usar o código dinâmico.
- **Navegação Automática:**
    - Monitorar o status via `useSaleStatus`.
    - Ao detectar `status === 'pago'`, redirecionar automaticamente para a página de confirmação.

## Considerações de Segurança
- A geração do Pix ocorre no servidor via `createServerFn`.
- O botão de simulação será completamente removido da interface pública.
