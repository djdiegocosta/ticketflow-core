# Plano de Blindagem AAA — Checkout Público & Check-in QR Code

## 1. Checkout Público (Fluxo 1A) — Conclusão e Evidências
Mapeamento de evidências para os 4 pontos críticos e finalização do Rate Limiting.

### 🔴 Auditor de Negócio & Adversário
- **Overselling (Teste de Estresse)**: Executar script em Python com `asyncio` para disparar 20 chamadas simultâneas à RPC `create_pending_sale` contra um lote com 1 ingresso.
  - **Meta**: 1 sucesso, 19 erros de estoque insuficiente.
- **Centralização de Nome**: Auditar e unificar o uso de `formatName` e `isFullName` em `src/pages/CheckoutPage.tsx`. Atualmente, o frontend usa `zod` e `onBlur` separadamente; a meta é garantir que o banco receba o dado já processado pela RPC `SECURITY DEFINER`.
- **Expiração Automática**: A RPC `expire_pending_sales` já existe, mas não está agendada.
  - **Ação**: Criar migração SQL para habilitar `pg_cron` e agendar a execução a cada 5 minutos.
- **Idempotência (Backend)**: Implementar trava de 60 segundos na RPC `create_pending_sale` baseada no par `(event_id, buyer_whatsapp)` para evitar reservas duplicadas em rajada, complementando a trava de UI.

### 🟡 Caos
- **Rate Limiting**: Finalizar a implementação da tabela `checkout_rate_limits` e injetar a verificação na RPC de venda.

---

## 2. Check-in por QR Code (Fluxo 2) — Blindagem
Foco em resiliência offline e segurança de acesso (RBAC).

### 🔎 Achados e Correções
- **Achado #1 (Perda de Dados)**: Corrigir `processSyncQueue` em `src/lib/checkin-data.ts`.
  - **Ação**: Alterar o loop para remover do IndexedDB apenas itens com `status: 200`. Itens com erro devem permanecer na fila para nova tentativa.
- **Achado #2 (Guard SuperAdmin)**: Proteger `/superadmin`.
  - **Ação**: Adicionar `beforeLoad` em `src/routes/superadmin.tsx` validando `has_role(auth.uid(), 'superadmin')`. Redirecionar operadores para `/checkin`.
- **Achado #3 (Limpeza de Legado)**: Remover `useCheckinAttempts` e `addCheckinAttempt` de `src/lib/checkin-data.ts`.
  - **Ação**: Substituir chamadas em `CheckinPage.tsx` pelo histórico real filtrado do banco/cache local.
- **Achado #4 (Schema & Isolamento)**:
  - **Ação**: Criar migration para `checkin_log` e RPC `checkin_ticket` (atualmente apenas introspectadas). Garantir que a RPC valide `organization_id` comparando o `event_id` do ticket com a organização do usuário logado.

---

## 3. Comitê AAA (Check-in)
- **🔴 Adversário**: Rate limiting na RPC `checkin_ticket` para evitar brute force no código manual.
- **🟡 Caos**: Proteção contra disparos duplicados de sincronização em redes instáveis (lock de execução em `processSyncQueue`).
- **🔵 Auditor**: Garantir que `checkin_log` registre `invalid` e `duplicate` (hoje pode estar ignorando falhas no offline).
- **🟣 Borda**: Refinar o indicador de "Sincronização Pendente" no header para ser visualmente mais urgente se a fila crescer.

## Cronograma de Execução
1. Executar testes de Overselling e gerar relatório.
2. Aplicar migrações de agendamento (cron) e rate limit.
3. Refatorar `checkin-data.ts` (offline e limpeza de legado).
4. Implementar Guards de rota em SuperAdmin.
5. Atualizar Tabela de Status final (Release Gate).
