# CLAUDE.md — Índice de Rotas do TicketFlow

Mapa de todas as rotas do sistema (`src/routes/`, roteamento por arquivo do
TanStack Start). Cada linha nome-de-arquivo → rota. Consulte antes de criar
uma rota nova, pra não duplicar o que já existe.

Papéis de usuário: `admin`, `colaborador`, `operador_checkin`, `cliente`.
Guarda de acesso principal em `admin.route.tsx` (módulo Admin) e
`cliente.tsx` (módulo Clientes); cada um redireciona papéis que não
pertencem ali para sua área correta.

## Regra obrigatória: registrar mudanças

Sempre que corrigir um bug, adicionar funcionalidade, mudar o banco de dados
ou tomar uma decisão de produto/arquitetura relevante, registre em:

- **`docs/CHANGELOG.md`** — uma entrada curta (data, categoria, 1 linha,
  hash do commit), sempre adicionada no topo. É o log do que mudou.
- **`docs/AUDITORIA-STATUS.md`** — quando o item resolve ou cria uma
  pendência relevante (bug conhecido corrigido, risco identificado, algo
  ainda incompleto). É o retrato de "o que falta hoje", não um histórico.

Os dois documentos ficaram parados por meses no passado porque mudanças
reais aconteciam sem ninguém atualizar o registro — isso já causou
retrabalho real neste projeto. Não repita.

---

## Módulo Admin (`/admin/*`)

Acesso: `admin` e `colaborador`. Layout: `src/components/layouts/AdminLayout.tsx`.

| Rota | Arquivo | Descrição |
|---|---|---|
| `/admin` | `admin.index.tsx` | Dashboard — KPIs, temperatura do evento |
| `/admin/eventos` | `admin.eventos.index.tsx` | Lista de eventos |
| `/admin/eventos/novo` | `admin.eventos.novo.tsx` | Criar evento |
| `/admin/eventos/:id` | `admin.eventos.$id.tsx` | Editar evento / encerrar evento |
| `/admin/vendas` | `admin.vendas.index.tsx` | Lista de vendas |
| `/admin/vendas/:id` | `admin.vendas.$id.tsx` | Detalhe de uma venda |
| `/admin/clientes` | `admin.clientes.index.tsx` | Grid de clientes (CRM) |
| `/admin/clientes/:id` | `admin.clientes.$id.tsx` | Perfil do cliente |
| `/admin/cortesias` | `admin.cortesias.tsx` | Emissão e lista de cortesias |
| `/admin/checklist` | `admin.checklist.tsx` | Checklist operacional do evento |
| `/admin/relatorios` | `admin.relatorios.tsx` | Relatórios e análises |
| `/admin/remarketing` | `admin.remarketing.tsx` | Recuperação de checkout abandonado |
| `/admin/simulador` | `admin.simulador.tsx` | Simulador de cenário financeiro |
| `/admin/usuarios` | `admin.usuarios.tsx` | Gestão de usuários da organização |
| `/admin/configuracoes` | `admin.configuracoes.index.tsx` | Configurações gerais |
| `/admin/configuracoes/mercado-pago` | `admin.configuracoes.mercado-pago.tsx` | Integração de pagamento |
| `/admin/ferramentas` | `admin.ferramentas.index.tsx` | Hub de ferramentas (cards) |
| `/admin/ferramentas/vitrine` | `admin.ferramentas.vitrine.tsx` | Banners da área do cliente |
| `/admin/ferramentas/links-de-venda` | `admin.ferramentas.links-de-venda.tsx` | Links de venda personalizados |
| `/admin/ferramentas/historico-eventos` | `admin.ferramentas.historico-eventos.index.tsx` | Histórico de Eventos — lista |
| `/admin/ferramentas/historico-eventos/:id` | `admin.ferramentas.historico-eventos.$id.tsx` | Histórico de Eventos — resultado do evento |
| `/admin/checkin` | `admin.checkin.tsx` | Redirect de compatibilidade → `/checkin` |
| `/admin/historico` | `admin.historico.tsx` | Histórico de check-in (mesma página de `/checkin/historico`, acesso alternativo) |

---

## Módulo Clientes (`/cliente/*`)

Acesso: `cliente` (comprador final, área logada). Layout: `cliente.tsx`.

| Rota | Arquivo | Descrição |
|---|---|---|
| `/cliente` | `cliente.index.tsx` | Início da área do cliente |
| `/cliente/eventos` | `cliente.eventos.tsx` | Eventos disponíveis pra esse cliente |
| `/cliente/ingressos` | `cliente.ingressos.tsx` | Ingressos comprados |
| `/cliente/perfil` | `cliente.perfil.tsx` | Dados cadastrais do cliente |
| `/cliente/pontos` | `cliente.pontos.tsx` | Extrato de XP / pontos |

---

## Operação — Check-in (`/checkin/*`)

Acesso: `operador_checkin`, `admin`, `colaborador`. Fora dos módulos acima —
link dado à equipe de portaria no dia do evento, sem precisar do login admin completo.

| Rota | Arquivo | Descrição |
|---|---|---|
| `/checkin` | `checkin.index.tsx` | Leitor de QR Code / check-in do ingresso |
| `/checkin/historico` | `checkin.historico.tsx` | Histórico de check-ins realizados |

---

## Público (site de vendas, sem login)

| Rota | Arquivo | Descrição |
|---|---|---|
| `/` | `index.tsx` | Home / landing |
| `/e/:slug` | `e.$slug.index.tsx` | Página pública do evento |
| `/e/:slug/checkout` | `e.$slug.checkout.tsx` | Checkout de compra |
| `/e/:slug/confirmacao/:sale_code` | `e.$slug.confirmacao.$sale_code.tsx` | Confirmação da compra |
| `/ingresso/:ticket_code` | `ingresso.$ticket_code.tsx` | Ingresso individual (QR Code) |
| `/meus-ingressos` | `meus-ingressos.tsx` | Consulta de ingressos sem login (por WhatsApp/e-mail) |
| `/privacidade` | `privacidade.tsx` | Política de privacidade |
| `/termos` | `termos.tsx` | Termos de uso |

---

## Autenticação e conta

| Rota | Arquivo | Descrição |
|---|---|---|
| `/login` | `login.tsx` | Login (admin, colaborador, operador, cliente) |
| `/cadastro` | `cadastro.tsx` | Cadastro de novo cliente |
| `/recuperar-senha` | `recuperar-senha.tsx` | Solicitar recuperação de senha |
| `/redefinir-senha` | `redefinir-senha.tsx` | Definir nova senha |

---

## API (server routes)

| Rota | Arquivo | Descrição |
|---|---|---|
| `/api/public/mp/webhook` | `api/public/mp/webhook.ts` | Webhook do Mercado Pago |
| `/api/public/tickets/pdf` | `api/public/tickets/pdf.ts` | Geração do PDF do ingresso |

---

## Notas

- **Vitrine → botão "Criar Banner" (resolvido, 24/09)**: não salvava por causa de uma
  permissão restritiva demais no banco (`client_banners`). Corrigido na migration
  `fix_client_banners_admin_permissions`. Se o problema reaparecer, comece por aí.
- `admin.historico.tsx` e `checkin.historico.tsx` renderizam a mesma
  página (`CheckinHistoryPage`) por dois caminhos diferentes — histórico,
  não duplicar ao criar algo novo aqui.
- Ferramentas dentro de `/admin/ferramentas` são cards no hub — uma
  ferramenta nova de admin normalmente entra ali, não como rota solta em
  `/admin/*`, a menos que já exista um padrão diferente (ver `docs/PROJECT-MAP.md`).
- Rotas com `$` no nome do arquivo são parâmetros dinâmicos (`$id`, `$slug`,
  `$ticket_code`, `$sale_code`); `.index.tsx` é a rota "raiz" da pasta.
- Para o que cada ferramenta faz por dentro (regras de negócio, dados,
  o que é real vs. o que ainda é mock), ver os documentos em `/docs`,
  especialmente `docs/PROJECT-MAP.md` e `docs/HISTORICO-DE-EVENTOS.md`.
