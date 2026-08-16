# Migração dos dados mock para o Supabase

Objetivo: remover todo array estático / dado fixo do app e passar a ler e gravar tudo no Supabase, com login real e respeito às políticas de acesso (RLS) já existentes.

Decisões confirmadas: login real via Supabase Auth, banco começa vazio (telas mostram estado vazio), execução em etapas, e criação de tabelas também para os módulos que hoje não têm banco.

---

## Relatório: onde estão os dados fictícios hoje

| Arquivo/tela | O que é mock hoje | Vai passar a usar |
|---|---|---|
| `src/lib/auth-context.tsx` | 4 logins fixos (admin/colaborador/checkin/cliente) em localStorage | Supabase Auth + `user_roles` |
| `src/lib/sales-data.ts` | vendas, ingressos e eventos inventados | `sales`, `tickets`, `events`, `ticket_batches` |
| `src/lib/clients-data.ts` | clientes e ranking | `customers`, `sales` |
| `src/lib/courtesies-data.ts` | cortesias | `sales` (is_courtesy) + `tickets` |
| `src/lib/users-data.ts` | equipe/usuários | `user_roles` + `profiles` |
| `src/lib/remarketing-data.ts` | abandonos e Pix não pagos | `checkout_abandonments`, `sales` pendentes |
| `src/lib/settings-data.ts` | dados da organização e Mercado Pago | `organizations`, `mp_config` |
| `src/lib/checkin-data.ts` | 100 ingressos falsos + histórico falso | `tickets` + função `checkin_ticket` |
| `src/lib/public-data.tsx` | vendas públicas no localStorage | `get_sale_by_code`, `get_tickets_by_sale_code` |
| `src/pages/AdminDashboard.tsx` | métricas e gráficos com números fixos | agregações reais de `sales`/`tickets` |
| `src/pages/admin/EventsListPage / CreateEvent / EditEvent` | eventos e lotes locais | `events` + `ticket_batches` (CRUD real) |
| `src/pages/admin/SalesListPage / SaleDetailPage` | listagem/detalhe fixos | `sales` + `tickets` |
| `src/pages/admin/ClientsListPage / ClientDetailPage` | clientes fixos | `customers` |
| `src/pages/admin/CourtesiesListPage` | emissão fake | `create_courtesy` |
| `src/pages/admin/UsersListPage` | convites fake | convite real de usuário + papel |
| `src/pages/admin/SettingsPage / MercadoPagoWizardPage` | formulários sem persistência | `organizations`, `mp_config` |
| `src/pages/admin/SimuladorPage` | simulações locais | nova tabela `simulations` |
| `src/pages/admin/ChecklistPage` | tarefas locais | nova tabela `event_checklist_items` |
| `src/routes/admin.sorteios.tsx` | sorteios locais | nova tabela `raffles` (+ resultado) |
| `src/pages/CheckoutPage / ConfirmationPage / PublicEventPage` | compra simulada | `create_pending_sale` + leitura pública do evento |
| `src/pages/MyTicketsPage`, `src/routes/cliente.*` | ingressos/pontos/perfil fixos | `tickets`, `points_ledger`, `profiles`/`customers` |
| `src/lib/design.tsx`, `src/lib/theme.tsx` | preferências visuais locais | permanecem locais (preferência de aparência) |

O que **não** muda: IndexedDB continua sendo usado, mas passa a guardar cópia dos dados reais (check-in e Meus Ingressos offline), não mocks.

---

## Plano em 6 etapas

### Etapa 1 — Autenticação real e base de acesso
- Substituir o login fictício por Supabase Auth (e-mail/senha + Google já configurado), cadastro, recuperar e redefinir senha reais.
- Papel do usuário vindo de `user_roles` (admin / colaborador / operador_checkin) e cliente quando não houver papel.
- Rotas protegidas passam a usar a proteção padrão de sessão; splash de boas-vindas mantido.
- Fluxo de primeiro acesso: criar organização e vincular o primeiro usuário como admin.
- Nesta etapa também corrijo um erro de renderização já existente na listagem de eventos (imagem do card).

### Etapa 2 — Eventos e lotes
- Listagem, criação (wizard 4 passos), edição, publicação, encerramento e "virada expressa" gravando em `events` e `ticket_batches`.
- Estado vazio real quando não houver eventos.

### Etapa 3 — Vendas, ingressos e cortesias
- Listagem/detalhe de vendas reais, venda manual via `create_manual_sale`, cortesias via `create_courtesy`.
- PDF e CSV gerados a partir dos dados reais.
- Dashboard do admin com métricas calculadas do banco.

### Etapa 4 — Clientes, remarketing e configurações
- `customers` (listagem, ficha, criação), ranking e métricas de CRM reais.
- Remarketing lendo `checkout_abandonments` e vendas pendentes, com atualização de status.
- Configurações da organização e wizard do Mercado Pago persistindo em `organizations` e `mp_config`.
- Usuários: convite real e gestão de papéis.

### Etapa 5 — Área pública e área do cliente
- Página pública do evento, checkout, Pix e confirmação usando as funções do banco.
- Área do cliente: ingressos, pontos e perfil reais; vínculo de compras antigas pelo WhatsApp.

### Etapa 6 — Check-in real + módulos sem tabela
- Check-in validando pela função `checkin_ticket`, histórico real, e sincronização da fila offline quando a conexão volta.
- Novas tabelas para Simulador, Checklist e Sorteios, com as telas passando a salvar no banco.

---

## Detalhes técnicos

- Leituras e escritas passam por funções de servidor do TanStack (`createServerFn`) com o middleware de autenticação do Supabase, ou pelo client do navegador quando a página é pública — nunca com chave de serviço no frontend.
- Rotas do admin/cliente migram para a área protegida (`_authenticated`) para o gate de sessão gerenciado; rotas públicas (`/e/:slug`, `/ingresso/:code`) continuam abertas e indexáveis.
- Estado de dados com TanStack Query (`ensureQueryData` no loader + `useSuspenseQuery`), com `errorComponent` e `notFoundComponent` em cada rota com loader.
- Novas migrations: `simulations`, `event_checklist_items`, `raffles` (+ `raffle_entries`), todas com GRANTs e RLS por organização.
- Faltam políticas de escrita em `sales`, `tickets`, `customers` e `checkout_abandonments` (hoje só leitura); as gravações usarão as funções `security definer` já existentes, e adiciono as políticas/funções que faltarem (ex.: cancelar venda, editar cliente).
- Os arquivos `src/lib/*-data.ts` deixam de conter arrays e passam a exportar apenas tipos e funções de consulta; nenhum componente mantém dado fixo.
- Cada etapa termina com verificação de build/typecheck e conferência da tela no preview.
