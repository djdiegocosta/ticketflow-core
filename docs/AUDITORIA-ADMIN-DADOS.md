# TicketFlow — Auditoria de carregamento de dados administrativos

**Data:** 08/09/2026 23:xx BRT  
**Agente:** ChatGPT  
**Repositório:** `djdiegocosta/ticketflow-core`  
**Branch:** `main`

## Sintoma reportado

Em algumas sessões, ao acessar `/admin`, o Dashboard permanecia em `Carregando métricas...` e outras áreas administrativas não exibiam dados. A seção `Eventos`, entretanto, continuava carregando corretamente. O comportamento não era reproduzido de forma consistente em outro navegador/conta.

## Causa técnica identificada

As queries administrativas iniciavam independentemente do estado final do contexto de autenticação e organização fornecido por `AuthProvider`.

Havia três fragilidades combinadas:

1. Queries administrativas não utilizavam `session/user/organizationId` como condição explícita de execução.
2. Algumas queries buscavam novamente `get_single_organization_id()` em vez de usar o `organizationId` já resolvido pelo `AuthProvider`, aumentando a janela para uma corrida entre restauração da sessão e carregamento dos dados.
3. As chaves do React Query não identificavam explicitamente usuário/organização em várias queries, permitindo que uma consulta/cache de contexto anterior fosse reutilizada de forma inadequada.
4. O Dashboard tratava qualquer loading de suas queries principais como `Carregando métricas...` e não apresentava o erro real quando uma consulta falhava. Assim, uma falha de autorização, sessão ou RPC podia parecer um problema de conexão com o banco.

A diferença com `/admin/eventos` também foi relevante: a consulta de eventos possui regras de leitura diferentes e, portanto, continuar funcionando não prova que as consultas administrativas protegidas por RLS estejam no mesmo estado.

## Correção aplicada

### `src/lib/sales-queries.ts`

- Queries administrativas passaram a depender explicitamente de `authLoading`, usuário autenticado e `organizationId`.
- `useSales()` e `useSalesStats()` passaram a usar diretamente o `organizationId` do `AuthProvider`, eliminando a chamada redundante a `get_single_organization_id()`.
- Chaves do React Query passaram a incluir `organizationId` e `user.id`.
- `useCourtesies`, `useCourtesiesStats`, `useSale` e `useSaleStatus` receberam o mesmo isolamento de contexto.

**Commit:** `cc8fc683913f0cf9ba190ff836617a7556570aaa`

### `src/lib/dashboard-queries.ts`

- Queries de métricas, público, Pix, temperatura e vendas por horário passaram a aguardar o contexto autenticado.
- Chaves do React Query passaram a incluir usuário/organização para evitar reutilização entre contextos.
- `useTemperature` passou a respeitar simultaneamente a autenticação e o carregamento das preferências.

**Commit:** `f8627553b592239f9f6c259185fc3abffbf39e5f`

### `src/lib/settings-queries.ts`

- `useOrganization`, `useOperationalPreferences`, `useMpConfig` e `useBanners` passaram a utilizar o `organizationId` resolvido pelo contexto de autenticação.
- Queries administrativas deixaram de depender de consultas paralelas a `user_roles` apenas para descobrir a organização.
- Mutations administrativas passaram a rejeitar explicitamente execução sem sessão/contexto válido.

**Commit:** `b1c6ac511c878586768d2abed860d366c5c97fd4`

### `src/pages/AdminDashboard.tsx`

- O Dashboard agora diferencia autenticação/loading de erro de consulta.
- Uma falha nas métricas não fica mais mascarada indefinidamente como `Carregando métricas...`.
- O erro retornado pela consulta é apresentado de forma explícita.
- Foi adicionado retry manual para as consultas do Dashboard.
- Falhas secundárias de público/Pix não derrubam o Dashboard inteiro e passam a ser sinalizadas separadamente.

**Commit:** `37404eed2cac4cdad7a025d2c3763a0e821ccf80`

## Estado

**Status:** `RESOLVIDO — correção aplicada no código; validação final de produção em andamento.`

A correção foi versionada na `main` e o Git Integration da Vercel iniciou automaticamente novos deployments de produção para os commits envolvidos.

## Validação

- O projeto Supabase foi verificado durante a investigação e estava acessível/saudável.
- O banco continha dados válidos nas tabelas principais no momento da auditoria.
- A Vercel iniciou deployments para os três commits da correção.
- O deployment do primeiro commit de correção (`cc8fc...`) chegou a `READY`.
- O deployment seguinte (`f862...`) também chegou a `READY`.
- O deployment final com a melhoria de diagnóstico (`37404...`) estava em `BUILDING` no momento do registro desta auditoria.

## Observação importante

A informação de que o problema não aparece em outro navegador/conta reforça a hipótese de estado local de sessão/cache, mas não é prova isolada de cache. A correção foi desenhada para eliminar a dependência desse comportamento: o contexto autenticado agora faz parte da habilitação e da identidade das queries administrativas.

## Próxima validação funcional

Após o deployment final ficar `READY`, testar no navegador que apresentava o problema:

1. abrir `/admin` com a sessão já existente;
2. atualizar a página;
3. sair e entrar novamente;
4. navegar `/admin` → `Eventos` → `Vendas` → `/admin`;
5. deixar a aba inativa e retorná-la após alguns minutos;
6. confirmar que, em caso de falha real, o Dashboard mostra o erro e permite retry em vez de ficar indefinidamente em `Carregando métricas...`.
