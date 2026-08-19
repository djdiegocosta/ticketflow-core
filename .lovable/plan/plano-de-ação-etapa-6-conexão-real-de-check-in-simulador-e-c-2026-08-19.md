# Plano de Ação - Etapa 6: Conexão Real de Check-in, Simulador e Checklist

## 1. Check-in Real (/checkin)
- **lib/checkin-data.ts**: Refatorar para usar o cliente Supabase gerado. Substituir dados mock por consultas reais.
- **RPC `checkin_ticket`**: Implementar chamada à função do banco para validação de ingressos.
- **Cache Offline**: Ajustar `preloadEventTickets` para buscar ingressos reais do evento via Supabase.
- **Fila de Sincronização**: Ao reconectar, processar itens pendentes chamando `checkin_ticket` individualmente via RPC.
- **Histórico**: `CheckinHistoryPage.tsx` passará a buscar dados da tabela `checkin_log` filtrando por `organization_id` e `event_id`.

## 2. Simulador de Evento (/admin/simulador)
- **Persistência**: Adicionar botão "Salvar simulação" em `SimuladorPage.tsx`.
- **CRUD**: Salvar `input_data` e `result_summary` na tabela `simulations` via insert direto.
- **Histórico**: Implementar painel lateral ou lista para recuperar simulações anteriores e recarregar o estado nos campos.

## 3. Checklist do Evento (/admin/checklist)
- **Persistência**: Mudar de `useState` para CRUD direto na tabela `event_checklist_items`.
- **Operações**:
  - `fetchTasks`: Carregar tarefas do banco.
  - `handleAddTask`: `insert` no banco.
  - `toggleTask`: `update` (is_completed).
  - `removeTask`: `delete`.

## Detalhes Técnicos
- Utilizar `supabase` de `@/integrations/supabase/client`.
- Manter o IndexedDB como camada de cache para o Check-in offline.
- Não criar novas rotas ou funções globais de escrita; usar RPCs existentes e inserts diretos permitidos pela RLS.
