# TicketFlow — TPS (Technical Product Specification)
**Versão:** 2.0 — Julho/2026
**Status:** Documento oficial. Toda implementação no Lovable deve respeitar este documento.
**Idioma:** Português (pt-BR)

---

## 1. Visão geral

O TicketFlow é uma plataforma SaaS de gestão de eventos e venda de ingressos. Cada produtor opera sua própria estrutura — eventos, clientes, financeiro — de forma isolada. Não é uma ticketeira centralizada.

**Pergunta que filtra toda decisão de produto:**
> "Isso torna a vida do produtor mais simples, rápida e eficiente?"

---

## 2. Experiência por dispositivo

| Ambiente | Dispositivo prioritário |
|---|---|
| Painel do produtor (admin) | Desktop |
| Área do cliente (comprador) | Mobile |
| Página pública do evento | Mobile |
| Super Admin | Desktop |

---

## 3. Ambientes e rotas

| Ambiente | Rota base | Acesso |
|---|---|---|
| Página pública do evento | `/e/:slug` | Qualquer pessoa, sem login |
| Checkout | `/e/:slug/checkout` | Qualquer pessoa |
| Confirmação de compra | `/e/:slug/confirmacao/:sale_code` | Qualquer pessoa |
| Meus ingressos | `/meus-ingressos` | Qualquer pessoa (busca por código) |
| Ingresso individual | `/ingresso/:ticket_code` | Qualquer pessoa |
| Área do cliente | `/cliente` | Comprador com conta completa |
| Painel do produtor | `/admin` | Usuário com papel `admin` |
| Super Admin | `/superadmin` | Dono da plataforma |
| Login | `/login` | Público |
| Cadastro | `/cadastro` | Público |
| Recuperar senha | `/recuperar-senha` | Público |

---

## 4. Perfis de usuário

### 4.1 Visitante
- Acessa eventos públicos e compra ingressos sem criar conta.
- O sistema cria automaticamente um **cadastro simplificado** pelo WhatsApp.

### 4.2 Cliente (conta completa)
- Login com e-mail + senha.
- Acessa `/cliente` com histórico de compras e perfil completo.
- Compras anteriores como visitante (mesmo WhatsApp) são vinculadas automaticamente.
- Participa do sistema de gamificação (pontos).

### 4.3 Admin (produtor)
- Acessa `/admin`.
- Gerencia todos os módulos da organização.
- Pertence a uma única organização (tenant).

### 4.4 Operador
- Acesso restrito: check-in e visualização de vendas.
- Sem acesso a configurações, financeiro ou clientes.

### 4.5 Super Admin
- Acessa `/superadmin`.
- Gerencia organizações, planos e saúde da plataforma.
- Exclusivo do dono do TicketFlow.

---

## 5. Regras globais de qualidade de dado

Aplicadas em todo campo de entrada do sistema.

### Nome completo
- Capitalização automática (title case), exceto conectivos: de, da, do, dos, das, e.
- Mínimo 2 palavras (obrigatório).
- Se 2 palavras e a segunda for nome próprio composto comum: aviso não-bloqueante — não trava a compra.

### WhatsApp
- Máscara automática no frontend: `(00) 00000-0000`.
- Normalização antes de salvar: remove caracteres, adiciona `55` se ausente.
- Armazenamento: `5511999999999` (sempre 13 dígitos).
- Exibição: sempre formatado como `(00) 00000-0000`.
- Números antigos sem o dígito 9: tratados manualmente, sem inferência.

---

## 6. Área pública

### 6.1 Página do evento (`/e/:slug`)
**Mobile first. Objetivo: converter visitante em comprador.**

Conteúdo:
- Imagem de capa (full-width).
- Nome, data, horário, local.
- Descrição.
- Lotes disponíveis: nome, preço, quantidade restante (se configurado).
- Seletor de quantidade (1–10).
- Botão "Comprar agora".

Regras:
- Lote só aparece se estiver no período de validade e com estoque.
- Todos esgotados/expirados: exibir mensagem de encerramento.
- Não exige login.

---

### 6.2 Checkout (`/e/:slug/checkout`)
**Mínimo de campos. Máximo de conversão.**

Campos obrigatórios:
- Nome completo.
- WhatsApp.

Campo opcional:
- E-mail (usado para confirmação e vínculo futuro com conta completa).

Fluxo:
1. Preenche nome e WhatsApp.
2. Sistema cria/reutiliza cadastro simplificado pelo WhatsApp.
3. Gera venda com status `pendente`.
4. Gera Pix (QR Code + copia-e-cola).
5. Usuário paga (expira em 30 min).
6. Webhook confirma pagamento automaticamente.
7. Ingressos liberados imediatamente.
8. Redireciona para confirmação.

Regras:
- Não exige conta.
- Pix expira em 30 min → venda cancelada automaticamente.
- Após expiração: usuário reinicia o fluxo.

---

### 6.3 Confirmação (`/e/:slug/confirmacao/:sale_code`)
- Mensagem de sucesso.
- Resumo: evento, data, quantidade, valor.
- Ingressos gerados: QR Code, nome do participante, código.
- Botão para baixar/salvar.
- Convite (não obrigatório) para criar conta completa.

---

### 6.4 Meus ingressos (`/meus-ingressos`)
- Busca por código de venda (sem login).
- Se logado: exibe automaticamente todos os ingressos da conta.

---

### 6.5 Ingresso individual (`/ingresso/:ticket_code`)
- QR Code.
- Nome do participante.
- Evento, data, local.
- Status: válido / utilizado / cancelado.

---

### 6.6 Login, Cadastro, Recuperação de senha
- Login: e-mail + senha, links para cadastro e recuperação.
- Cadastro: nome completo, WhatsApp, e-mail, senha (mín. 8 caracteres). Ao cadastrar, vincula automaticamente compras anteriores pelo WhatsApp.
- Recuperar senha: e-mail → link de redefinição.
- Redefinir senha: nova senha + confirmação.

---

## 7. Área do cliente (`/cliente`)

Mobile first. Apenas para usuários com conta completa.

### 7.1 Dashboard do cliente
- Saudação com nome.
- Cards: total de eventos, total de ingressos, pontos acumulados.
- Próximos eventos com ingresso.
- Eventos passados.

### 7.2 Meus ingressos (`/cliente/ingressos`)
- Lista de todos os ingressos.
- Filtros: próximos / passados / todos.
- Cada ingresso: evento, data, QR Code, status.

### 7.3 Perfil (`/cliente/perfil`)
Campos editáveis:
- Nome completo.
- WhatsApp.
- E-mail.
- Cidade.
- Data de nascimento (opcional).
- Instagram (opcional — dado de CRM, não de autenticação).
- Foto de perfil (opcional).
- Preferência de tema (light/dark).

**Gamificação:** preenchimento completo do perfil gera pontos. Instagram é um dos campos que geram pontos por preenchimento.

### 7.4 Pontos (`/cliente/pontos`) — Plano Business
- Saldo de pontos.
- Histórico de pontuação (como ganhou cada ponto).
- Regras de pontuação exibidas de forma clara.

---

## 8. Painel administrativo (`/admin`)

Desktop first. Menu lateral fixo (240px, recolhível).

### 8.1 Layout
- Sidebar: logo + itens de menu com ícone e label.
- Item ativo: borda esquerda verde neon + fundo sutil.
- Header: nome do usuário, troca de tema, notificações (futuro).
- Conteúdo principal à direita.

### 8.2 Menu do admin (ordem definitiva)

```
Dashboard
Eventos
Vendas
Cortesias
Clientes
Check-in
Histórico Financeiro
Simulador de Evento
Importação
Relatórios
Sorteios
Usuários
Configurações
```

---

### 8.3 Dashboard (`/admin`)

Cards de resumo (período: hoje / 7 dias / 30 dias / total):
- Total de vendas (qtd e valor).
- Ingressos emitidos.
- Cortesias emitidas.
- Taxa de check-in (%).
- **Abandonos de checkout** (chegaram ao Pix mas não pagaram) — dado de remarketing.

Gráfico: vendas por dia (últimos 14 dias).
Últimas 5 vendas.
Próximos eventos.
**Alerta de remarketing:** compradores que abandonaram nas últimas 24h.

---

### 8.4 Eventos (`/admin/eventos`)

**Listagem:**
- Cards: imagem, nome, data, status, ingressos vendidos vs. capacidade.
- Botão "Novo evento".
- Filtros: todos / publicados / rascunhos / encerrados.

**Criar / Editar evento (`/admin/eventos/novo` e `/admin/eventos/:id`):**

Campos:
- Nome (obrigatório).
- Descrição (texto rico, opcional).
- Imagem de capa (upload).
- Data e horário (obrigatório).
- Local / endereço (obrigatório).
- Slug (auto-gerado, editável).
- Status: rascunho / publicado.
- Encerrado manualmente (toggle).

**Lotes de ingresso** (seção dentro do evento):
- Cada lote: nome, preço, quantidade, data início, data fim.
- Múltiplos lotes por evento.
- Adicionar / remover lotes.
- Ordem por período de validade.

---

### 8.5 Vendas (`/admin/vendas`)

**Objetivo:** visão exclusiva de ingressos vendidos (não inclui cortesias nos totais financeiros).

**Origens de venda registradas pelo sistema:**
- `ticketflow` — venda online automática (Pix/MP).
- `manual` — lançada pelo admin (WhatsApp, presencial).
- `bilheteria` — venda física (maquininha).
- `importado` — vinda de outra plataforma (UTicket, Sympla, etc.).

**Lançamento manual de venda:**
- Selecionar evento e lote.
- Nome completo + WhatsApp do comprador.
- Quantidade.
- Valor pago (pode diferir do preço do lote).
- Forma de pagamento (Pix manual, dinheiro, cartão, outro).
- Observação (opcional).
- Gerar ingressos imediatamente ao salvar.

**Listagem:**
- Tabela: nome, WhatsApp, evento, lote, origem, quantidade, valor, status, data.
- Filtros: evento, origem, status, período.
- Busca por nome ou WhatsApp.
- Exportar CSV.

**Detalhe da venda (`/admin/vendas/:id`):**
- Dados do comprador.
- Dados da venda (evento, lote, quantidade, valor, origem, status, data).
- Ingressos gerados (QR Code + status de check-in).
- Ações: cancelar venda (com confirmação).

---

### 8.6 Cortesias (`/admin/cortesias`)

**Área exclusiva para ingressos sem cobrança.**
Separada das vendas para não contaminar dados financeiros.

**Emitir cortesia individual:**
- Selecionar evento.
- Nome completo + WhatsApp do convidado.
- Quantidade.
- Observação (opcional).
- Ingressos gerados imediatamente.

**Lançamento em lote:**
- Colar lista de nomes (um por linha) ou upload de arquivo.
- Sistema processa, aplica regras de qualidade de nome, e exibe prévia.
- Confirmar para gerar todos os ingressos de uma vez.

**Listagem de cortesias:**
- Tabela: nome, WhatsApp, evento, quantidade, data, status de check-in.
- Filtros: evento, período.

---

### 8.7 Clientes (`/admin/clientes`)

**Listagem:**
- Tabela: nome, WhatsApp, total de eventos, total de ingressos, último evento.
- Busca por nome ou WhatsApp.
- Ordenar por: mais frequente, mais recente, maior valor gasto.
- Destaque visual para "melhores clientes" (maior frequência).

**Ficha do cliente (`/admin/clientes/:id`)** — Plano Business:
- Dados: nome, WhatsApp, e-mail, Instagram, cidade, data de nascimento.
- Indicador: possui conta completa ou apenas cadastro simplificado.
- Histórico automático:
  - Primeiro evento.
  - Último evento.
  - Total de eventos frequentados.
  - Total de ingressos comprados.
  - Valor total gasto.
  - Ticket médio.
  - Histórico cronológico de compras.
- Acesso rápido: botão WhatsApp (abre conversa), botão Instagram (abre perfil).
- Padrões de comportamento (futuro): antecipação de compra, compra em grupo, frequência.

---

### 8.8 Check-in (`/admin/checkin`)

- Seletor de evento ativo.
- Iniciar leitura via câmera (QR Code).
- Resultado em destaque:
  - ✅ Válido — nome, evento, horário.
  - ⚠️ Já utilizado — horário do uso anterior.
  - ❌ Inválido — motivo.
- Contador em tempo real: check-ins realizados vs. total de ingressos.
- Histórico da sessão atual.

---

### 8.9 Histórico Financeiro (`/admin/financeiro`)

**Objetivo:** retrato financeiro completo de cada evento.
Acessível pelo menu principal do admin.

**Seletor de evento no topo da tela.**

**Dados automáticos (preenchidos pelo sistema):**
- Receita de ingressos TicketFlow.
- Receita de ingressos por origem (manual, bilheteria, importado).
- Total de ingressos vendidos.
- Total de cortesias.
- Ticket médio.
- Total de check-ins.

**Dados do bar (inseridos manualmente):**
- Custo do bar (R$).
- Receita bruta do bar (R$).
- Lucro líquido do bar (calculado automaticamente).
- Margem de lucro do bar (%).
- ROI do bar (%).
- Consumo médio por participante (R$).

**Outras receitas (campos livres, múltiplos):**
- Tipo (patrocínio, estacionamento, outro) + valor.

**Despesas (campos livres, múltiplos):**
- Descrição + valor.

**Resumo calculado automaticamente:**
- Receita total (ingressos + bar + outras).
- Total de despesas.
- Lucro / prejuízo.
- ROI geral do evento (%).
- Margem de lucro (%).

---

### 8.10 Simulador de Evento (`/admin/simulador`)

**Ferramenta de planejamento pré-evento. Baseada em projeções — nunca usa dados reais de vendas.**

Campos de entrada:
- Nome do evento (referência).
- Capacidade do local.
- Preço médio do ingresso (pode importar de um lote existente).
- Percentual de ocupação esperado (slider).
- Custo fixo (R$).
- Custo variável por pessoa (R$, opcional).
- Receita prevista do bar (R$, opcional).
- Outras receitas previstas (campos livres).

Resultados automáticos:
- Público esperado.
- Receita projetada de ingressos.
- Receita total projetada.
- Custo total estimado.
- Lucro / prejuízo projetado.
- Ponto de equilíbrio (qtd mínima de ingressos).
- Margem de segurança (% acima do break-even).

Cenários simultâneos:
- 🔴 Pessimista (70% do esperado).
- 🟡 Realista (100%).
- 🟢 Otimista (120%).

Regra: nenhum dado desta ferramenta afeta o sistema real.

---

### 8.11 Importação de Vendas (`/admin/importacao`)

**Objetivo:** centralizar vendas de outras plataformas no TicketFlow.

**Arquitetura:** baseada em adaptadores. Cada plataforma tem seu próprio adaptador. Novas plataformas = novos adaptadores, sem alterar o sistema.

**Adaptadores previstos:**
- UTicket (v1.0 — via upload de arquivo).
- Sympla (v1.1 — via upload de arquivo; integração por API quando disponível).

**Fluxo:**
1. Selecionar evento de destino.
2. Selecionar plataforma de origem.
3. Upload do arquivo exportado.
4. Sistema mapeia e exibe prévia (nome, WhatsApp, qtd, valor, data).
5. Sinaliza duplicatas (mesmo WhatsApp + mesmo evento) para revisão.
6. Usuário confirma importação.
7. Vendas registradas com origem `importado` + nome da plataforma.

**Regras:**
- Vendas importadas não geram movimentação financeira — são registro histórico.
- Ingressos importados recebem QR Code do TicketFlow para check-in.

---

### 8.12 Relatórios (`/admin/relatorios`)

**Plano Pro e Business.**

Gráficos:
- Vendas por dia (linha, período customizável).
- Horários de pico de compra (barras por hora).
- Distribuição de quantidade por compra (pizza: 1, 2, 3, 4+).
- Origem das vendas (TicketFlow / manual / bilheteria / importado / cortesia).
- Taxa de abandono de checkout por evento.

**Análise Histórica de Rentabilidade** — Plano Business:
- Ranking de eventos por lucro total.
- Ranking por margem de lucro (%).
- Ranking por ROI.
- Ranking de desempenho do bar.
- Média histórica de ROI dos eventos.
- Média histórica de ROI do bar.
- Ticket médio por participante (histórico).
- Consumo médio por participante no bar.
- % da receita total proveniente do bar.
- Comparativo entre eventos (seleção de 2+ eventos).

Perguntas que o módulo responde:
- Quais tipos de evento geram maior retorno?
- O bar compensa nesse perfil de evento?
- Eventos maiores têm melhor margem?
- Quais perfis de público consomem mais?

Exportar dados (CSV) em todos os relatórios.

---

### 8.13 Remarketing (`/admin/remarketing`) — Plano Pro e Business

**Objetivo:** recuperar compradores que quase finalizaram a compra.

**Dados capturados:**
- Visitante que chegou ao checkout mas não gerou Pix.
- Visitante que gerou Pix mas não pagou (expirou).

**Informações disponíveis (quando fornecidas no checkout):**
- Nome (se preencheu).
- WhatsApp (se preencheu).
- Evento e lote de interesse.
- Data e hora do abandono.

**Ações disponíveis:**
- Visualizar lista de abandonos por evento.
- Acesso rápido ao WhatsApp do potencial comprador.
- Marcar como "contactado" / "convertido" / "descartado".

**Dashboard:** card de resumo de abandonos nas últimas 24h visível no Dashboard principal.

---

### 8.14 Sorteios (`/admin/sorteios`)

- Criar sorteio: nome do prêmio, evento vinculado, descrição.
- Participantes: adicionar individual (nome + WhatsApp) ou em lote.
- Realizar sorteio: animação visual, exibição do vencedor, registro com data/hora.
- Possibilidade de novo sorteio (substitui anterior).

---

### 8.15 Usuários (`/admin/usuarios`)

- Listar usuários com acesso ao painel da organização.
- Convidar por e-mail + definir papel (admin / operador).
- Remover usuário.

---

### 8.16 Configurações (`/admin/configuracoes`)

Seções:
- **Organização:** nome, logo, dados de contato.
- **Mercado Pago:** wizard de configuração (ver 8.17), status da integração.
- **Preferências:** tema padrão da interface.
- **Backup de dados:** exportar todos os dados da organização em JSON ou CSV.

---

### 8.17 Wizard de configuração do Mercado Pago

Etapas:
1. Introdução (o que é e para que serve).
2. Credenciais (Access Token produção + sandbox).
3. Validação automática das credenciais.
4. Configuração do webhook (instrução + URL para copiar).
5. Teste de pagamento (R$ 0,01 para validar fluxo completo).
6. Confirmação — integração ativa.

---

## 9. Super Admin (`/superadmin`)

### 9.1 Dashboard
- Total de organizações ativas.
- Total de eventos na plataforma.
- Total de vendas (todas as organizações).

### 9.2 Organizações (`/superadmin/organizacoes`)
- Listar com status: pendente / ativa / suspensa / cancelada.
- Aprovar / suspender / cancelar.
- Ver detalhes: eventos, usuários, volume.

### 9.3 Planos (`/superadmin/planos`)
- Organizações por plano.
- Alterar plano de uma organização.

---

## 10. Planos e funcionalidades

| Funcionalidade | Start | Pro | Business |
|---|---|---|---|
| Gestão de eventos e lotes | ✅ | ✅ | ✅ |
| Lançamento manual de vendas | ✅ | ✅ | ✅ |
| Emissão de ingressos + QR Code | ✅ | ✅ | ✅ |
| Check-in em tempo real | ✅ | ✅ | ✅ |
| Cortesias (individual e em lote) | ✅ | ✅ | ✅ |
| Sorteios | ✅ | ✅ | ✅ |
| Importação de vendas | ✅ | ✅ | ✅ |
| Histórico Financeiro manual | ✅ | ✅ | ✅ |
| Simulador de Evento | ✅ | ✅ | ✅ |
| Backup de dados | ✅ | ✅ | ✅ |
| Integração Mercado Pago (Pix automático) | ❌ | ✅ | ✅ |
| Venda online (página pública) | ❌ | ✅ | ✅ |
| Área do cliente (comprador) | ❌ | ✅ | ✅ |
| Remarketing (abandono de checkout) | ❌ | ✅ | ✅ |
| Relatórios avançados | ❌ | ✅ | ✅ |
| CRM — Ficha inteligente do cliente | ❌ | ❌ | ✅ |
| Gamificação (pontos) | ❌ | ❌ | ✅ |
| Análise histórica de rentabilidade | ❌ | ❌ | ✅ |
| Financeiro comparativo (previsto × realizado) | ❌ | ❌ | ✅ |

---

## 11. Banco de dados — entidades principais

| Entidade | Descrição |
|---|---|
| `organizations` | Cada produtor / tenant |
| `profiles` | Contas de usuário (admin, operador, cliente) |
| `user_roles` | Papel do usuário dentro da organização |
| `events` | Eventos de uma organização |
| `ticket_batches` | Lotes de ingresso por evento |
| `sales` | Vendas (um pedido, múltiplos ingressos) |
| `tickets` | Ingressos individuais |
| `customers` | Cadastro simplificado de compradores |
| `mp_config` | Credenciais Mercado Pago por organização |
| `event_financial` | Dados financeiros manuais por evento |
| `checkout_abandonments` | Abandonos de checkout para remarketing |
| `raffles` / `raffle_participants` / `raffle_winners` | Sorteios |
| `points_ledger` | Histórico de pontos por cliente |

**Princípios:**
- Toda entidade pertence a uma `organization_id`.
- Isolamento total via RLS no Supabase.
- `customers` criado automaticamente em toda compra.
- `sales.batch_id` sempre preenchido.
- WhatsApp: sempre `5511999999999`.
- Nomes: sempre title case (exceto conectivos).

---

## 12. Fluxo de compra completo (Plano Pro)

```
1. Visitante acessa /e/:slug
2. Visualiza evento e lotes disponíveis
3. Seleciona quantidade → "Comprar agora"
4. Preenche nome + WhatsApp (+ e-mail opcional)
5. Sistema cria/reutiliza customer pelo WhatsApp
6. Sistema cria sale status "pendente"
7. mp-create-pix → gera QR Code Pix
8. Visitante paga (expira em 30 min)
   → Se abandona: registra em checkout_abandonments
9. Webhook MP → mp-webhook valida assinatura HMAC
10. confirm_sale_paid → status "pago"
11. create_locked_tickets → ingressos com QR Code
12. Redireciona para /e/:slug/confirmacao/:sale_code
```

---

## 13. Decisões técnicas

- **Frontend:** React + Vite + TypeScript.
- **UI:** Tailwind CSS + shadcn/ui + Design System próprio (DESIGN-SYSTEM.md).
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions).
- **Pagamentos:** Mercado Pago (Pix), credenciais por organização.
- **Ícones:** Lucide Icons.
- **Tipografia:** Geist (Sans + Mono).
- **Temas:** Light (padrão) + Dark, via variáveis CSS.
- **Temas de cor:** Verde neon (padrão); estrutura preparada para azul, roxo, vermelho.
- **Mobile first:** área pública e área do cliente.
- **Desktop first:** painel admin e super admin.
- **Multi-tenant:** RLS por `organization_id` desde o início.
- **Aprovação de organizações:** manual pelo super admin, campo preparado para automação futura.
- **Pagamento de ingressos:** direto na conta MP do produtor. TicketFlow não intermedia.
- **Importação:** arquitetura de adaptadores — novas plataformas = novos adaptadores.

---

## 14. Backlog (documentado, não implementado)

- Integração Sympla via API (quando disponível).
- Comparativo previsto × realizado (Simulador vs. Histórico Financeiro).
- Padrões de comportamento de clientes (compra antecipada, compra em grupo, frequência).
- Notificações (e-mail / WhatsApp) para compradores.
- Múltiplos temas de cor (azul, roxo, vermelho neon).
- App mobile nativo (PWA como primeiro passo).
- Módulo de billing / assinaturas automatizado.
