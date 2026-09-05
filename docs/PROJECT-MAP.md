# TicketFlow — Project Map

> **Purpose:** índice operacional de alta densidade para LLMs/agentes de código. Leia este arquivo antes de investigar ou alterar o projeto.
>
> **Audit basis:** `djdiegocosta/ticketflow-core`, branch `main`, commit `f97be42e4dbbc530235e1c01a23b46f11b76fecc`, auditoria em 04/09/2026. O mapa privilegia código e banco/migrations atuais sobre documentação histórica. Alterações existentes apenas em branches/PRs abertos são **NÃO MERGED**.
>
> **Document delivery:** este arquivo é o conteúdo do **PR #14**, branch `docs/project-map`. Enquanto o PR não estiver merged, ele não está disponível para agentes que trabalham exclusivamente sobre `main`.

## 0. Regra de uso por LLM

1. Leia este arquivo antes de modificar código.
2. Localize a área pelo índice e leia os arquivos indicados antes de criar nova lógica.
3. Para fluxo completo, siga **UI → query/mutation → RPC/Edge Function → tabela → RLS**.
4. Não duplique regras já centralizadas em hooks, queries ou funções SQL.
5. Não altere arquitetura por conveniência.
6. Diferencie sempre: `IMPLEMENTADO`, `PARCIAL`, `PENDENTE`, `LEGADO`, `NÃO CONFIRMADO` e `NÃO MERGED`.
7. **Source of truth:** código + banco/migrations > documentação histórica > planos do Lovable > inferência.
8. Não editar `src/routes/routeTree.gen.ts` manualmente.
9. Antes de alterar banco, procure migration, função/RPC, callers, grants e RLS relacionados.
10. Antes de assumir que algo existe em produção, confira se está na `main`; PR aberto não é implementação.
11. Se outro agente estiver trabalhando no repositório, não sobrescreva trabalho desconhecido: confira branch/PR/commit antes de editar.
12. Para mudanças sensíveis, prefira branch + PR e valide build antes do merge.

## 1. Stack e estrutura

| Área | Local | Estado |
|---|---|---|
| App | `src/` | IMPLEMENTADO |
| Rotas | `src/routes/` | IMPLEMENTADO — TanStack file-based routing |
| Feature UI existente | `src/pages/` | IMPLEMENTADO; utilizado pelas rotas atuais |
| Queries/ações | `src/lib/*-queries.ts` | IMPLEMENTADO |
| Supabase | `src/integrations/supabase/`, `src/lib/` | IMPLEMENTADO |
| SQL | `supabase/migrations/` | IMPLEMENTADO |
| Design | `src/styles.css`, `src/lib/design.tsx`, `docs/DESIGN-SYSTEM.md` | IMPLEMENTADO |
| Produto | `docs/TPS.md` | OFICIAL para intenção; pode divergir do código atual |
| Auditoria histórica | `docs/AUDITORIA-STATUS.md` | HISTÓRICO; pode estar desatualizado |
| Changelog | `docs/CHANGELOG.md` | HISTÓRICO |
| Planos Lovable | `.lovable/plan/` | HISTÓRICO/REFERÊNCIA |

Stack confirmada em `package.json`: React 19, TypeScript, Vite, TanStack Start/Router/Query, Supabase JS, Tailwind CSS, shadcn/Radix, Lucide, Recharts, html5-qrcode, QRCode React, jsPDF, React Hook Form e Zod.

`src/routes/README.md` confirma roteamento baseado em arquivos TanStack e orienta a não criar estruturas de Next.js/Remix nem editar `routeTree.gen.ts` manualmente.

## 2. Arquitetura de navegação

TanStack Start usa roteamento baseado em arquivos. O shell global está em `src/routes/__root.tsx`.

### Público
- `/`
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
- `/admin/checkin` → alias/redirect para `/checkin`
- `/admin/ferramentas`
- `/admin/checklist`
- `/admin/ferramentas/links-de-venda` quando presente na árvore atual
- `/admin/configuracoes`
- `/admin/configuracoes/mercado-pago`

> Esta lista é um índice operacional, não substitui a árvore real. Novas rotas devem ser confirmadas diretamente em `src/routes/`.

### Check-in
`src/routes/admin.checkin.tsx` é compatibilidade/redirect. A implementação efetiva usa `/checkin`.

## 3. Layouts e autenticação

Arquivos principais:
- `src/routes/__root.tsx` — shell global.
- `src/components/layouts/AdminLayout.tsx` — layout administrativo.
- `src/components/layouts/MobileLayout.tsx` — área do cliente.
- `src/lib/auth-context.tsx` — sessão, papel, organização e redirecionamento.
- `src/components/layouts/AdminPageActionContext.tsx` — ação primária do topbar.

Papéis observados:
- `visitor` — público/guest.
- `client` — área do cliente e seus próprios dados.
- `admin` — gestão da organização.
- `collaborator` — operação limitada.
- `operador_checkin` — check-in isolado.
- `superadmin` — LEGADO; não criar novas dependências sem confirmação.

Regra multi-tenant: autorização administrativa deve combinar autenticação + papel + organização + recurso quando aplicável.

## 4. Modelo de domínio central

`ORGANIZAÇÃO → EVENTO → LOTE → VENDA → PAGAMENTO → INGRESSO → CHECK-IN`

Tabelas centrais:
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

Para schema exato, consultar migrations/tipos atuais.

## 5. Organização e evento operacional

Arquivos principais:
- `src/lib/events-queries.ts`
- `src/routes/admin.eventos.index.tsx`
- `src/routes/admin.eventos.novo.tsx`
- `src/routes/admin.eventos.$id.tsx`

Regras:
- evento pertence a uma organização;
- encerramento/arquivamento preserva histórico;
- publicação/encerramento afetam exposição pública e operação.

### Evento operacional
A seleção centralizada em `src/lib/events-queries.ts` considera eventos publicados e não encerrados:
1. se houver evento iniciado, usa o iniciado mais recente;
2. caso contrário, usa o próximo evento;
3. se não houver candidato, não há evento operacional;
4. `useOperationalEvent()` também informa `hasMultipleCandidates`.

Regra de produto:
- vendas, ingressos, cortesias, check-in e indicadores devem usar o evento operacional automaticamente quando aplicável;
- sem evento operacional, áreas que suportam histórico usam dados consolidados;
- Clientes é global e não herda filtro de evento;
- múltiplos candidatos exigem escolha explícita quando a tela precisar de contexto inequívoco.

Não espalhar seleção manual de evento em cada tela.

## 6. Lotes e ingressos

Arquivos:
- `src/lib/ticket-batches-queries.ts`
- rotas/páginas de eventos e lotes;
- módulos de tickets relacionados.

Banco:
- `ticket_batches`
- `tickets`

Conceitos:
- `ticket_batches.is_courtesy` distingue lotes de cortesia;
- estoque e disponibilidade pertencem ao lote;
- ingressos são criados após pagamento aprovado ou emissão de cortesia;
- check-in controla o estado de utilização.

RPC público relevante: `get_available_batches`. Revisar estado do evento, exposição e retorno mínimo antes de alterar.

## 7. Vendas

Arquivos:
- `src/pages/admin/SalesListPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- rotas `admin.vendas*`

Tabela: `sales`.

Status observados: `pendente`, `pago`, `expirado`, `cancelado`.

Regras:
- cortesia não entra no faturamento pago;
- venda expirada não é pendente;
- pendente reserva estoque;
- confirmação de pagamento deve ser idempotente;
- ingresso só nasce de pagamento aprovado ou fluxo explícito de cortesia.

RPCs centrais:
- `create_pending_sale`
- `confirm_sale_paid`
- `confirm_sale_manual`
- `create_locked_tickets`
- demais mutações de cancelamento/reembolso exigem revisão de autorização.

## 8. Expiração e estoque

Componentes:
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- migrations de pending sale/expiração.

Regra alvo:
- venda pendente possui `expires_at`;
- expiração libera estoque reservado;
- job periódico do banco executa a limpeza.

**Estado na `main` auditada:** restauração de estoque, timer baseado em `expires_at` e correção do cron estão no **PR #13 — NÃO MERGED**. Não tratar como confirmado na `main` até merge e validação.

## 9. Checkout público

Arquivos:
- `src/pages/PublicEventPage.tsx`
- `src/pages/CheckoutPage.tsx`
- rotas `e.$slug*`
- `src/lib/customer-queries.ts`

Fluxo esperado:
`evento público → lote → checkout → create_pending_sale → PIX → Mercado Pago → webhook → confirmação → ingresso`

Campos atuais da UI:
- nome;
- WhatsApp;
- participantes;
- lote/quantidade;
- PIX.

Email e cidade foram removidos da UI atual.

Pendências conhecidas:
- proteção adicional/rate limit da criação do PIX;
- vínculo guest → conta posterior por WhatsApp;
- confirmação visual baseada no status real da venda;
- PDF de todos os ingressos;
- compartilhamento do ingresso.

## 10. Mercado Pago

Arquivos:
- `src/lib/mp/mercado-pago.functions.ts`
- `src/routes/api/public/mp/webhook.ts`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/lib/mp/admin-middleware.ts` — **NÃO MERGED** na `main` auditada.

Responsabilidades:
- salvar/validar/testar credenciais;
- gerar PIX;
- receber webhook de pagamento aprovado.

**Estado da `main`:** autenticação administrativa, validações adicionais do webhook, bloqueio de PIX expirado e idempotência reforçada estão no **PR #12 — NÃO MERGED**.

## 11. Confirmação de pagamento e tickets

RPCs críticas:
- `confirm_sale_paid(sale_id, mp_payment_id)`;
- `create_locked_tickets(sale_id, participants)`.

Desenho de segurança alvo:
- chamadas privilegiadas;
- não executáveis por `anon`/`PUBLIC`;
- webhook é autoridade para pagamento online;
- cliente não pode simular confirmação.

O hardening correspondente está fora da `main` auditada. Distinguir sempre código desejado de código realmente merged/deployado.

## 12. Check-in

Áreas:
- `/checkin` — módulo efetivo;
- `src/routes/admin.checkin.tsx` — alias/redirect;
- `checkin_log`;
- RPC `checkin_ticket`.

Regra:
- somente papéis operacionais autorizados podem confirmar check-in;
- operação deve ser atômica contra check-ins concorrentes;
- operador de check-in não deve ganhar acesso administrativo amplo.

Offline/PWA: existe arquitetura/planejamento via IndexedDB; isolamento/limpeza do cache por usuário ainda requer QA.

## 13. Cortesias

Arquivos:
- `src/pages/admin/CourtesiesListPage.tsx`
- rotas `admin.cortesias*`
- queries de cortesias.

Banco:
- `ticket_batches.is_courtesy`
- `sales.is_courtesy`
- `tickets`

Regras:
- cortesia é R$0;
- não entra em faturamento;
- não é venda paga comum;
- criação em lote respeita estoque/quantidade.

## 14. Clientes e CRM

Arquivos:
- `src/pages/admin/ClientsListPage.tsx`
- `src/routes/admin.clientes.index.tsx`
- `src/routes/admin.clientes.$id.tsx`
- `src/routes/cliente.perfil.tsx`
- `src/lib/customers-queries.ts`
- `src/lib/customer-queries.ts`

Tabela: `customers`.

Modelo:
- cliente pertence à organização;
- usuário autenticado pode ter registro de cliente;
- Admin gerencia clientes da própria organização;
- Clientes é uma área global, não filtrada pelo evento operacional.

Pendência: compras guest anteriores à criação da conta ainda não são automaticamente vinculadas por WhatsApp no fluxo auditado.

## 15. Área do cliente

Layout: `src/components/layouts/MobileLayout.tsx`.

Áreas:
- Início
- Eventos
- Ingressos
- Pontos
- Perfil

Implementado:
- hamburger no topo;
- remoção da saudação “Seja Bem Vindo!”;
- remoção do campo Instagram e indicador de completude;
- preservação de dados antigos de Instagram no banco.

Tema claro/escuro é global e persistido em `localStorage` (`ticketflow-theme`). A cor/accent é decisão administrativa por organização, não preferência individual do cliente.

## 16. Público e privacidade

Superfícies públicas intencionais:
- evento público;
- lotes disponíveis;
- checkout guest;
- consultas mínimas necessárias ao fluxo público.

Não expor publicamente:
- clientes;
- vendas completas;
- ingressos de terceiros;
- credenciais Mercado Pago;
- dados internos de organização.

Toda RPC `SECURITY DEFINER` pública exige revisão individual de retorno, grants, RLS e callers.

## 17. Dashboard e indicadores

Arquivos principais:
- `src/pages/AdminDashboard.tsx`
- `src/lib/dashboard-queries.ts`
- componentes de cards/gráficos.

Cards:
1. Receita
2. Ingressos
3. Pendentes / Check-in conforme contexto operacional
4. Temperatura

Temperatura:
- Fria, Aquecendo, Quente, Explodindo;
- baseada em vendas pagas recentes;
- thresholds configuráveis nas preferências da organização;
- Thermometer/Flame conforme nível;
- azul claro fixo para Fria.

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
- todos os clientes carregados, independente de busca/paginação;
- First Name / Last Name;
- WhatsApp normalizado;
- email normalizado;
- CSV UTF-8 com BOM/CRLF;
- registros sem telefone e email são ignorados.

Não confundir exportação com CRM/remarketing automático.

## 19. Ferramentas

Rota principal: `src/routes/admin.ferramentas.index.tsx`.

Áreas:
- Histórico de Eventos
- Relatórios
- Vitrine
- Simulador de Evento
- Remarketing
- Checklist do Evento
- Links de venda quando a rota correspondente estiver ativa.

Sorteios: removido/não priorizado.

Financeiro, Importação e Relatórios podem existir como áreas preparadas/placeholder; verificar implementação antes de tratá-las como completas.

## 20. Vitrine

Área de banners/vitrine com armazenamento próprio e regras de upload.

Buckets identificados:
- `event-images` — imagens de eventos;
- `organization-logos` — logos;
- `client-banners` — banners da área do cliente/vitrine.

A finalidade e política de cada bucket devem ser confirmadas nas migrations/policies antes de novas alterações.

## 21. Configurações

Arquivos:
- `src/routes/admin.configuracoes.index.tsx`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/pages/admin/SettingsPage.tsx`
- `src/lib/settings-queries.ts`

Preferências operacionais:
- minutos de expiração de venda pendente;
- threshold Aquecendo;
- threshold Quente;
- threshold Explodindo.

Tema:
- claro/escuro é persistido globalmente em `localStorage`;
- a cor/accent é configuração da organização;
- não criar uma “preferência de cor do cliente” sem requisito explícito.

## 22. Design System

Fontes de verdade:
- `docs/DESIGN-SYSTEM.md`;
- `src/lib/design.tsx`;
- `src/styles.css`;
- componentes atuais.

Princípios:
- desktop-first no Admin;
- mobile-first no público/cliente;
- estética minimalista/premium;
- espaçamento baseado em 4px;
- componentes compartilhados preferidos a estilos locais duplicados;
- mensagens de erro devem indicar causa provável e ação.

### Sistema de temas de cor
`src/lib/design.tsx` contém `ACCENT_COLORS` e `FULL_THEME_OVERRIDES`.

Temas de accent atuais incluem Verde, Azul, Roxo e Vermelho, com override de fundo/texto/borda/gráfico conforme a implementação. `icon-brand` também faz parte da linguagem visual atual.

A opção de “cantos retos” foi removida das configurações atuais. Não recriar `corner_style`/seletor de cantos sem requisito explícito e confirmação do código atual.

## 23. Supabase e segurança

Antes de alterar tabela/RPC:
1. localizar migration;
2. localizar função/RPC;
3. localizar grants;
4. localizar RLS/policies;
5. localizar callers frontend/server;
6. verificar auth/role/organização.

Áreas críticas:
- `sales`
- `tickets`
- `customers`
- `events`
- `ticket_batches`
- `organizations`
- `checkout_rate_limits`
- `SECURITY DEFINER`.

Padrão esperado:
`auth.uid() → identidade → user_roles → papel → organização → recurso`.

Não usar apenas um `organization_id` enviado pelo browser como prova de autorização.

## 24. SECURITY DEFINER — mapa de risco

Não usar esta seção como inventário automático de todas as funções. Os nomes abaixo foram conferidos contra o banco da auditoria e representam funções que exigem revisão individual por exposição, grants, callers ou sensibilidade.

### Superfícies públicas / de leitura que exigem revisão
- `get_tickets_by_sale_code`
- `get_available_batches`
- `handle_new_user`
- `has_role`

### Mutação/fluxo administrativo que exige autorização forte
- `create_manual_sale`
- `confirm_sale_paid`
- `create_locked_tickets`
- `checkin_ticket`
- `confirm_sale_manual`
- demais funções de escrita/cancelamento identificadas nas migrations.

Regras para funções administrativas/mutáveis:
- exigir autenticação;
- verificar papel;
- verificar organização;
- limitar grants a `authenticated`/service role conforme necessidade;
- usar `SET search_path` seguro ou referências totalmente qualificadas;
- nunca confiar em valores do browser como prova de autorização.

**Importante:** não revogar getters públicos em bloco. Analise callers e necessidade no fluxo antes de alterar grants.

## 25. Search path / views — pendências de segurança

Warnings identificados para funções com `search_path` mutável:
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

Há ainda alerta do Supabase Auth sobre proteção contra senhas vazadas.

Esses itens devem ser corrigidos individualmente, com análise de compatibilidade e callers, não por alteração cega.

## 26. Documentação vs código atual

Documentação pode descrever versões anteriores.

Exemplos concretos:
- `README.md` contém material de fundação e pode não representar a aplicação atual;
- `docs/AUDITORIA-STATUS.md` é histórico e pode estar defasado;
- `docs/TPS.md` é oficial para intenção, mas pode divergir da implementação atual;
- TPS/Design System/Auditoria ainda podem mencionar `organizations.corner_style`, apesar de a opção de cantos retos ter sido removida;
- `AUDITORIA-STATUS.md` pode registrar o botão da Vitrine em posição abaixo do banner, enquanto a UI atual usa a pílula flutuante;
- TPS descreve `/checkin` como módulo isolado; `admin.checkin.tsx` é apenas redirect para `/checkin`.

**Regra:** quando documentação e código divergem, confirmar código/migration atual e marcar a documentação como stale em vez de inventar nova regra.

## 27. Git / branches / mudanças recentes

Repositório oficial: `djdiegocosta/ticketflow-core`.

PRs relevantes:
- PR #7 — botão PDF em Vendas — ABERTO; NÃO MERGED;
- PR #9 — exportação Meta Ads — MERGED;
- PR #10 — dashboard/temperatura/preferências — MERGED;
- PR #12 — hardening Mercado Pago/segurança — ABERTO; NÃO MERGED;
- PR #13 — expiração/estoque/checkout expiration — ABERTO; NÃO MERGED;
- PR #14 — este `PROJECT-MAP.md` — ABERTO; NÃO MERGED.

Não assumir que alteração de PR aberto está na `main`.

## 28. Pendências técnicas prioritárias conhecidas

### P0/P1 — segurança e integridade
- concluir hardening das mutations administrativas;
- revisar getters públicos por exposição/rate limit;
- corrigir `SECURITY DEFINER`/search_path;
- revisar `event_ticket_stats`;
- confirmar RLS por tabela;
- habilitar/verificar proteção contra senhas vazadas no Supabase Auth;
- eliminar códigos de ingresso previsíveis;
- limitar abuso da criação de PIX.

### P1 — fluxo de negócio
- confirmação pós-compra baseada no status real;
- vínculo guest → conta por WhatsApp;
- PDF de ingressos;
- compartilhamento de ingresso;
- isolamento/limpeza do IndexedDB offline;
- E2E compra → PIX → webhook → ingresso;
- E2E expiração → devolução de estoque.

### P2 — qualidade/UX
- `PublicEventPage`: revisar `useMemo` usado para `setState`, preferindo `useEffect`;
- debounce na busca de cliente por WhatsApp;
- feedback imediato ao clicar Gerar PIX;
- refinamentos de QR/código e hit areas.

### Release blockers
- build/Vercel precisa ser validado antes do merge de branches de hardening;
- fluxo real Mercado Pago precisa ser testado ponta a ponta.

## 29. Fluxos dourados

### Compra pública
`/e/:slug` → lotes → checkout → `create_pending_sale` → `createMpPix` → Mercado Pago → webhook → `confirm_sale_paid` → `create_locked_tickets` → confirmação → ingresso → check-in.

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
src/lib/customers-queries.ts
src/pages/CheckoutPage.tsx
src/pages/PublicEventPage.tsx
src/pages/AdminDashboard.tsx
src/pages/admin/SalesListPage.tsx
src/pages/admin/CourtesiesListPage.tsx
src/pages/admin/ClientsListPage.tsx
src/pages/admin/SettingsPage.tsx
src/components/layouts/AdminLayout.tsx
src/components/layouts/MobileLayout.tsx
src/lib/design.tsx
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
> Dados: `UI → query → RPC/function → table → RLS`.
>
> Pagamento: `sale → expiration → PIX → Mercado Pago → webhook → confirmation → tickets`.
>
> Autorização: `auth.uid → role → organization → resource`.
>
> Evento: use o mecanismo de **evento operacional**, evitando filtros manuais duplicados.
>
> Documentação vs código: confirme o código/migration atual e marque documentação stale quando houver conflito.
>
> Multiagente: antes de editar, confira branch/PR/commit; não trate trabalho de outro agente como descartável e não escreva sobre alterações não verificadas.
