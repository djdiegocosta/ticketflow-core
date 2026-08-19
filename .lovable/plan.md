# Plano de Blindagem: Fluxo 2 — Check-in por QR Code (Gauntlet AAA)

Este plano visa fechar os achados de segurança e resiliência identificados no Fluxo 2, garantindo que o Check-in seja à prova de falhas operacionais e ataques, conforme as regras da `TPS.md`.

## Achados Críticos e Soluções

### 1. Resiliência: Perda Silenciosa na Fila de Sincronização
- **Problema**: `processSyncQueue` limpa a fila incondicionalmente, mesmo se a RPC falhar.
- **Solução**: Refatorar `lib/checkin-data.ts` para que apenas itens processados com sucesso sejam removidos da fila. Itens com erro permanecem para re-tentativa automática na próxima conexão.

### 2. Segurança: Rota `/superadmin` Sem Guard
- **Problema**: `superadmin.tsx` e suas sub-rotas não possuem proteção contra papéis não autorizados (ex: Operador).
- **Solução**: Implementar `beforeLoad` em `src/routes/superadmin.tsx` (e garantir que se aplique às sub-rotas) validando se o papel é estritamente `superadmin`. Operadores de check-in devem ser redirecionados para `/checkin`.

### 3. Código Legado: Remoção de Lista em Memória
- **Problema**: `addCheckinAttempt` e `useCheckinAttempts` criam uma lista divergente do histórico real do banco.
- **Solução**: Remover o sistema de lista em memória. O componente `CheckinPage.tsx` deve depender do histórico real (via `checkin_log`) para feedback visual, eliminando o risco de "falso positivo" ou "falso negativo" client-side.

### 4. Auditoria: Migração do Schema de Check-in
- **Problema**: Tabela `checkin_log` e RPC `checkin_ticket` não estão versionadas em migrations locais.
- **Solução**: Gerar uma nova migration (`supabase/migrations/`) contendo a definição real da tabela `checkin_log` e da RPC `checkin_ticket`.
- **Blindagem na RPC**: Garantir que a RPC valide `organization_id` e `event_id` do ticket contra a sessão do usuário (através de `auth.uid()`) para evitar cross-tenant access via script.

## Detalhes Técnicos

### Arquivos Envolvidos
- `src/lib/checkin-data.ts`: Ajuste no loop de sync e remoção de código legado.
- `src/lib/offline-db.ts`: Adição de método `removeFromSyncQueue(id)` para remoção seletiva.
- `src/routes/superadmin.tsx`: Adição de Route Guard.
- `src/pages/CheckinPage.tsx`: Refatoração para não usar `useCheckinAttempts`.
- `supabase/migrations/`: Nova migration de infraestrutura de check-in.

### Etapas de Implementação
1. **Infra**: Criar a migration com o schema real e segurança reforçada na RPC.
2. **Offline**: Ajustar `offline-db.ts` e `checkin-data.ts` para persistência seletiva de falhas.
3. **Segurança**: Proteger a rota `/superadmin` e validar o isolamento do papel Operador.
4. **Limpeza**: Remover o estado `attempts` em memória e padronizar o histórico.
