# TicketFlow — Project Map

> **Purpose:** índice operacional de alta densidade para LLMs/agentes de código. Use este arquivo antes de investigar ou alterar o projeto.
>
> **Audit basis:** repositório `djdiegocosta/ticketflow-core`, branch `main`, commit `c5cd08718eac4f0a15fa1f97133bfa14ffaa2691`, revalidado em 05/09/2026 (auditoria original de 04/09/2026, no commit `f97be42e4dbbc530235e1c01a23b46f11b76fecc`, atualizada após confirmação de que o hardening de Mercado Pago do PR #12 chegou à `main` pelo PR #16, e após checagem individual de cada função citada nas Seções 24 e 25 direto no banco). O mapa privilegia código/migrations atuais sobre documentação histórica. Alterações existentes apenas em branches/PRs abertos são marcadas como **NÃO MERGED**.

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
- `src/lib/auth-context.tsx` — sessão, papel, organização e redirecionamento. Contém lógica que evita redirecionar a pessoa de volta para a home do seu papel quando a sessão é apenas revalidada em segundo plano (ex.: voltar de outra aba) — não remover essa checagem de "já está na própria área" sem entender por que existe.
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
- `create_manual_sale`
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

**Estado na `main` auditada:** o hardening de restauração de estoque, uso do `expires_at` no timer e correção do cron **continua NÃO MERGED**. Existem duas branches abertas cobrindo esse escopo — PR #13 (`fix/pending-sale-expiration`, escopo original) e PR #15 (`fix/consolidated-hardening`, consolidação mais recente que tenta unificar #12 e #13 numa base atual da `main`). Nenhuma das duas está mesclada. Não documentar esse comportamento como confirmado na `main` até um dos dois PRs ser mesclado.

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

Funções:
- administração de credenciais;
- validação/teste de credenciais/webhook;
- criação de PIX;
- webhook de pagamento aprovado.

**Estado da `main` (confirmado no código e nas grants do banco):** o endurecimento de autenticação administrativa (`assertOrgAdmin` em toda função administrativa), a validação de assinatura HMAC do webhook, o bloqueio de criação de PIX para venda com `expires_at` vencido (`mercado-pago.functions.ts`, checagem explícita antes de chamar o Mercado Pago) e as restrições de privilégio de `confirm_sale_paid`/`create_locked_tickets` (hoje `EXECUTE` só para `service_role`, negado para `anon`/`authenticated`) **já estão IMPLEMENTADOS na `main`**. Chegaram pelo **PR #16** ("fix: consolidate payment and security hardening", mesclado em 05/09/2026) — uma consolidação criada direto da `main` que superou o PR #12 original (o #12 segue aberto, mas seu conteúdo já está coberto pelo #16; não usar o #12 como referência de pendência para este escopo).
`src/lib/mp/admin-middleware.ts` nunca existiu como arquivo separado — a autorização administrativa foi consolidada dentro de `mercado-pago.functions.ts` via `assertOrgAdmin`.

## 11. Confirmação de pagamento e tickets

RPCs críticas:
- `confirm_sale_paid(sale_id, mp_payment_id)`;
- `create_locked_tickets(sale_id, participants)`.

**Confirmado no banco (grants atuais):** ambas já são restritas — `EXECUTE` concedido apenas a `service_role`; `anon` e `authenticated` não podem executá-las. O desenho de segurança alvo já está implementado, não é mais apenas uma intenção.

O webhook é a autoridade para pagamento online; o cliente não consegue simular confirmação diretamente via essas RPCs.

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
- `src/routes/cliente.perfil.tsx`
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
- `src/pages/AdminDashboard.tsx`;
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

Financeiro, Importação e Relatórios podem existir como áreas preparadas/placeholder; não assumir que estão funcionalmente completas sem verificar a implementação.

> Decisões de roadmap de produto (o que priorizar, o que remover) pertencem ao `docs/TPS.md`, não a este mapa.

## 20. Vitrine

Área de banners/vitrine, com armazenamento próprio e regras de upload.

Buckets identificados no projeto (confirmado em `storage.buckets`):
- `event-images` para imagens de eventos;
- `organization-logos` para logos;
- `client-banners` para os banners da Vitrine.

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

A **cor** de destaque (`organizations.accent_color`) é preferência da organização (admin), não do cliente individual — não implementar seleção de cor por cliente sem confirmação explícita. Já o modo **claro/escuro** é uma preferência persistida globalmente no navegador (`localStorage`, chave `ticketflow-theme`, ver `src/lib/theme.tsx`), aplicada em toda a aplicação — não tratar esse toggle como não-persistido.

## 22. Design System

Fontes de verdade:
- `docs/DESIGN-SYSTEM.md`;
- estilos/componentes atuais.

> `docs/DESIGN-SYSTEM.md` e `docs/TPS.md` ainda descrevem uma opção de "cantos retos" configurável (`organizations.corner_style`) como implementada. Essa opção **foi removida do produto**: não existe mais UI para escolhê-la, e o runtime não lê/escreve mais essa coluna. Cantos arredondados são hoje o único padrão do sistema. A coluna `corner_style` continua existindo no banco, mas é legado não utilizado pelo frontend.

Sistema de tema de cor (implementado, `src/lib/design.tsx`):
- 4 temas — Verde, Azul, Roxo, Vermelho — definidos em `ACCENT_COLORS`, com valores próprios para modo claro e escuro;
- `--icon-brand`: cor "viva"/saturada usada nos ícones dos cards do dashboard (token separado de `--accent`, que é usado em botões/links);
- `FULL_THEME_OVERRIDES`: override completo de fundo/texto/borda/gráficos (não só a cor de destaque) — hoje definido para os temas Vermelho e Roxo; Verde e Azul usam os tokens padrão do sistema;
- aplicado tanto no admin (`DesignProvider`) quanto nas páginas públicas/cliente (`useApplyPublicDesign`, `useApplyCustomerDesign` em `src/lib/customer-queries.ts`).

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

Getters públicos que exigem revisão individual (nomes confirmados em `pg_proc`, banco atual):
- `get_available_batches`
- `handle_new_user`
- `has_role`
- `get_tickets_by_sale_code`
- `create_manual_sale`

> Nomes como `get_sale_status`, `get_sales_by_whatsapp`, `get_ticket_by_code` e `is_staff` **não existem** no banco atual — não usar como referência de busca; se aparecerem em documentação histórica, tratar como nomenclatura antiga/planejada e nunca implementada com esse nome.

Não revogar esses getters em bloco sem analisar callers e necessidade no fluxo público.

## 25. Search path / views — pendências de segurança

Warnings de `search_path` mutável — status confirmado via `pg_proc.proconfig` no banco atual:

Ainda pendentes (mutável, sem `SET search_path` fixo):
- `generate_short_code`
- `get_hourly_sales_stats`
- `get_new_customers_count`

Já corrigidas (search_path já fixado como `public`; não tratar como pendência):
- `handle_new_user`
- `get_single_organization_id`
- `has_role`
- `get_available_batches`
- `get_user_organization`

> `is_staff` foi removida desta lista por não existir como função no banco atual.

Também existe alerta relacionado a `public.event_ticket_stats` como view sem `security_invoker` habilitado (`reloptions` nulo, confirmado no banco) — continua pendente.

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

PRs relevantes conhecidos (estado confirmado via API do GitHub):
- PR #9 — exportação Meta Ads — MERGED;
- PR #10 — dashboard/temperatura/preferências — MERGED;
- PR #11 — remoção de superadmin legado — MERGED;
- PR #14 — este próprio PROJECT-MAP.md — MERGED;
- PR #16 — consolidação de hardening de pagamento/segurança (Mercado Pago, webhook, RPCs privilegiadas) — **MERGED**; substitui na prática o escopo do PR #12;
- PR #12 — hardening Mercado Pago (versão original) — ABERTO, mas obsoleto: seu conteúdo já está coberto pelo #16; não usar como referência de pendência;
- PR #7 — botão de lista PDF em Vendas — ABERTO; NÃO MERGED;
- PR #13 — expiração/estoque/checkout expiration (versão original) — ABERTO; NÃO MERGED;
- PR #15 — consolidação mais recente de expiração/estoque (tenta unificar #12 e #13) — ABERTO; NÃO MERGED; é a referência mais atual para quem for continuar esse trabalho.

Não assumir que uma alteração vista em PR aberto já está em `main` — mas também não assumir que todo hardening relevante ainda está pendente só porque o PR que o descrevia originalmente continua aberto: confirme sempre no código/banco atual (ver Seções 10 e 11).

## 28. Pendências técnicas prioritárias conhecidas

### P0/P1 — segurança e integridade
- ~~concluir hardening de mutations administrativas restantes~~ — **RESOLVIDO** via PR #16 (ver Seções 10/11);
- corrigir os 3 getters/funções com `search_path` ainda mutável: `generate_short_code`, `get_hourly_sales_stats`, `get_new_customers_count` (ver Seção 25 — lista reduzida após confirmação no banco);
- revisar `event_ticket_stats` (view sem `security_invoker`, ainda pendente);
- restaurar estoque automaticamente na expiração de venda pendente (PR #13/#15, ainda não mesclado);
- confirmar RLS por tabela;
- validar proteção contra senhas vazadas no Supabase Auth (não verificado nesta auditoria);
- eliminar códigos de ingresso previsíveis (não verificado nesta auditoria);
- limitar abuso de criação de PIX — a tabela `checkout_rate_limits` existe no banco, mas não há referência a ela em `mercado-pago.functions.ts`; rate limiting de criação de PIX ainda não está conectado.

### P1 — fluxo de negócio
- confirmação pós-compra baseada no status real;
- vínculo guest → conta por WhatsApp;
- PDF de ingressos;
- compartilhamento de ingresso;
- isolamento/limpeza do IndexedDB offline;
- E2E compra → PIX → webhook → ingresso;
- E2E expiração → devolução de estoque.

### Release blocker
- fluxo real de expiração/restauração de estoque (PR #13/#15) precisa ser mesclado e testado ponta a ponta antes de considerar o ciclo de segurança do checkout fechado.

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
src/lib/customer-queries.ts
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
