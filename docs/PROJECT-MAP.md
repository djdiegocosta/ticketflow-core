# TicketFlow — Project Map

> **Purpose:** índice operacional de alta densidade para LLMs/agentes de código. Use este arquivo antes de investigar ou alterar o projeto.
>
> **Audit basis:** repositório `djdiegocosta/ticketflow-core`, branch `main`, auditoria realizada em 04/09/2026. O mapa privilegia o código/migrations atuais sobre documentação histórica. Alterações existentes apenas em branches/PRs abertos são marcadas como **NÃO MERGED**.

## 0. Regra de uso por LLM

1. Leia este arquivo antes de modificar código.
2. Localize a área pelo índice abaixo.
3. Leia os arquivos indicados antes de criar nova lógica.
4. Para fluxo completo, siga **UI → query/mutation → RPC/Edge Function → tabela → RLS**.
5. Não duplique regras já centralizadas em hooks, queries ou funções SQL.
6. Não alterar arquitetura por conveniência.
7. Diferencie sempre: `IMPLEMENTADO`, `PARCIAL`, `PENDENTE`, `LEGADO`, `NÃO CONFIRMADO`.
8. **Source of truth:** código e banco/migrations > documentação histórica > planos do Lovable > inferência.
9. Não editar `src/routes/routeTree.gen.ts` manualmente.
10. Antes de mudar banco, procure a função/RPC, callers, migration e políticas RLS relacionadas.

## 1. Stack e estrutura

| Área | Local | Estado |
|---|---|---|
| App | `src/` | IMPLEMENTADO |
| Rotas | `src/routes/` | IMPLEMENTADO — TanStack file-based routing |
| Páginas/feature UI | `src/pages/` | IMPLEMENTADO |
| Queries/ações | `src/lib/*-queries.ts` | IMPLEMENTADO |
| Supabase | `src/integrations/supabase/`, `src/lib/` | IMPLEMENTADO |
| SQL | `supabase/migrations/` | IMPLEMENTADO |
| Design | `src/styles.css`, `docs/DESIGN-SYSTEM.md` | IMPLEMENTADO |
| Produto | `docs/TPS.md` | OFICIAL |
| Auditoria histórica | `docs/AUDITORIA-STATUS.md` | HISTÓRICO; pode estar desatualizado |
| Planos Lovable | `.lovable/plan/` | HISTÓRICO/REFERÊNCIA |

Stack confirmada em `package.json`: React 19, TypeScript, Vite, TanStack Start/Router/Query, Supabase JS, Tailwind CSS, shadcn/Radix, Lucide, Recharts, html5-qrcode, QRCode React, jsPDF, React Hook Form e Zod.

## 2. Arquitetura de navegação

TanStack Start usa roteamento baseado em arquivos. O shell global está em `src/routes/__root.tsx`. Convenções estão em `src/routes/README.md`.

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
- `/cliente/ingressos/:ticket_code` (detalhe)
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
- `/admin/checkin`
- `/admin/ferramentas`
- `/admin/configuracoes`
- `/admin/configuracoes/mercado-pago`

> A lista acima é um índice operacional; para rotas adicionais/novas, conferir diretamente `src/routes/`.

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

Entidades/áreas auxiliares incluem banners/vitrine, pontos, financeiro/importação e outras tabelas presentes nas migrations.

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
Regra arquitetural:
- quando existe um único evento operacional, áreas de vendas, ingressos, cortesias, check-in e indicadores devem resolvê-lo automaticamente;
- sem evento operacional, usar histórico/consolidado quando a área permitir;
- Clientes é global e não deve ser filtrado pelo evento;
- múltiplos candidatos operacionais exigem tratamento explícito.

Implementação central: `src/lib/events-queries.ts` (`getOperationalEvent` / `useOperationalEvent`).

> **ATENÇÃO:** conferir a implementação atual antes de alterar critérios de “operacional”. Não espalhar seleção manual de evento em cada tela.

## 6. Lotes e ingressos

Arquivos:
- `src/lib/ticket-batches-queries.ts`
- páginas de eventos/gestão de lotes
- `src/lib/tickets-queries.ts` (quando aplicável)

Banco:
- `ticket_batches`
- `tickets`

Conceitos:
- lotes pagos e lotes de cortesia são distintos por `ticket_batches.is_courtesy`;
- lotes possuem estoque e regras de disponibilidade/virada;
- ingressos são criados após confirmação de pagamento ou emissão de cortesia;
- check-in altera o estado do ingresso de forma controlada.

RPC relevante: `get_available_batches` — exposição pública de lotes disponíveis; tratar como superfície pública e revisar autorização/estado do evento antes de mudar.

## 7. Vendas

Arquivos:
- `src/pages/admin/SalesListPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- rotas `admin.vendas*`

Tabela principal: `sales`.

Status relevantes observados no sistema: `pendente`, `pago`, `expirado`, `cancelado`.

Regras:
- cortesia é identificada por lote/venda, não deve entrar no faturamento pago;
- vendas expiradas não devem ser tratadas como pendentes;
- venda pendente reserva estoque;
- confirmação de pagamento deve ser idempotente;
- criação de ingresso depende de pagamento aprovado ou fluxo explícito de cortesia.

RPCs centrais:
- `create_pending_sale`
- `confirm_sale_paid`
- `confirm_sale_manual`
- `create_locked_tickets`
- `cancel_sale` / `refund_sale` — revisar autorização antes de alterar.

## 8. Expiração e estoque

Componentes:
- `src/pages/CheckoutPage.tsx`
- `src/lib/sales-queries.ts`
- migrations de expiração/pending sale.

Regra:
- venda pendente possui `expires_at`;
- expiração deve liberar a reserva de estoque;
- job periódico do banco executa a limpeza.

**Estado auditado:** existe cron `expire-pending-sales` no Supabase. A implementação de restauração de estoque e o uso de `expires_at` foram desenvolvidos em branch/PR de hardening e precisam ser considerados **NÃO MERGED** até confirmação do merge correspondente.

## 9. Checkout público

Arquivos:
- `src/pages/PublicEventPage.tsx`
- `src/pages/CheckoutPage.tsx`
- rotas `e.$slug*`

Fluxo:

`evento público → lote disponível → Checkout → create_pending_sale → PIX → Mercado Pago → webhook → confirmação → ingresso`

Campos atualmente priorizados no checkout:
- nome;
- WhatsApp;
- participantes;
- lote/quantidade;
- pagamento PIX.

**Mudanças recentes:** email e cidade foram removidos do checkout. Se documentação histórica disser o contrário, o código atual prevalece.

**Pendências conhecidas:**
- proteção adicional/rate limiting do endpoint de criação do PIX;
- vínculo retroativo de compra guest com conta criada posteriormente;
- validação final da página de confirmação pelo status real da venda;
- PDF de “baixar todos os ingressos” ainda pendente;
- botão de compartilhamento do ingresso ainda pendente.

## 10. Mercado Pago

Arquivos:
- `src/lib/mp/mercado-pago.functions.ts`
- `src/routes/api/public/mp/webhook.ts`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/lib/mp/admin-middleware.ts` **(NÃO MERGED se estiver somente no PR de hardening)**

Funções:
- administração de credenciais;
- validação/teste de credenciais/webhook;
- criação de PIX;
- webhook de pagamento aprovado.

Segurança esperada:
- operações administrativas exigem sessão + papel admin + organização correta;
- criação pública de PIX só pode operar sobre venda válida da própria organização/evento;
- webhook valida assinatura, organização, venda e valor antes de confirmar;
- confirmação e geração de ingressos são idempotentes e privilegiadas.

**ATENÇÃO:** o endurecimento do Mercado Pago está em PR aberto e não deve ser considerado parte confirmada de `main` até merge/build.

## 11. Confirmação de pagamento e tickets

RPCs críticas:
- `confirm_sale_paid(sale_id, mp_payment_id)` — transição pendente → pago.
- `create_locked_tickets(sale_id, participants)` — geração de ingressos.

Ambas são superfícies de alto risco. Nunca conceder execução a `anon`/`PUBLIC`.

O webhook é a autoridade para pagamento online. O cliente não deve conseguir “simular” confirmação.

## 12. Check-in

Áreas:
- `src/routes/admin.checkin.tsx`
- componentes/páginas de check-in
- `checkin_log`
- RPC `checkin_ticket`

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
- fluxo de criação de cortesia
- `src/lib/*courtesy*`
- rotas `admin.cortesias*`

Banco:
- `ticket_batches.is_courtesy`
- `sales.is_courtesy`
- `tickets`

Regras:
- cortesia é R$0;
- não entra em faturamento;
- não é elegível a reembolso;
- emissão pode ser vinculada a cliente;
- criação em lote respeita estoque/quantidade.

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
- Admin pode gerenciar clientes da própria organização;
- área de Clientes é global, não deve herdar filtro do evento operacional.

Pendência importante:
- compras guest anteriores à criação da conta ainda não são automaticamente vinculadas por WhatsApp.

## 15. Área do cliente

Layout: `src/components/layouts/MobileLayout.tsx`.

Áreas:
- Início
- Eventos
- Ingressos
- Pontos
- Perfil

Implementado recentemente:
- menu hamburger no topo;
- remoção da saudação “Seja Bem Vindo!”;
- remoção do campo Instagram e do indicador de completude;
- preservação de dados antigos de Instagram no banco.

Documentação histórica que ainda menciona esses elementos deve ser considerada **STALE**.

## 16. Público / privacidade

Superfícies públicas intencionais:
- evento publicado;
- lotes disponíveis;
- checkout guest;
- criação/consulta necessária ao fluxo público.

Dados que **não devem** ficar expostos publicamente:
- clientes;
- vendas completas;
- ingressos de terceiros;
- credenciais Mercado Pago;
- dados internos de organização.

Qualquer RPC `SECURITY DEFINER` público exige revisão individual.

## 17. Dashboard e indicadores

Arquivos:
- `src/pages/admin/DashboardPage.tsx` (ou página correspondente)
- `src/lib/dashboard-queries.ts`
- componentes de gráficos/cards.

Cards principais definidos:
1. Receita
2. Ingressos
3. Pendentes / Check-in conforme contexto operacional
4. Temperatura

Temperatura:
- níveis: Fria, Aquecendo, Quente, Explodindo;
- baseada em vendas pagas recentes;
- thresholds configuráveis em preferências da organização;
- ícone Thermometer/Flame conforme nível;
- temperatura fria usa azul claro fixo, não configuração de Design.

Gráficos:
- vendas diárias últimos 14 dias;
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
- nome separado em First/Last Name;
- WhatsApp normalizado para formato compatível;
- email normalizado;
- CSV UTF-8 com BOM/CRLF;
- clientes sem telefone e email são ignorados;
- finalidade: Customer List/Meta Ads.

Não confundir exportação com CRM/remarketing automático; são camadas diferentes.

## 19. Ferramentas

`src/routes/admin.ferramentas.index.tsx`.

Áreas presentes/planejadas:
- Histórico de Eventos
- Relatórios
- Vitrine
- Simulador de Evento
- Remarketing
- Checklist do Evento

Sorteios: decisão atual é remover/ não priorizar.

Financeiro, Importação e Relatórios podem existir como áreas preparadas/placeholder; não assumir que estão funcionalmente completas.

## 20. Vitrine

Banco e UI de banners.

Regra crítica:
- somente um banner ativo por vez;
- garantia idealmente no banco/trigger, não apenas no cliente.

Upload:
- bucket `event-images` para imagens de eventos;
- bucket `organization-logos` para logos;
- Vitrine possui regras próprias de armazenamento.

## 21. Configurações

Arquivos:
- `src/routes/admin.configuracoes.index.tsx`
- `src/routes/admin.configuracoes.mercado-pago.tsx`
- `src/pages/admin/SettingsPage.tsx`
- `src/lib/settings-queries.ts`

Preferências operacionais incluem:
- minutos de expiração de venda pendente;
- threshold Aquecendo;
- threshold Quente;
- threshold Explodindo.

Tema do cliente ainda é local ao navegador; não tratar como preferência persistida sem implementação específica.

## 22. Design System

Fonte de verdade:
- `docs/DESIGN-SYSTEM.md`
- estilos/componentes atuais.

Princípios relevantes:
- desktop-first no Admin;
- mobile-first no público/cliente;
- estética minimalista/premium;
- escala de espaçamento baseada em 4px;
- componentes compartilhados devem ser preferidos a estilos locais duplicados;
- mensagens de erro devem explicar causa provável/ação, nunca apenas “Algo deu errado”.

## 23. Supabase / segurança

Antes de alterar uma tabela ou RPC:
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

### Padrão de autorização

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

Não revogar esses getters em bloco sem analisar seus callers e necessidade no fluxo público.

## 25. Search path / views — pendências de segurança

O projeto já apresentou warnings para funções com `search_path` mutável, incluindo:
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

## 26. Histórico de documentação vs código atual

Documentos podem descrever versões anteriores. Exemplos já identificados:
- `README.md` ainda contém instruções de fundação/placeholder que não representam o sistema atual;
- `docs/AUDITORIA-STATUS.md` tem última atualização anterior a várias mudanças;
- `docs/TPS.md` contém regras históricas que foram superadas por decisões recentes de implementação, como campos removidos do checkout e mudanças de UX.

**Regra:** documentação histórica é evidência de intenção/histórico, não substitui o código atual quando houver conflito.

## 27. Git / branches / mudanças recentes

Repositório oficial: `djdiegocosta/ticketflow-core`.

Branches/PRs de hardening existentes no histórico recente:
- PR #9 — exportação Meta Ads — MERGED.
- PR #10 — dashboard/temperatura/preferências — MERGED.
- PR #12 — hardening Mercado Pago/segurança — ABERTO; NÃO MERGED.
- PR #13 — expiração/estoque/checkout expiration — ABERTO; NÃO MERGED.

Não assumir que uma alteração vista em PR aberto já está em `main`.

## 28. Pendências técnicas prioritárias conhecidas

### P0/P1 — segurança e integridade
- concluir hardening de mutations administrativas restantes;
- revisar getters públicos por exposição/rate limit;
- corrigir `SECURITY DEFINER`/search_path;
- revisar `event_ticket_stats`;
- confirmar RLS por tabela;
- validar configuração de proteção contra senhas vazadas no Supabase Auth;
- eliminar códigos de ingresso previsíveis;
- limitar abuso de criação de PIX.

### P1 — fluxo de negócio
- confirmar página pós-compra pelo status real;
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
`Cliente/Admin` → lote de cortesia → emissão → `sales` marcada como cortesia → `tickets` → área do cliente/check-in.

### Check-in
`ticket_code/QR` → validação → `checkin_ticket` → `checkin_log` → ingresso utilizado.

### Admin
`auth` → `user_roles` → organização → evento operacional → vendas/ingressos/cortesias/check-in/indicadores.

## 30. Arquivos de alta prioridade para investigação

```text
src/routes/__root.tsx
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
