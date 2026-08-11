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
| Check-in (módulo isolado) | `/checkin` | Admin, Colaborador, Operador de Check-in |
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

### 4.4 Colaborador
- Acesso restrito à organização: visualização (somente leitura) da área de Vendas + acesso funcional completo ao Check-in.
- Sem acesso a: Eventos, Cortesias, Clientes, Histórico Financeiro, Ferramentas, Relatórios, Usuários, Configurações.
- Itens sem acesso não aparecem no menu lateral para este papel (não apenas bloqueados por rota — ocultos).
- Acessa o Check-in em `/checkin` (mesma tela isolada usada pelo Operador de Check-in, ver 4.4.1) — não é uma versão diferente, é a mesma.

### 4.4.1 Operador de Check-in
- Papel dedicado, mais restrito que Colaborador: acesso **exclusivo** ao módulo de Check-in — nada mais.
- **Módulo isolado, não uma tela dentro do admin:** ao fazer login, o sistema reconhece o papel automaticamente e redireciona direto para `/checkin` — nunca renderiza o `AdminLayout` (sidebar, menu) para este papel, nem por um instante.
- Qualquer tentativa de acessar outra rota (incluindo `/admin/*`) redireciona de volta para `/checkin` — bloqueio real, não apenas item de menu oculto.
- Existe justamente para dar acesso a alguém de confiança mínima (ex: freelancer contratado só para a entrada do evento), sem expor nada além da leitura de QR Code.

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

### Comprador × Participante
- **Comprador** é quem realiza a compra/lançamento (nome + WhatsApp). **Participante** é quem usa o ingresso — podem ser pessoas diferentes.
- Toda venda (automática, manual, cortesia) que gerar mais de 1 ingresso deve exibir automaticamente um campo de nome por ingresso, para o participante correspondente.
- Regras de nome completo (capitalização, mínimo 2 palavras) aplicam-se a cada participante individualmente, não só ao comprador.
- `sales.buyer_name/buyer_whatsapp` ≠ `tickets.participant_name` — são sempre campos distintos, mesmo quando a mesma pessoa compra para si.

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

**Comportamento responsivo (correção — desktop-first não significa desktop-only):**
- Acima de um breakpoint definido (ex: 1024px): sidebar fixa, como já implementada, sem alteração.
- Abaixo do breakpoint (tablet/mobile): sidebar oculta por padrão, substituída por um botão de menu (ícone hambúrguer) no header. Ao tocar, a sidebar abre como painel sobreposto (overlay/drawer), deslizando da esquerda, com fundo escurecido atrás — mesmo padrão visual/comportamento já usado no painel lateral (Sheet) do sistema, só que vindo da esquerda em vez da direita.
- Conteúdo principal ocupa a largura total da tela quando a sidebar está oculta — sem exigir scroll horizontal para navegar.
- Tabelas densas podem manter scroll horizontal interno em telas pequenas (compromisso aceitável) — o objetivo aqui é tornar o sistema navegável e utilizável no celular, não redesenhar cada tela densa para mobile.

### 8.2 Menu do admin (ordem definitiva)

```
Dashboard
Eventos
Vendas
Cortesias
Clientes
Check-in
Histórico Financeiro
Importação
Relatórios
Ferramentas
Usuários
Configurações
```

**Ferramentas (`/admin/ferramentas`)** — hub agrupando utilitários do sistema, para não crescer o menu lateral a cada novo módulo adicionado. Substitui entradas individuais de Simulador de Evento, Remarketing e Sorteios no menu.

- Grid de cards visuais (mesmo padrão dos cards de Eventos): ícone/imagem representando a ferramenta, nome, breve descrição de uma linha.
- Cada card leva para a rota já existente da ferramenta (/admin/simulador, /admin/remarketing, /admin/sorteios).
- Preparado para receber novas ferramentas futuras sem exigir novo item de menu.
- Cards do 1º momento de desenvolvimento: Simulador de Evento ("Projete a viabilidade financeira antes do evento acontecer"), Remarketing ("Recupere compradores que quase finalizaram uma compra"), Checklist do Evento ("Organize as tarefas do dia do evento para não esquecer nada"). Card de Sorteios entra apenas no 2º momento (ver 8.2.1) — não exibir card desabilitado/"em breve" enquanto isso.

**Checklist do Evento (`/admin/ferramentas/checklist`):**
- Ferramenta simples de lista de tarefas, vinculada a um evento (dropdown de seleção no topo).
- Duas abas: "Tarefas" (pendentes) e "Concluídas", cada uma com contador (ex: "Tarefas (5)", "Concluídas (3)").
- Adicionar tarefa: **único ponto de entrada**, botão "+ Nova Tarefa" no canto superior direito (mesmo padrão dos demais botões de ação principal do sistema — "+ Nova Venda", "+ Novo Cliente", etc.). Ao clicar, revela um campo de texto inline (abaixo do cabeçalho ou substituindo o próprio botão temporariamente) com Enter para confirmar. Não deve haver nenhum outro campo de adicionar tarefa em outro ponto da tela.
- Cada tarefa na aba Tarefas: texto + botão de ícone "check" (concluir) — ao clicar, a tarefa sai da aba Tarefas e entra em Concluídas imediatamente, sem confirmação.
- Cada tarefa na aba Concluídas: texto (esmaecido) + botão "Restaurar" (ícone de desfazer) — volta para a aba Tarefas.
- Remover tarefa (ícone X) disponível nas duas abas, sem necessidade de confirmação — ação de baixo risco.
- Sem gesto de arrastar/swipe — o admin é desktop-first, o botão de ícone já cobre a ação em qualquer dispositivo.
- Sem categorias, sem prazo, sem prioridade — deliberadamente simples.

---

### 8.2.1 Fases de desenvolvimento

O projeto está sendo validado num evento real do próprio produtor antes de evoluir para SaaS multi-produtor. Por isso, o desenvolvimento é dividido em dois momentos — o critério de corte é "o que é essencial para operar um evento real com confiança" vs. "o que pode esperar sem travar o uso":

**1º momento (atual — construir agora):**
Dashboard, Eventos, Vendas, Cortesias, Clientes, Configurações (+ assistente Mercado Pago), Ferramentas → Remarketing e Simulador de Evento (não exigem mudança estrutural, só consulta de dados já existentes), Usuários, Check-in (último item deste momento).

**2º momento (mais adiante):**
Histórico Financeiro, Importação de vendas, Sorteios.

Ao final do 1º momento: revisão e avaliação geral do que foi construído, antes de iniciar o 2º momento.

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

**Criar evento — formato Steps (wizard), não formulário único:**

Princípio: eliminar poluição visual, um assunto por tela. Aplica-se também à futura integração com Mercado Pago.

1. **Informações básicas** — nome, descrição, imagem de capa, data/horário, local, slug (auto-gerado, editável).
2. **Modelo de venda** — pergunta direta: "Trabalhar com lotes ou preço único?"
3. **Configuração de venda:**
   - Se **lotes**: nome, preço, quantidade, data início/fim de cada lote. Múltiplos lotes.
   - Se **preço único**: apenas preço e quantidade total.
   - **Decisão de arquitetura:** "preço único" não é um caminho separado no banco — o sistema cria automaticamente um único `ticket_batch` chamado "Ingresso único" por trás. Checkout, estoque e relatórios continuam com um único fluxo de código.
4. **Revisão e publicação** — resumo, confirma, publica ou salva como rascunho.

**Editar evento:** mesmo formato de Steps, reaproveitando os dados já preenchidos.

**Virada de lote:**
- **Automática por data/horário** — consequência natural de cada lote ter início/fim; ao expirar, o próximo lote (ordem cronológica) assume.
- **Automática por esgotamento** — se o lote atual esgotar o estoque antes da data programada, o sistema avança automaticamente para o próximo lote (evita perda de venda).
- **Virada Expressa (manual)** — botão na tela de detalhe do evento (não no wizard de criação — é ação operacional, sempre visível enquanto o evento está ativo/publicado). Produtor clica, sistema pede confirmação ("Tem certeza que deseja virar para o próximo lote agora?"), e antecipa a virada manualmente.

---

### 8.5 Vendas (`/admin/vendas`)

**Objetivo:** visão exclusiva de ingressos vendidos individualmente, com comprador/participante identificado (não inclui cortesias nem bilheteria nos totais financeiros).

**Origens de venda registradas nesta área:**
- `ticketflow` — venda online automática (Pix/MP).
- `manual` — lançada pelo admin (WhatsApp, presencial, com participante identificado).
- `importado` — vinda de outra plataforma (UTicket, Sympla, etc.).

**Nota sobre bilheteria:** vendas físicas (maquininha) não têm comprador/participante nomeado nem QR individual — são registradas como valores agregados por faixa de preço (ex: "60 vendas de R$25"), diretamente no **Histórico Financeiro do evento** (seção 8.9), no mesmo padrão dos dados do bar. Não aparecem na listagem de Vendas.

**Mini dashboard da área (topo da tela, acima da listagem):**
- Total vendido no período/evento selecionado (R$)
- Quantidade de ingressos vendidos
- Ticket médio
- Aguardando pagamento (quantidade de pedidos pendentes)
- Cards compactos, menores que os do Dashboard principal — não duplicar o mesmo destaque visual

**Lançamento manual de venda:**
- Botão de acesso: "+ Nova Venda" (nomenclatura curta, botão compacto).
- Interface: **painel lateral (Sheet)** com steps e barra de progresso — não modal centralizado. Etapas: 1. Cliente → 2. Ingressos → 3. Confirmar. Ver padrão em DESIGN-SYSTEM.md.
- Selecionar evento e lote.
- Nome completo + WhatsApp do comprador.
- Quantidade.
- Valor pago (pode diferir do preço do lote).
- Forma de pagamento (Pix manual, dinheiro, cartão, outro).
- **Nome do participante de cada ingresso** — um campo por unidade, gerado automaticamente conforme a quantidade (comprador ≠ participante; ver regra global). Mesmas regras de qualidade de nome aplicadas a cada campo.
- Observação (opcional).
- Gerar ingressos imediatamente ao salvar, cada um vinculado ao respectivo nome de participante.

**Listagem:**
- Tabela: nome, WhatsApp, evento, lote, origem, quantidade, valor, status, data.
- Filtros: evento, origem, status, período.
- Busca por nome ou WhatsApp.
- Exportar CSV.
- **Exportar lista em PDF** para check-in manual — nomes dos participantes em ordem alfabética, checkbox à frente de cada nome, espaçamento reduzido entre linhas (otimizado para caber o máximo de nomes por folha).

**Detalhe da venda (`/admin/vendas/:id`):**
- Dados do comprador.
- Dados da venda (evento, lote, quantidade, valor, origem, status, data).
- Ingressos gerados (QR Code + status de check-in).
- Ações: cancelar venda (com confirmação).

---

### 8.6 Cortesias (`/admin/cortesias`)

**Área exclusiva para ingressos sem cobrança.**
Separada das vendas para não contaminar dados financeiros.
Deliberadamente mais simples que Vendas: cortesia não exige WhatsApp nem distinção comprador/participante — é apenas nome do convidado, um ingresso por nome.

**Mini dashboard da área (topo da tela):**
- Card "Total de cortesias" (do evento selecionado ou acumulado).
- Card "Check-ins de cortesias" (quantos já fizeram check-in).
- Apenas esses dois — sem métricas financeiras, já que cortesia não gera receita.

**Emitir cortesias — painel único, três formas de adicionar nome:**
- Selecionar evento (obrigatório, único campo antes de começar a adicionar nomes).
- Três formas de adicionar, todas alimentando a mesma lista acumulada na sessão:
  1. **Digitar um por vez:** campo de texto único — digita o nome, aperta Enter, nome é adicionado à lista e o campo limpa e permanece focado para o próximo.
  2. **Colar lista:** área de texto, um nome por linha, sistema separa e adiciona todos de uma vez.
  3. **Importar arquivo:** upload de arquivo .txt, um nome por linha, mesma regra de processamento da lista colada.
- Todo nome adicionado passa pelas regras de qualidade (capitalização automática, mínimo 2 palavras) — nomes inválidos ficam sinalizados na lista para correção antes de emitir.
- Lista acumulada exibida abaixo, em ordem alfabética, com opção de remover qualquer nome antes de confirmar.
- Botão primário "Emitir cortesias" — gera um ingresso por nome válido da lista, de uma vez.

**Listagem de cortesias:**
- Tabela: nome, evento, data de emissão, status de check-in.
- Filtros: evento, período.
- **Exportar lista em PDF** — nomes em ordem alfabética, checkbox à frente de cada nome, espaçamento reduzido entre linhas (mesmo padrão usado em Vendas).

---

### 8.7 Clientes (`/admin/clientes`)

**Mini dashboard da área (topo da tela, acima da listagem):**
- Card "Novos clientes" com seletor de período (últimos 7 / 15 / 30 dias) — mostra quantos clientes se cadastraram (pelo WhatsApp, cadastro simplificado ou completo) na janela selecionada. Permite acompanhar a evolução de captação de clientes ao longo de um evento.
- Nenhum outro card de destaque/ranking nesta área (ex: "Top 3 clientes") — a ordenação por coluna já cumpre essa função (ver Listagem).

**Cadastrar novo cliente:**
- Botão "+ Novo Cliente", mesmo padrão visual do "+ Nova Venda".
- Interface: painel lateral (Sheet), mesmo padrão do Nova Venda — mas em etapa única (sem steps/barra de progresso), já que é uma entidade só, sem ramificação.
- Campos: nome completo (regras de qualidade aplicadas), WhatsApp (máscara + normalização), e-mail (opcional), cidade (opcional), data de nascimento (opcional), Instagram (opcional).
- Botão primário "Salvar cliente" no rodapé do painel.

**Listagem:**
- Tabela: nome, WhatsApp (com botão de copiar ao lado), total de eventos, total de ingressos, último evento, data de cadastro.
- Colunas ordenáveis (indexáveis) por clique no cabeçalho — inclui ordenação por quantidade de ingressos, que já cumpre a função de ranking sem precisar de um componente dedicado.
- Busca por nome ou WhatsApp.
- Exclusão de cliente com modal de confirmação.
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

### 8.8 Check-in (`/checkin`)

**Módulo isolado — rota de nível superior, fora de `/admin`.** Usa `MobileLayout`, nunca o `AdminLayout`, independente de quem acessa. Acessível por Admin, Colaborador e Operador de Check-in (ver seção 4). Para Operador de Check-in, é a única rota alcançável — login redireciona direto para cá, e qualquer outra tentativa de navegação retorna para esta rota. Tratamento técnico especial (Fullscreen, Wake Lock, bloqueio de saída acidental) — ver seção 13.2 (Arquitetura mobile/PWA), mantido como camada técnica invisível, sem adicionar elementos visuais extras à tela.

Deliberadamente simples — apenas o essencial:
- Seletor de evento (discreto, não é um bloco de configuração — só precisa existir para saber contra qual evento validar).
- Leitura via câmera (QR Code) — ativa por padrão ao entrar na tela, é a ação principal.
- Link discreto "Digitar código manualmente" abaixo da área de leitura — revela um campo de texto só quando clicado, para os casos de QR Code ilegível/danificado.
- Resultado da leitura/digitação em destaque: ✅ Válido (nome, evento, horário) / ⚠️ Já utilizado (horário do uso anterior) / ❌ Inválido (motivo).
- Lista de check-ins realizados, em ordem cronológica (mais recente primeiro), sempre visível abaixo.

Sem contador dedicado, sem bloco de estatística — a lista já comunica o progresso.

## 13.2 Arquitetura mobile / PWA

Decisão registrada a partir do briefing técnico do produtor. Aplica-se antes de construir Check-in, Área do Cliente e Área Pública — nenhuma dessas telas foi construída ainda, então não há retrabalho.

**PWA único** — cobre o app inteiro (Admin + Cliente + Público), mesmo domínio, mesmo manifest e service worker. Não há PWAs separados por área.
- `manifest.json`: `display: standalone`, ícones, nome, cor de tema (usa a cor de destaque ativa do sistema).
- Service Worker básico (habilita instalação; cache offline complexo fica fora de escopo por ora).
- Meta tags mobile no `index.html`: viewport correto, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.

**Dois layouts distintos, não um layout responsivo genérico:**
- `AdminLayout` — desktop-first, sidebar, tabelas densas. Já em uso em todas as telas administrativas construídas até aqui.
- `MobileLayout` — mobile-first, navegação inferior, componentes touch-friendly. Usado pela Área do Cliente, Área Pública, e por telas específicas do admin que são de uso em campo (Check-in).
- Troca de layout decidida por rota/contexto (qual tela é), não por tamanho de tela — uma tela de Check-in continua em `MobileLayout` mesmo aberta numa janela larga de desktop.

**Check-in — comportamento de app nativo (uso em campo, risco de fechamento acidental):**
- Fullscreen API (`requestFullscreen`), acionada pelo botão "Iniciar Check-in" — funciona bem em Android/Chrome. **Não funciona no Safari/iOS** (limitação conhecida da plataforma, não é bug do projeto). Nesses casos, o app deve orientar o uso do PWA instalado (modo standalone), que remove a barra do navegador sem depender da Fullscreen API.
- Interceptar navegação/botão voltar (`history.pushState` + listener `popstate`): exibir confirmação antes de sair do modo Check-in.
- Wake Lock API para impedir que a tela apague durante o uso — suporte varia por navegador; aplicar com verificação de disponibilidade, sem quebrar caso não suportado.
- Em modo instalado (standalone), gestos acidentais do navegador (pull-to-refresh, swipe de navegação) já ficam naturalmente desativados.

**Responsividade:** breakpoints Tailwind usados de forma consistente com a estratégia de cada área. Para diferenças estruturais grandes (não só estilo), preferir troca de componente via hook de detecção de dispositivo (`useMediaQuery`) a esconder/mostrar elementos via CSS.

**Botão/banner de instalação (Adicionar à Tela de Início):**
- Componente reutilizável, exibido principalmente em contextos `MobileLayout` (Área do Cliente, Check-in) — dispensável no Admin desktop.
- **Android/Chrome:** botão real "Instalar app", usando o evento `beforeinstallprompt` (capturado e guardado; ao clicar, chama `.prompt()`). Some automaticamente depois de instalado.
- **iOS/Safari:** não existe API para instalar via JavaScript — a Apple não permite. Nesses casos, exibir um banner/modal com instrução visual em 2 passos: "toque em Compartilhar → Adicionar à Tela de Início" (com os ícones correspondentes). Detectar iOS + navegador fora do modo standalone (`navigator.standalone === false`) para decidir quando mostrar.
- Dispensável/discreto: se o usuário fechar o banner, não mostrar novamente (guardar preferência no localStorage). Nunca bloquear o uso do app por trás do banner.

---

### 8.9 Histórico Financeiro (`/admin/financeiro`)

**Objetivo:** retrato financeiro completo de cada evento.
Acessível pelo menu principal do admin.

**Seletor de evento no topo da tela.**

**Dados automáticos (preenchidos pelo sistema):**
- Receita de ingressos TicketFlow.
- Receita de ingressos por origem (manual, importado).
- Total de ingressos vendidos.
- Total de cortesias.
- Ticket médio.
- Total de check-ins.

**Vendas em bilheteria (inseridas manualmente, agregadas por faixa):**
- Faixa de preço (R$) + quantidade vendida (múltiplas faixas por evento, ex: "60 vendas de R$25", "80 de R$30").
- Total calculado automaticamente (soma de todas as faixas).

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

**Regra de encerramento do evento:**
- Encerramento é **manual**, por comando explícito do produtor (botão "Encerrar evento") — nunca automático pela data do evento.
- Encerrar apenas altera o status/badge do evento e interrompe a venda pública. **Não trava** o Histórico Financeiro — dados (bilheteria, bar, outras receitas, despesas) continuam podendo ser adicionados ou corrigidos após o encerramento, já que a reconciliação financeira normalmente acontece dias depois do evento.

**Resumo calculado automaticamente:**
- Receita total (ingressos + bilheteria + bar + outras).
- Total de despesas.
- Lucro / prejuízo.
- ROI geral do evento (%).
- Margem de lucro (%).

---

### 8.10 Simulador de Evento (`/admin/simulador`)

**Ferramenta de planejamento pré-evento. Baseada em projeções — nunca usa dados reais de vendas.**
Formato: etapas numeradas em sequência (não wizard bloqueante — todas visíveis em scroll único), com o resultado calculado ao vivo conforme os campos mudam.

**Etapa 1 — Dados gerais:**
- Nome do evento (referência, texto livre).
- Capacidade total (pessoas) — limite máximo de ingressos do evento simulado.

**Etapa 2 — Lotes de ingressos:**
- Tabela com linhas adicionáveis ("+ Adicionar lote"): nome do lote, quantidade disponível, preço (R$), quantidade vendida estimada.
- Receita por lote calculada automaticamente (preço × quantidade vendida estimada).
- Linha de total: soma de quantidade disponível, quantidade vendida e receita.
- Opção de importar lotes de um evento já cadastrado.
- Nota fixa: "A receita mostrada é o valor de face dos ingressos, sem descontos."

**Etapa 3 — Bar do evento:**
- Toggle: "Este evento terá bar próprio?" (Sim / Não). Se "Não", etapa encerra aqui, sem influenciar nenhum cálculo.
- Se "Sim":
  - Quantidade de cortesias (número) — cortesias não entram na receita de ingressos, mas contam como público presente para o cálculo do bar.
  - Consumo médio por pessoa (R$).
  - Custo total dos produtos do bar (R$) — valor informado pelo produtor, entra diretamente como despesa.
  - Margem bruta esperada do bar (%) — usada apenas como comparação/validação, não entra no cálculo do lucro (evita contar a mesma coisa duas vezes).
- Cálculos desta etapa:
  - Público presente (bar) = quantidade vendida total (soma da Etapa 2) + quantidade de cortesias.
  - Receita bruta do bar = Consumo médio por pessoa × Público presente (bar).
  - Lucro do bar = Receita bruta do bar − Custo total dos produtos do bar (valor real, usado no Resultado Financeiro).
  - Margem real calculada = Lucro do bar ÷ Receita bruta do bar (%) — exibida ao lado da margem esperada informada, para o produtor comparar.

**Etapa 4 — Outras receitas:**
- Patrocínios (R$).
- Camarotes / VIP (R$).
- Outras receitas (R$, campo livre).
- (Bar removido desta etapa — tratado integralmente na Etapa 3.)

**Etapa 5 — Custos fixos:**
- Aluguel do espaço (R$).
- Artistas / DJs / bandas — lista dinâmica ("+ Adicionar artista"): nome (referência) + cachê (R$) por linha; soma automática do total de cachês.
- Segurança — quantidade de seguranças (número) × custo por unidade (R$); total calculado automaticamente.
- Estrutura — som, luz, palco (R$).
- Equipe operacional — quantidade de pessoas (número) × custo por unidade (R$); total calculado automaticamente.
- Marketing e divulgação (R$).
- Decoração (R$).
- Outros custos fixos (R$, campo livre).
- Custos fixos totais = soma de todos os itens acima (usando os totais calculados de artistas, segurança e equipe).

**Etapa 6 — Custos variáveis (por pessoa presente):**
- Copos / kit de entrada (R$/pessoa).
- Seguro por pessoa (R$/pessoa).
- Outros variáveis por pessoa (R$, campo livre).
- Custo variável total = soma dos campos × quantidade total vendida (soma da Etapa 2).

---

**Resultado Financeiro (calculado ao vivo, sempre visível conforme rola a tela):**

- **Card de destaque (hero):** "Resultado estimado (Lucro/Prejuízo)" — valor grande, com badge "Projeção de lucro" (verde, var(--accent)) ou "Projeção de prejuízo" (vermelho, var(--error)) conforme o sinal do resultado. Tratamento visual de alto contraste (fundo escuro/destacado), mesmo no tema light.
- 3 cards de apoio: "Receita total" (ingressos + bar + outras receitas), "Custos totais" (fixos + bar + variáveis), "Margem" (% sobre receita total).
- Detalhamento tipo DRE (lista, não tabela):
  Receita de ingressos → (+) Receita bruta do bar (se houver) → (+) Outras receitas → (−) Custos fixos → (−) Custo do bar (se houver) → (−) Custos variáveis → **Lucro/Prejuízo** (linha final destacada).

**Painel do Bar (exibido apenas se "Este evento terá bar próprio?" = Sim):**
- Card "Receita bruta do bar"
- Card "Custo do bar" (valor informado)
- Card "Lucro do bar" (receita − custo)
- Comparação lado a lado: "Margem esperada" (informada) vs. "Margem real calculada" (a partir do custo informado)

**Ponto de Equilíbrio (dois números lado a lado — com e sem o bar):**
- "Ticket médio líquido atual" (R$) = receita de ingressos ÷ quantidade vendida total (Etapa 2) — "por ingresso vendido".
- **Sem considerar o bar:** ingressos mínimos = Custos fixos totais ÷ ticket médio. Exibir também "% da capacidade".
- **Considerando o bar** (só aparece se houver bar): ingressos mínimos = máximo entre 0 e (Custos fixos totais − Lucro do bar) ÷ ticket médio. Exibir também "% da capacidade". Deixar claro visualmente que este número já desconta a contribuição do bar.
- Barra de ocupação: 0% — marcador do ponto de equilíbrio (usar o "sem bar" como referência principal da barra, com o "com bar" indicado por um segundo marcador, se houver bar) — 100%, preenchimento até a ocupação atual estimada.

**Cenários de ocupação (4 cards, não 3) — apenas receita de ingressos, não inclui o bar:**
- 🔻 Pessimista — 50% da capacidade total.
- 🔹 Realista — 70% da capacidade total.
- 🔺 Otimista — 85% da capacidade total.
- ⬆️ Lotação total — 100% da capacidade total.
- Cada card: percentual + receita de ingressos projetada nesse cenário = ticket médio × (capacidade total × percentual do cenário). Nota pequena: "Os cenários consideram apenas a receita de ingressos — a receita do bar depende do público presente estimado na Etapa 3."
- Sem emojis de rosto ou paleta laranja/amarela — usar iconografia Lucide neutra (ex: TrendingDown, Minus, TrendingUp, Rocket) e indicador de cor sutil (borda superior ou lateral fina), consistente com o Design System.

Regra visível na tela (texto pequeno, var(--text-secondary)): "Esta ferramenta trabalha apenas com projeções — não usa nem altera dados reais de vendas."

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

**Mini dashboard da área (referência de estrutura: dashboard de recuperação de carrinho de ticketeiras do mercado, adaptado ao nosso Design System — ícones Lucide, cantos retos, sem ilustrações coloridas):**
- Seletor de período no topo do bloco, aplicado aos 4 cards: Últimas 24h / Últimas 72h / Última semana.
- Card "Vendas Recuperadas" (R$) — valor total das vendas que converteram após abandono, no período.
- Card "Ingressos Recuperados" — quantidade de ingressos gerados a partir de conversões pós-abandono.
- Card "Total de Abandonos" — quantidade de abandonos no período.
- Card "Taxa de Recuperação" (%) — Vendas Recuperadas ÷ Total de Abandonos.

**Modelos de mensagem para WhatsApp:**
- Seção com 2–3 modelos de mensagem sugeridos (ex: para quem não gerou Pix, para quem gerou Pix e não pagou), com variáveis substituíveis: {nome}, {evento}, {lote}.
- Cada modelo é editável diretamente na tela (texto livre).
- Botão "Restaurar padrão" por modelo — volta ao texto original sugerido pelo sistema, descartando a edição.
- Ao clicar em "Abrir WhatsApp" numa linha da listagem, a mensagem é pré-preenchida usando o modelo correspondente (com as variáveis já substituídas pelos dados daquele contato).

**Ações disponíveis:**
- Visualizar lista de abandonos por evento.
- Acesso rápido ao WhatsApp do potencial comprador, com mensagem pré-preenchida (modelo editável).
- Status: "Não contactado" / "Contactado" / "Convertido" — apenas 3, ambos com transição automática, sem ação manual de status. Um registro que permanece em "Contactado" sem nunca virar "Convertido" já é, por si só, a informação de "contactado e não converteu" — não precisa de um quarto status para isso.

**Lógica de mudança de status:**
- **Contactado:** automático — muda assim que o admin clica em "Abrir WhatsApp" para aquele registro.
- **Convertido:** automático — sistema cruza WhatsApp + evento do abandono com vendas pagas existentes; havendo correspondência, o status muda sozinho. Nesta fase (sem Supabase), a comparação é feita contra os dados mockados de Vendas já implementados, como demonstração da lógica; ao conectar o banco real, a mesma regra passa a rodar como consulta/trigger no backend.
- Sem status manual, sem dropdown, sem botão de ajuste — o ciclo é inteiramente automático.

**Layout da listagem (registro em linha única):**
- Colunas: nome, WhatsApp, evento, tipo de abandono, data/hora, status, ações. Coluna "Lote de interesse" removida para melhor aproveitamento de espaço na linha.
- Cada linha ocupa uma única linha de altura — sem quebra de texto/badge em múltiplas linhas. Nomes longos truncam com reticências (tooltip com o nome completo ao passar o mouse).
- Botão "Abrir WhatsApp" reduzido a ícone (sem texto), com tooltip.
- Status representado apenas pela bolinha colorida na coluna (sem label de texto ao lado — a legenda acima do card já explica o significado de cada cor): cinza = Não contactado, amarelo = Contactado, verde = Convertido.
- Legenda discreta das cores (3 itens agora, não 4): por fora do card da tabela, acima dele, alinhada ao canto direito.

**Dashboard principal:** card de resumo de abandonos nas últimas 24h visível no Dashboard geral do sistema (já implementado).

---

### 8.14 Sorteios (`/admin/sorteios`)

- Criar sorteio: nome do prêmio, evento vinculado, descrição.
- Participantes: adicionar individual (nome + WhatsApp) ou em lote.
- Realizar sorteio: animação visual, exibição do vencedor, registro com data/hora.
- Possibilidade de novo sorteio (substitui anterior).

---

### 8.15 Usuários (`/admin/usuarios`)

**Acesso restrito a Admin** — Colaborador não vê esta área.

**Listagem:**
- Tabela: nome, e-mail, papel (badge: Admin / Colaborador), data de convite/entrada, status (Ativo / Convite pendente).
- Botão "+ Convidar Usuário" (mesmo padrão de botão curto já usado no sistema).

**Painel lateral: Convidar usuário** (mesmo padrão visual dos demais painéis — etapa única, sem steps):
- Nome completo
- E-mail
- Papel (seleção entre 3 cards: Admin, Colaborador, Operador de Check-in — com breve descrição de cada um visível na escolha — ver tabela de permissões abaixo)
- Botão "Enviar convite"

**Remover usuário:** ação por linha, com modal de confirmação.

**Tabela de permissões por papel:**

| Área | Admin | Colaborador | Operador de Check-in |
|---|---|---|---|
| Dashboard | Total | Sem acesso | Sem acesso |
| Eventos | Total | Sem acesso | Sem acesso |
| Vendas | Total | Somente leitura | Sem acesso |
| Cortesias | Total | Sem acesso | Sem acesso |
| Clientes | Total | Sem acesso | Sem acesso |
| Check-in | Total | Total | Total (único acesso) |
| Histórico Financeiro | Total | Sem acesso | Sem acesso |
| Ferramentas | Total | Sem acesso | Sem acesso |
| Relatórios | Total | Sem acesso | Sem acesso |
| Usuários | Total | Sem acesso | Sem acesso |
| Configurações | Total | Sem acesso | Sem acesso |

- Itens sem acesso não aparecem no menu lateral do Colaborador — não é bloqueio de rota apenas, é ocultação do item.
- Operador de Check-in não tem menu lateral nenhum — nunca renderiza o `AdminLayout`. Login redireciona direto para `/checkin`; qualquer outra rota redireciona de volta.
- Vendas em modo Colaborador: lista e detalhe visíveis, sem botão "+ Nova Venda", sem ação de cancelar venda, sem exportar.

---

### 8.16 Configurações (`/admin/configuracoes`)

Layout: menu lateral secundário interno (estilo macOS System Preferences) com as seções abaixo; cada uma é uma tela própria, não abas.

Seções:
- **Organização:** nome, logo, dados de contato.
- **Mercado Pago:** card de status da integração (Conectado / Não configurado / Requer atenção) + botão para abrir o assistente guiado (ver 8.17). O status fica visível aqui sem precisar entrar no assistente.
- **Design:**
  - Seleção do tema de cor de destaque — Verde neon (padrão), Azul neon, Roxo neon, Vermelho neon. Independente do tema Light/Dark (que continua em Preferências).
  - Seleção do estilo de cantos — Retos (padrão) ou Arredondados. Ver DESIGN-SYSTEM.md para os dois conjuntos de valores.
  - Ambas as trocas aplicam em tempo real, usando variáveis já definidas — nenhuma cor ou raio fixo depende de reescrever componentes.
- **Preferências:** tema padrão da interface (Light/Dark); unificar ou separar listas de PDF de Vendas e Cortesias (impressão de check-in).
- **Backup de dados:** exportar todos os dados da organização em JSON ou CSV.

---

### 8.17 Assistente guiado — Configurar Mercado Pago (`/admin/configuracoes/mercado-pago`)

Página própria (não painel lateral — conteúdo denso demais). Estrutura de duas colunas: lista de etapas fixa à esquerda, conteúdo da etapa atual à direita.

**Cabeçalho da página:**
- Botão "Voltar" (retorna para Configurações)
- Título "Configurar Mercado Pago" + subtítulo "Assistente guiado — configure em 5 etapas"
- Badge no canto superior direito indicando o ambiente ativo: "Ambiente: Produção" ou "Ambiente: Sandbox"

**Barra de progresso** (abaixo do cabeçalho, largura total):
- Label "Progresso da configuração" + contador "X de 5" alinhado à direita
- Barra preenchida (var(--accent))

**Coluna esquerda — lista de etapas (não linear, clicável):**
1. Ambiente
2. Aplicação MP
3. Credenciais
4. Webhook
5. Pagamento teste

Cada etapa: ícone + nome. Etapa concluída = ícone de check verde. Etapa atual = destaque (fundo var(--accent-muted), texto var(--accent-text)). Etapas futuras = tom neutro. Todas as etapas já validadas são clicáveis a qualquer momento, para permitir revisar/corrigir sem refazer o fluxo inteiro.

**Coluna direita — conteúdo de cada etapa:**

**Etapa 1 — Ambiente**
- Explicação curta: "Comece em Sandbox para testar sem usar dinheiro real."
- Dois cards de opção (seleção única, estilo rádio-card, não radio button pequeno):
  - "Sandbox (teste)" — "Ambiente simulado. Credenciais começam com TEST-. Nenhum dinheiro é movimentado. Ideal para configurar e validar."
  - "Produção" — "Ambiente real. Credenciais começam com APP_USR-. Pagamentos reais são processados."
- Badge "Validado" quando a etapa está completa
- Botão "Próximo"

**Etapa 2 — Aplicação MP**
- Explicação: "É a 'conta técnica' que dá acesso às credenciais e ao webhook."
- Passo a passo numerado: acessar painel de desenvolvedores do MP (link externo) → criar aplicação → escolher "Pagamentos online" → marcar "Pagamentos com QR Code" ou "Checkout API / PIX" → aceitar termos e finalizar
- Aviso: "Já tem uma aplicação? Pode usar a existente — apenas selecione ela no painel para ver as credenciais."
- Botões "Voltar" e "Já criei, próximo"

**Etapa 3 — Credenciais**
- Explicação: "Copie as credenciais do painel para o TicketFlow."
- Título dinâmico conforme ambiente escolhido na Etapa 1: "Credenciais (Produção)" ou "Credenciais (Sandbox)".
- Bloco de ajuda: "Onde encontrar? No painel MP → sua aplicação → menu lateral Credenciais → aba Credenciais de [ambiente]"
- Campo Public Key (input + botão "Salvar" individual)
- Campo Access Token (sensível — armazenado cifrado; se já salvo, mostrar indicador "Salvo — termina em ...XXXX. Preencha novamente só se quiser substituir." + botão "Salvar" individual)
- **Credenciais são armazenadas separadamente por ambiente** — trocar entre Sandbox e Produção na Etapa 1 não sobrescreve nem apaga as credenciais do outro ambiente já salvas.
- Botão "Testar credenciais" (largura total, destaque)
- Botões "Voltar" e "Próximo"

**Etapa 4 — Webhook**
- Explicação: "Notificação automática quando um Pix é pago."
- Texto explicativo: "O Mercado Pago avisa o TicketFlow por essa URL sempre que um pagamento muda de status. Sem isso, você teria que aprovar vendas manualmente."
- Campo somente-leitura com a URL do webhook + botão de copiar. **Enquanto o Supabase não estiver conectado ao projeto, este campo exibe uma mensagem clara em vez de URL falsa:** "Conecte o Supabase ao projeto para gerar a URL do webhook automaticamente." — nunca simular uma URL que não existe de verdade.
- Passo a passo numerado: painel MP → aplicação → menu Webhooks → Configurar notificações → aba Modo Produção/Teste → colar URL em "URL de notificações" → marcar evento "Pagamentos (payment)" → salvar e copiar a Chave secreta gerada
- Campo Webhook Secret (sensível, cifrado, mesmo padrão de "salvo — termina em..." do Access Token)
- Botão "Testar Webhook"
- Botões "Voltar" e "Próximo"

**Etapa 5 — Pagamento de teste**
- Explicação: "Um Pix de R$ 0,01 valida o fluxo ponta a ponta."
- Nota: "Em Produção, pague o QR code pelo app do seu banco (será um centavo real)."
- Badge de status: "Pendente" / "Aguardando pagamento" / "Confirmado"
- Botão "Criar PIX de teste" (destaque, largura total)
- Botão "Atualizar status" (verifica se o Pix de teste foi confirmado)
- Botão "Voltar" — ao confirmar o pagamento de teste, a integração é marcada como ativa e o assistente pode ser fechado

**Regra de segurança:** Access Token e Webhook Secret nunca são exibidos em texto completo após salvos — apenas indicador de que existem, com os últimos dígitos visíveis para conferência.

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

- **Frontend:** React + TanStack Start + TanStack Router + TypeScript. (Divergência do template padrão do Lovable em relação ao React Router originalmente documentado — confirmado e aceito em 12/08/2026. TanStack Start é full-stack, com suporte a SSR.)
- **UI:** Tailwind CSS v4 + shadcn/ui + Design System próprio (DESIGN-SYSTEM.md).
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

## 13.1 Segurança e integridade de vendas (aplicar no desenho do backend)

Decisão registrada para quando o schema real for construído — não depende de tela, é regra de banco/backend:

- Nenhuma escrita direta nas tabelas `sales`/`tickets` — toda criação e mudança de status passa por funções `SECURITY DEFINER` controladas (RLS ativo em todas as tabelas de negócio).
- Toda venda carrega o registro de como foi confirmada: origem `ticketflow` exige validação de assinatura HMAC do webhook do Mercado Pago; origem `manual` registra o usuário admin responsável pelo lançamento (rastreabilidade); origem `importado` registra a plataforma de origem.
- Limite de tentativas no checkout público (rate limiting) para evitar geração em massa de vendas pendentes por script/bot.

## 14. Backlog (documentado, não implementado)

- Integração Sympla via API (quando disponível).
- Comparativo previsto × realizado (Simulador vs. Histórico Financeiro).
- Padrões de comportamento de clientes (compra antecipada, compra em grupo, frequência).
- Notificações (e-mail / WhatsApp) para compradores.
- Múltiplos temas de cor (azul, roxo, vermelho neon).
- App mobile nativo (PWA como primeiro passo).
- Módulo de billing / assinaturas automatizado.
