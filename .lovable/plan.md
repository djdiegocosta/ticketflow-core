# Plano de Blindagem: Fluxo 2 — Check-in por QR Code (Gauntlet AAA)

Este plano visa corrigir os achados de segurança, resiliência e conformidade identificados no Fluxo 2 (Check-in), garantindo a integridade operacional conforme a `TPS.md`.

## Achados e Soluções

### 1. Resiliência: Sincronização Robusta (Offline First)
- **Problema**: `processSyncQueue` apaga a fila mesmo se as chamadas falharem, causando perda de dados.
- **Solução**: Alterar `lib/checkin-data.ts` para processar cada item individualmente e remover do IndexedDB apenas os itens confirmados pela RPC com sucesso. Itens com erro permanecem para nova tentativa.

### 2. Segurança: Isolamento de Rotas (RBAC)
- **Problema**: Rota `/superadmin` e outras áreas administrativas estão acessíveis a operadores de check-in sem guard de proteção real.
- **Solução**: Implementar `beforeLoad` em `src/routes/superadmin.tsx` para bloquear qualquer papel que não seja estritamente `superadmin`. Reforçar o redirecionamento de `operador_checkin` para `/checkin` em rotas não autorizadas.

### 3. Limpeza: Remoção de Código Legado
- **Problema**: `useCheckinAttempts` mantém uma lista em memória que diverge do `checkin_log` real do banco.
- **Solução**: Remover `addCheckinAttempt` e `useCheckinAttempts` de `lib/checkin-data.ts` e do componente `CheckinPage.tsx`. O feedback de sucesso/erro virá diretamente da resolução da RPC/Cache local.

### 4. Auditoria: Migração do Schema de Check-in
- **Problema**: Faltam definições SQL para `checkin_log` e RPC `checkin_ticket` no repositório.
- **Solução**: Criar migration em `supabase/migrations/` com o schema real.
- **Blindagem**: A RPC `checkin_ticket` deve validar internamente se o `organization_id` do ticket pertence à organização do usuário autenticado (`auth.uid()`), impedindo manipulações via client.

## Detalhes Técnicos

### Backend (SQL)
- Tabela `checkin_log` com RLS.
- RPC `checkin_ticket(ticket_code)` com `SECURITY DEFINER` e validação multi-tenant.

### Frontend (React/TanStack)
- **lib/offline-db.ts**: Adicionar `removeItemFromSyncQueue(id)`.
- **lib/checkin-data.ts**: Refatorar `processSyncQueue` para ser atômico por item.
- **routes/superadmin.tsx**: Adicionar guard de papel.

## Etapas de Implementação
1. Criar migration SQL com infra de check-in e segurança.
2. Refatorar lógica de sincronização offline para evitar perda de dados.
3. Proteger rotas administrativas contra operadores.
4. Remover estado em memória legado.
5. Validar fluxo completo (Online, Offline e Sync).
