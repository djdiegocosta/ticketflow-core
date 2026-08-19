# Plano de Evidência e Finalização: Fluxo 1A (Checkout Público)

Este plano detalha a coleta de evidências concretas para os 4 pontos críticos exigidos para o fechamento do Fluxo 1A, além da conclusão do Rate Limiting.

## 1. Evidência de Overselling (Teste de Concorrência)
- **Ação**: Criar um script Playwright/Python para disparar 20 requisições simultâneas à RPC `create_pending_sale` visando um lote com apenas 1 ingresso disponível.
- **Resultado Esperado**: Exatamente 1 sucesso e 19 falhas com erro "Estoque insuficiente".
- **Comprovação**: Log das respostas e print do estado final do banco (estoque = 0).

## 2. Centralização de Validação de Nome
- **Ação**: Mapear todos os componentes que importam `formatName` e `isFullName`.
- **Unificação**: Garantir que o `CheckoutPage.tsx` utilize estritamente estas funções em seu `zodResolver` e nos handlers de input, eliminando lógicas paralelas.

## 3. Agendamento de Expiração (30 min)
- **Ação**: Verificar se existe um `cron.schedule` para `expire_pending_sales`.
- **Implementação**: Se ausente, criar uma migração SQL configurando o `pg_cron` para rodar a cada 5 ou 10 minutos, garantindo que vendas com >30min sejam canceladas e o estoque devolvido.

## 4. Idempotência do Backend (Anti-Duplo Clique)
- **Mecanismo**: A RPC já possui um `ON CONFLICT (event_id, buyer_whatsapp)` na tabela de abandonos, mas precisamos de uma trava na criação da venda.
- **Melhoria**: Adicionar uma janela de tempo na RPC (ex: impedir nova reserva para o mesmo WhatsApp/Evento se houver uma 'pendente' criada nos últimos 60 segundos).

## 5. Conclusão do Rate Limiting
- **Implementação**: Finalizar a migração da tabela `checkout_rate_limits` e integrá-la à RPC `create_pending_sale`.

## Tabela de Release Gate (Final)
Ao concluir, apresentarei os resultados em formato de tabela para aprovação final.
