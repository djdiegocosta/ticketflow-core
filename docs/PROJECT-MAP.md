# TicketFlow — Project Map

> **Purpose:** índice operacional de alta densidade para LLMs/agentes de código. Use este arquivo antes de investigar ou alterar o projeto.
>
> **Audit basis:** repositório `djdiegocosta/ticketflow-core`, branch `main`, commit `f97be42e4dbbc530235e1c01a23b46f11b76fecc`, auditoria realizada em 04/09/2026. O mapa privilegia código/migrations atuais sobre documentação histórica. Alterações existentes apenas em branches/PRs abertos são marcadas como **NÃO MERGED**.

## 0. Regra de uso por LLM

1. Leia este arquivo antes de modificar código.
2. Localize a área pelo índice abaixo.
3. Leia os arquivos indicados antes de criar nova lógica.
4. Para fluxo completo, siga **UI → query/mutation → RPC/Edge Function → tabela → RLS**.
5. Não duplique regras já centralizadas em hooks, queries ou funções SQL.
6. Não alterar arquitetura por conveniência.
7. Diferencie sempre: `IMPLEMENTADO`, `PARCIAL`, `PENDENTE`, `LEGADO`, `NÃO CONFIRMADO` e `NÃO MERGED`.
8. **Source of truth:** código e banco/migrations > documentação histórica > planos do Lovable > inferência.
9. Não editar `src/routes/routeTree.gen.ts` manualmente.
10. Antes de mudar banco, procure função/RPC, callers, migration e políticas RLS relacionadas.

## 1. Stack e estrutura

| Área | Local | Estado |
|---|---|---|
| App | `src/` | IMPLEMENTADO |
| Rotas | `src/routes/` | IMPLEMENTADO — TanStack file-based routing |
| Feature UI existente | `src/pages/` | IMPLEMENTADO; é utilizado pelas rotas atuais, mas não é a convenção para criar novas rotas |
| Queries/ações | `src/lib/*-queries.ts` | IMPLEMENTADO |
| Supabase | `src/integrations/supabase/`, `src/lib/` | IMPLEMENTADO |
| SQL | `supabase/migrations/` | IMPLEMENTADO |
| Design | `src/styles.css`, `docs/DESIGN-SYSTEM.md` | IMPLEMENTADO |
| Produto | `docs/TPS.md` | OFICIAL, mas pode divergir da implementação atual |
| Auditoria histórica | `docs/AUDITORIA-STATUS.md` | HISTÓRICO; pode estar desatualizado |
| Changelog | `docs/CHANGELOG.md` | HISTÓRICO |
| Planos Lovable | `.lovable/plan/` | HISTÓRICO/REFERÊNCIA |

Stack confirmada em `package.json`: React 19, TypeScript, Vite, TanStack Start/Router/Query, Supabase JS, Tailwind CSS, shadcn/Radix, Lucide, Recharts, html5-qrcode, QRCode React, jsPDF, React Hook Form e Zod.

`src/routes/README.md` confirma roteamento baseado em arquivos TanStack e orienta a não criar estruturas de Next.js/Remix nem editar `routeTree.gen.ts` manualmente.

## 2. Arquitetura de navegação

TanStack Start usa roteamento baseado em arquivos. O shell global está em `src/routes/__root.tsx`.

### Público
- `/` → entrada/redirecionamento
- `/login`
- `/cadastro`
- `/recuperar-senha`
- `/redefinir-senha`
- `/e/:slug`
- `/e/:slug/checkout`
- `/e/:slug/confirmacao/:sale_code`
- `/meus-ingressos`
- `/ingresso/:ticket_code`

### Cliente
- `/cliente`
- `/cliente/eventos`
- `/cliente/ingressos`
- `/cliente/ingressos/:ticket_code`
- `/cliente/perfil`
- `/cliente/pontos`

### Admin
- `/admin`
- `/admin/eventos`
- `/admin/eventos/novo`
- `/admin/eventos/:id`
- `/admin/vendas`
- `/admin/vendas/nova`
- `/admin/cortesias`
- `/admin/clientes`
- `/admin/clientes/:id`
- `/admin/checkin` → **alias/redirect** para `/checkin`
- `/admin/ferramentas`
- `/admin/checklist`
- `/admin/ferramentas/links-de-venda` (quando presente na árvore atual)
- `/admin/configuracoes`
- `/admin/configuracoes/mercado-pago`

> A lista é um índice operacional, não substitui a árvore real de `src/routes/`. Novas rotas devem ser confirmadas diretamente no código.

### Check-in isolado
O TPS documenta `/checkin` como módulo isolado. Na implementação atual, `src/routes/admin.checkin.tsx` existe como rota de compatibilidade que redireciona para `/checkin`; portanto, **não trate `/admin/checkin` como a implementação da tela**.

## 3. Layouts e autenticação

- `src/routes/__root.tsx` — shell global.
- `src/components/layouts/AdminLayout.tsx` — navegação/layout administrativo.
- `src/components/layouts/MobileLayout.tsx` — área do cliente/mobile.
- `src/lib/auth-context.tsx` — sessão, papel, organização e redirecionamento.
- `src/components/layouts/AdminPageActionContext.tsx` — ação primária do topbar administrativo.

### Modelo de acesso
- `visitor` — público/guest.
- `client` — área do cliente e seus próprios dados.
- `admin` — gestão da organização.
- `collaborator` — permissões operacionais limitadas.
- `operador_checkin` — check-in isolado.
- `superadmin` — LEGADO/fora do fluxo operacional atual; não criar novas dependências sem confirmação.

**Regra multi-tenant:** dados administrativos pertencem à organização. A autorização deve combinar autenticação + papel + pertencimento à organização quando aplicável.

## 4. Modelo de domínio central

Fluxo principal:

`ORGANIZAÇÃO → EVENTO → LOTE → VENDA → PAGAMENTO → INGRESSO → CHECK-IN`

Entidades principais:
- `organizations`
- `events`
- `ticket_batches`
- `sales`
- `tickets`
- `customers`
- `user_roles`
- `checkin_log`
- `checkout_abandonments`
- `checkout_rate_limits`

Entidades/áreas auxiliares incluem banners/vitrine, pontos, financeiro/importação e outras tabelas presentes nas migrations. Para schema exato, consultar as migrations e tipos gerados.

## 5. Organização / evento operacional

### Evento
Arquivos principais:
- `src/routes/admin.eventos.index.tsx`
- `src/routes/admin.eventos.novo.tsx`
- `src/routes/admin.eventos.$id.tsx`
- páginas correspondentes em `src/pages/admin/`
- `src/lib/events-queries.ts`

Regras relevantes:
- evento pertence a uma organização;
- evento pode ser encerrado/arquivado sem apagar histórico;
- publicação/encerramento afetam exposição pública e operação.

### Evento operacional
Implementação central confirmada em `src/lib/events-queries.ts`:
- considera eventos `publicado` e não encerrados;
- se houver evento iniciado, seleciona o iniciado mais recente;
- caso contrário, seleciona o próximo evento;
- `useOperationalEvent()` também expõe `hasMultipleCandidates`.

Regra de produto:
- quando existe um único evento operacional, áreas de vendas, ingressos, cortesias, check-in e indicadores devem resolvê-lo automaticamente;
- sem evento operacional, usar histórico/consolidado quando a área permitir;
- Clientes é global e não deve ser filtrado pelo evento;
- múltiplos candidatos exigem tratamento explícito quando a tela precisar de uma escolha inequívoca.

Não espalhar seleção manual de evento em cada tela.

## 6. Lotes e ingressos

Arquivos:
- `src/lib/ticket-batches-queries.ts`
- páginas/rotas de eventos e gestão de lotes
- módulos de tickets quando aplicável.

Banco:
- `ticket_batches`
- `tickets`

Conceitos:
- lotes pagos e lotes de cortesia são distintos por `ticket_batches.is_courtesy`;
- lotes possuem estoque e regras de disponibilidade/virada;
- ingressos são criados após confirmação de pagamento ou emissão de cortesia;
- check-in altera o estado do ingresso de forma controlada.

RPC relevante: `get_available_batches` — superfície pública; revisar autorização/estado do evento antes de alterar.

## 7. Vendas

Arquivos:
- `src/pages/admin/SalesListPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- rotas `admin.vendas*`

Tabela principal: `sales`.

Status observados: `pendente`, `pago`, `expirado`, `cancelado`.

Regras:
- cortesia não entra no faturamento pago;
- vendas expiradas não devem ser tratadas como pendentes;
- venda pendente reserva estoque;
- confirmação de pagamento deve ser idempotente;
- criação de ingresso depende de pagamento aprovado ou fluxo explícito de cortesia.

RPCs centrais observados:
- `create_pending_sale`
- `confirm_sale_paid`
- `confirm_sale_manual`
- `create_locked_tickets`
- operações de cancelamento/reembolso, que exigem revisão de autorização antes de alteração.

## 8. Expiração e estoque

Componentes:
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- migrations de pending sale/expiração.

Regra pretendida:
- venda pendente possui `expires_at`;
- expiração deve liberar a reserva de estoque;
- job periódico do banco executa a limpeza.

**Estado na `main` auditada:** o hardening de restauração de estoque, uso do `expires_at` no timer e correção do cron está em PR #13 e, portanto, é **NÃO MERGED** até confirmação do merge. Não documentar esse comportamento como confirmado na `main`.

## 9. Checkout público

Arquivos:
- `src/pages/PublicEventPage.tsx`
- `src/pages/CheckoutPage.tsx`
- rotas `e.$slug*`

Fluxo esperado:

`evento público → lote disponível → checkout → create_pending_sale → PIX → Mercado Pago → webhook → confirmação → ingresso`

Campos atuais do checkout:
- nome;
- WhatsApp;
- participantes;
- lote/quantidade;
- pagamento PIX.

Email e cidade foram removidos da UI do checkout atual.

Pendências conhecidas:
- proteção adicional/rate limiting da criação do PIX;
- vínculo retroativo de compra guest com conta criada posteriormente;
- validação final da confirmação pelo status real da venda;
- PDF de “baixar todos os ingressos”;
- compartilhamento do ingresso.

## 10. Mercado Pago

Arquivos principais:
- `src/lib/mp/mercado-pago.functions.ts`
- `src/routes/api/public/mp/webhook.ts`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/lib/mp/admin-middleware.ts` **NÃO MERGED** no estado auditado da `main`.

Funções:
- administração de credenciais;
- validação/teste de credenciais/webhook;
- criação de PIX;
- webhook de pagamento aprovado.

**Estado da `main`:** o endurecimento de autenticação administrativa, validação adicional do webhook, bloqueio de PIX expirado e idempotência reforçada está no PR #12 e não deve ser considerado implementado na `main` até merge/build.

## 11. Confirmação de pagamento e tickets

RPCs críticas:
- `confirm_sale_paid(sale_id, mp_payment_id)`;
- `create_locked_tickets(sale_id, participants)`.

No desenho de segurança alvo, ambas são privilegiadas e não devem ser executáveis por `anon`/`PUBLIC`.

**Importante:** como o hardening correspondente está fora da `main`, distinguir o desenho desejado do estado efetivamente implantado em cada ambiente.

O webhook deve ser a autoridade para pagamento online; o cliente não deve conseguir simular confirmação.

## 12. Check-in

Áreas:
- `src/routes/admin.checkin.tsx` — alias que redireciona para `/checkin`;
- módulo efetivo de check-in em `/checkin`;
- componentes/páginas de check-in;
- `checkin_log`;
- RPC `checkin_ticket`.

Regra:
- somente papéis operacionais autorizados podem confirmar check-in;
- operação deve ser atômica para impedir dois check-ins simultâneos do mesmo ingresso;
- operador de check-in deve permanecer isolado das áreas administrativas.

Offline/PWA:
- existe arquitetura/planejamento para operação offline via IndexedDB;
- isolamento/limpeza do cache por usuário ainda exige revisão/QA.

## 13. Cortesias

Arquivos:
- `src/pages/admin/CourtesiesListPage.tsx`
- fluxo de criação de cortesia;
- rotas `admin.cortesias*`;
- módulos de queries relacionados.

Banco:
- `ticket_batches.is_courtesy`
- `sales.is_courtesy`
- `tickets`

Regras:
- cortesia é R$0;
- não entra em faturamento;
- não deve ser tratada como venda paga comum;
- criação em lote deve respeitar estoque/quantidade.

## 14. Clientes e CRM

Arquivos:
- `src/pages/admin/ClientsListPage.tsx`
- `src/routes/admin.clientes.index.tsx`
- `src/routes/admin.clientes.$id.tsx`
- `src/routes/cliente/perfil.tsx`
- `src/lib/customers-queries.ts` e módulos relacionados.

Tabela: `customers`.

Modelo:
- cliente é associado à organização;
- usuário autenticado pode possuir registro de cliente na organização;
- Admin gerencia clientes da própria organização;
- área de Clientes é global e não deve herdar filtro do evento operacional.

Pendência importante:
- compras guest anteriores à criação da conta ainda não são automaticamente vinculadas por WhatsApp no fluxo auditado.

## 15. Área do cliente

Layout: `src/components/layouts/MobileLayout.tsx`.

Áreas:
- Início
- Eventos
- Ingressos
- Pontos
- Perfil

Implementado:
- menu hamburger no topo;
- remoção da saudação “Seja Bem Vindo!”;
- remoção do campo Instagram e do indicador de completude;
- preservação de dados antigos de Instagram no banco.

## 16. Público / privacidade

Superfícies públicas intencionais:
- evento público;
- lotes disponíveis;
- checkout guest;
- consultas estritamente necessárias ao fluxo público.

Dados que não devem ficar expostos publicamente:
- clientes;
- vendas completas;
- ingressos de terceiros;
- credenciais Mercado Pago;
- dados internos de organização.

Qualquer RPC `SECURITY DEFINER` público exige revisão individual de dados retornados, grants, RLS e callers.

## 17. Dashboard e indicadores

Arquivos:
- `src/pages/admin/DashboardPage.tsx` ou página correspondente;
- `src/lib/dashboard-queries.ts`;
- componentes de gráficos/cards.

Cards definidos:
1. Receita
2. Ingressos
3. Pendentes / Check-in conforme contexto operacional
4. Temperatura

Temperatura:
- níveis: Fria, Aquecendo, Quente, Explodindo;
- baseada em vendas pagas recentes;
- thresholds configuráveis em preferências da organização;
- Thermometer/Flame conforme nível;
- temperatura fria usa azul claro fixo.

Gráficos:
- vendas diárias dos últimos 14 dias;
- pico de vendas por horário.

Audience stats:
- idade média;
- faixa predominante;
- novos clientes;
- recorrentes;
- principais cidades.

## 18. Meta Ads

Arquivo principal: `src/pages/admin/ClientsListPage.tsx`.

Exportação:
- clientes carregados independentemente de busca/paginação;
- First Name / Last Name;
- WhatsApp normalizado;
- email normalizado;
- CSV UTF-8 com BOM/CRLF;
- clientes sem telefone e email são ignorados.

Não confundir exportação com CRM/remarketing automático.

## 19. Ferramentas

Rota principal: `src/routes/admin.ferramentas.index.tsx`.

Áreas identificadas na navegação/documentação atual:
- Histórico de Eventos
- Relatórios
- Vitrine
- Simulador de Evento
- Remarketing
- Checklist do Evento
- Links de venda, quando a rota correspondente estiver ativa.

Sorteios: decisão atual é remover/não priorizar.

Financeiro, Importação e Relatórios podem existir como áreas preparadas/placeholder; não assumir que estão funcionalmente completas sem verificar a implementação.

## 20. Vitrine

Área de banners/vitrine, com armazenamento próprio e regras de upload.

Buckets identificados no projeto:
- `event-images` para imagens de eventos;
- `organization-logos` para logos.

Não assumir exclusividade de banner apenas pela UI; a garantia deve ser verificada no banco/trigger/política correspondente.

## 21. Configurações

Arquivos:
- `src/routes/admin.configuracoes.index.tsx`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/pages/admin/SettingsPage.tsx`
- `src/lib/settings-queries.ts`

Preferências operacionais implementadas:
- minutos de expiração de venda pendente;
- threshold Aquecendo;
- threshold Quente;
- threshold Explodindo.

Tema do cliente não deve ser tratado como preferência persistida sem implementação específica.

## 22. Design System

Fontes de verdade:
- `docs/DESIGN-SYSTEM.md`;
- estilos/componentes atuais.

Princípios relevantes:
- desktop-first no Admin;
- mobile-first no público/cliente;
- estética minimalista/premium;
- escala de espaçamento baseada em 4px;
- componentes compartilhados devem ser preferidos a estilos locais duplicados;
- mensagens de erro devem explicar causa provável/ação, não apenas “Algo deu errado”.

## 23. Supabase / segurança

Antes de alterar tabela ou RPC:
1. localizar migration que criou/alterou;
2. localizar função/RPC;
3. localizar grants;
4. localizar RLS/policies;
5. localizar callers frontend/server;
6. verificar organização/usuário/role.

Áreas críticas:
- `sales`
- `tickets`
- `customers`
- `events`
- `ticket_batches`
- `organizations`
- `checkout_rate_limits`
- funções `SECURITY DEFINER`.

Padrão de autorização esperado:

`auth.uid()` → identidade → `user_roles` → papel → organização → recurso.

Não usar apenas um ID de organização enviado pelo cliente como prova de autorização.

## 24. SECURITY DEFINER — mapa de risco

Funções que participam de fluxo público devem ser mínimas e retornar somente dados necessários.

Funções administrativas/mutáveis devem:
- exigir autenticação;
- verificar papel;
- verificar organização;
- limitar execução para `authenticated`/service role conforme necessidade;
- usar `SET search_path` seguro ou referências totalmente qualificadas;
- evitar depender de valores fornecidos pelo browser para autorização.

Getters públicos que exigem revisão individual:
- `get_sale_status`
- `get_sales_by_whatsapp`
- `get_ticket_by_code`
- `get_available_batches`
- `handle_new_user`
- `has_role`
- `is_staff`

Não revogar esses getters em bloco sem analisar callers e necessidade no fluxo público.

## 25. Search path / views — pendências de segurança

Warnings já identificados para funções com `search_path` mutável incluem:
- `generate_short_code`
- `get_hourly_sales_stats`
- `get_new_customers_count`
- `handle_new_user`
- `get_single_organization_id`
- `is_staff`
- `has_role`
- `get_available_batches`
- `get_user_organization`

Também existe alerta relacionado a `public.event_ticket_stats` como view/SECURITY DEFINER.

Esses itens devem ser corrigidos com análise de compatibilidade, não por alteração cega.

## 26. Documentação vs código atual

Documentos podem descrever versões anteriores.

Exemplos:
- `README.md` contém material de fundação que pode não representar o sistema atual;
- `docs/AUDITORIA-STATUS.md` é histórico e pode estar defasado;
- `docs/TPS.md` é oficial para intenção de produto, mas há divergências já observadas com a implementação atual, inclusive rotas/UX e fluxos guest.

Exemplo confirmado: o TPS descreve `/checkin` como rota isolada, enquanto `admin.checkin.tsx` na implementação atual é um redirect para `/checkin`.

**Regra:** documentação histórica é evidência de intenção/histórico, não substitui o código atual quando houver conflito.

## 27. Git / branches / mudanças recentes

Repositório oficial: `djdiegocosta/ticketflow-core`.

PRs relevantes conhecidos:
- PR #9 — exportação Meta Ads — MERGED;
- PR #10 — dashboard/temperatura/preferências — MERGED;
- PR #12 — hardening Mercado Pago/segurança — ABERTO; NÃO MERGED;
- PR #13 — expiração/estoque/checkout expiration — ABERTO; NÃO MERGED.

Não assumir que uma alteração vista em PR aberto já está em `main`.

## 28. Pendências técnicas prioritárias conhecidas

### P0/P1 — segurança e integridade
- concluir hardening de mutations administrativas restantes;
- revisar getters públicos por exposição/rate limit;
- corrigir `SECURITY DEFINER`/search_path;
- revisar `event_ticket_stats`;
- confirmar RLS por tabela;
- validar proteção contra senhas vazadas no Supabase Auth;
- eliminar códigos de ingresso previsíveis;
- limitar abuso de criação de PIX.

### P1 — fluxo de negócio
- confirmação pós-compra baseada no status real;
- vínculo guest → conta por WhatsApp;
- PDF de ingressos;
- compartilhamento de ingresso;
- isolamento/limpeza do IndexedDB offline;
- E2E compra → PIX → webhook → ingresso;
- E2E expiração → devolução de estoque.

### P2 — qualidade/UX
- `PublicEventPage`: revisar uso de `useMemo` onde deveria ser `useEffect`;
- debounce na busca de cliente por WhatsApp;
- feedback imediato ao clicar Gerar PIX;
- refinamentos de QR/código do ingresso e hit areas.

### Release blocker
- build/Vercel precisa ser validado antes de considerar branches de hardening prontas para merge;
- fluxo real Mercado Pago precisa ser testado ponta a ponta.

## 29. Fluxos dourados

### Compra pública
`/e/:slug` → lotes → `/checkout` → `create_pending_sale` → `createMpPix` → Mercado Pago → webhook → `confirm_sale_paid` → `create_locked_tickets` → confirmação → `/ingresso/:ticket_code` → check-in.

### Cortesia
`Admin` → lote de cortesia → emissão → venda marcada como cortesia → tickets → cliente/check-in.

### Check-in
`ticket_code/QR` → validação → `checkin_ticket` → `checkin_log` → ingresso utilizado.

### Admin
`auth` → `user_roles` → organização → evento operacional → vendas/ingressos/cortesias/check-in/indicadores.

## 30. Arquivos de alta prioridade para investigação

```text
src/routes/__root.tsx
src/routes/README.md
src/lib/auth-context.tsx
src/lib/events-queries.ts
src/lib/sales-queries.ts
src/lib/dashboard-queries.ts
src/lib/settings-queries.ts
src/pages/CheckoutPage.tsx
src/pages/PublicEventPage.tsx
src/pages/admin/SalesListPage.tsx
src/pages/admin/CourtesiesListPage.tsx
src/pages/admin/ClientsListPage.tsx
src/pages/admin/SettingsPage.tsx
src/components/layouts/AdminLayout.tsx
src/components/layouts/MobileLayout.tsx
src/lib/mp/mercado-pago.functions.ts
src/routes/api/public/mp/webhook.ts
supabase/migrations/
docs/TPS.md
docs/DESIGN-SYSTEM.md
docs/AUDITORIA-STATUS.md
```

## 31. Regra final

> **Antes de escrever código, descubra onde a regra já vive.**
>
> Se a tarefa envolve dados: siga `UI → query → RPC/function → table → RLS`.
>
> Se envolve pagamento: siga `sale → expiration → PIX → Mercado Pago → webhook → confirmation → tickets`.
>
> Se envolve autorização: siga `auth.uid → role → organization → resource`.
>
> Se envolve evento: use o mecanismo de **evento operacional** em vez de criar filtros manuais duplicados.
>
> Se documentação e código divergirem, confirme o código/migration atual e marque a documentação como stale em vez de inventar uma nova regra.
