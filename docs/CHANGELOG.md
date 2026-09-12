# TicketFlow — CHANGELOG

Registro cronológico de decisões, funcionalidades e ajustes do projeto. Mantido a cada prompt concluído.

---

## Julho/2026

### Fundação
- Definido stack: React + Vite + TypeScript, Tailwind + shadcn/ui, Supabase (a conectar), Lucide Icons.
- Criado Design System v1.0: paleta light/dark, tipografia Geist, espaçamento, componentes base.
- Estrutura de rotas completa definida (pública, cliente, admin, superadmin).
- Login de teste implementado (sem backend) para permitir navegação durante o desenvolvimento.

### Dashboard
- Cards de métricas: Receita Total, Ingressos Vendidos, Aguardando Pagamento (Gauge Chart), Visitas na Página.
- Seletor de contexto: Visão Geral / evento(s) ativo(s).
- Gráfico de vendas diárias (linha fina, suavizada) e pico de vendas por horário.
- Lista de últimas vendas em tempo real (mockado).
- Ajustes: Gauge Chart corrigido para formato meia-lua (não círculo completo); altura dos cards revisada.

### Eventos
- Listagem com filtros por status e paginação configurável.
- Criação em formato Wizard (Steps): Informações → Modelo de venda (lotes ou preço único) → Configuração → Revisão.
- Decisão de arquitetura: "preço único" é tratado internamente como um lote único ("Ingresso único") — sem caminho de código separado.
- Regras de virada de lote: automática por data/horário, automática por esgotamento de estoque, e "Virada Expressa" manual (com confirmação) na tela de detalhe do evento.
- Encerramento de evento: manual (comando do produtor), nunca automático por data. Não trava o Histórico Financeiro após encerrado.

### Vendas
- Listagem com abas de origem (TicketFlow / Manual / Importadas — Bilheteria removida desta área, ver Histórico Financeiro).
- Regra global: Comprador ≠ Participante — campos de nome de participante gerados dinamicamente conforme quantidade, em toda venda com mais de 1 ingresso.
- Lançamento manual convertido de modal centralizado para painel lateral (Sheet) com steps: Cliente → Ingressos → Confirmar.
- Geração de lista em PDF para check-in manual (ordem alfabética, checkbox, espaçamento compacto).
- Mini dashboard da área: Total vendido, Ingressos vendidos, Ticket médio, Aguardando pagamento.
- Botão renomeado de "Lançar venda manual" para "+ Nova Venda".

### Cortesias
- Simplificado deliberadamente em relação a Vendas: sem WhatsApp, sem distinção comprador/participante — apenas nome do convidado.
- Painel único de emissão com 3 formas de adicionar nome: digitar (Enter adiciona e mantém foco), colar lista, importar arquivo .txt — todas alimentando a mesma lista acumulada.
- Mini dashboard simplificado: Total de cortesias, Check-ins de cortesias.
- Geração de PDF no mesmo padrão de Vendas.
- Correção: tabela padronizada para seguir exatamente os parâmetros visuais de Vendas (fonte, badges, espaçamento).

### Clientes
- Listagem com colunas ordenáveis (indexáveis), incluindo por quantidade de ingressos — substitui a necessidade de um componente de ranking dedicado.
- Ranking "Top 10 Clientes" (dock lateral) especificado e depois removido/substituído pela ordenação de colunas.
- Adicionadas colunas: data de cadastro, botão de copiar WhatsApp; exclusão de cliente com confirmação.
- Botão "+ Novo Cliente" com painel lateral de etapa única (sem steps).
- Card "Novos Clientes" com seletor de período (7/15/30 dias).

### Padronização visual (transversal)
- Cantos retos definidos como padrão do sistema em todos os componentes (exceto elementos circulares funcionais: avatares, indicadores).
- Tipografia dos cards padronizada em todas as áreas.
- Sidebar e header do admin corrigidos para altura fixa (100vh), sem rolar junto com o conteúdo — só a área de conteúdo principal rola.
- Menu lateral reorganizado: Simulador de Evento, Remarketing e Sorteios agrupados em um hub único "Ferramentas" (grid de cards), reduzindo itens fixos do menu.
- Modal de Nova Venda e futuros modais complexos passam a usar o padrão de painel lateral (Sheet) com steps, ao invés de modal centralizado — reservado para fluxos com 2+ etapas ou muitos campos.

### Configurações
- Estrutura definida: Organização, Mercado Pago, Preferências, Backup de Dados — em telas separadas (menu lateral secundário, estilo macOS System Preferences).
- Assistente guiado de configuração do Mercado Pago (5 etapas): Ambiente → Aplicação MP → Credenciais → Webhook → Pagamento de teste. Baseado na versão validada do TicketFlow anterior, adaptado ao Design System atual.
- Credenciais armazenadas separadamente por ambiente (Sandbox / Produção).
- Etapas de Webhook e Pagamento de teste sinalizam claramente a dependência da conexão futura com Supabase — sem simular dados de infraestrutura inexistente.

---

## Setembro/2026

### Correção crítica — Geração de Pix no Checkout
- Bug: checkout público não coletava e-mail do comprador (campo `buyer_email` sempre enviado vazio). A API do Mercado Pago exige e-mail válido do pagador para gerar qualquer pagamento, incluindo Pix — a venda era criada normalmente, mas a geração do Pix falhava sempre depois, com o cliente vendo "Erro ao gerar o Pix" e a venda ficando pendente no sistema.
- Correção: adicionado campo obrigatório de e-mail no formulário de checkout (`CheckoutPage.tsx`), com validação de formato, e o valor real passa a ser enviado para `createPendingSale` e, por consequência, para a criação do pagamento Pix.
- Arquivo alterado: `src/pages/CheckoutPage.tsx`.

### Correção crítica — Divergência de `checkin_ticket` entre repositório e produção
- Bug: a migration mais recente que redefinia `checkin_ticket` (`20260903050000_harden_admin_operations.sql`) usava colunas (`ticket_id`, `checked_by`) que não existem na tabela `checkin_log`. A função realmente ativa em produção era uma versão anterior, aplicada fora desse histórico. Um banco recriado do zero a partir das migrations instalaria a versão quebrada e o check-in do evento pararia de funcionar.
- Correção: nova migration (`20260905231500_restore_checkin_ticket_correct_definition.sql`) recria a função com a definição real e funcional hoje em produção. Nenhuma mudança de comportamento — só reconciliação entre repositório e banco.
- Arquivo criado: `supabase/migrations/20260905231500_restore_checkin_ticket_correct_definition.sql`.

### PWA — Área do Cliente instalável
- A Área do Cliente e as telas públicas de compra passam a ser instaláveis como app (Android/Chrome com prompt nativo; iOS/Safari com instrução guiada "Compartilhar → Adicionar à Tela de Início"). Abre em modo `standalone` (sem barra do navegador).
- Reaproveitado o manifest e o Service Worker que já existiam no projeto (sem cache, só habilitam a instalação) — estavam prontos, mas o registro do Service Worker tinha sido desativado de propósito em 29/08/2026 após bugs de carregamento pós-deploy. Religado com `skipWaiting`/`clients.claim`, que substitui automaticamente qualquer versão antiga/problemática ainda ativa no navegador de algum cliente.
- Botão "Instalar aplicativo" (componente `InstallAppButton`) adicionado em 3 pontos: Início da Área do Cliente, visualização de um ingresso, e confirmação de compra. Discreto, dispensável, nunca aparece no Admin.
- Corrigido de passagem: o ícone `icon-192x192.png` estava salvo internamente como 512×512 (tamanho errado dentro do arquivo).
- Arquivos novos: `src/hooks/use-pwa-install.ts`, `src/components/cliente/InstallAppButton.tsx`.
- Arquivos alterados: `public/sw.js`, `public/icons/icon-192x192.png`, `src/routes/__root.tsx`, `src/routes/cliente.index.tsx`, `src/pages/TicketDetailPage.tsx`, `src/pages/ConfirmationPage.tsx`.
- Fora de escopo (deliberado): notificação push, uso offline, publicação nas lojas Apple/Google — ver `docs/PROJECT-MAP.md` §15 para detalhe técnico completo.

### Visitante sem conta não vê mais o menu do módulo Cliente
- Antes, qualquer pessoa nas telas públicas de compra (evento, checkout, confirmação, ingresso) via o menu hambúrguer com links para Início/Eventos/Ingressos/Pontos/Perfil — todos exigem login, então clicar levava direto a uma tela de login, sem aviso.
- Agora, sem sessão: o botão de menu some e aparece um botão "Criar conta" no lugar (leva para `/cadastro`). Com sessão: nada muda. Automático via `useAuth()`, vale pra qualquer tela que use `MobileLayout`, sem precisar marcar rota por rota.
- Objetivo: não criar atrito pra quem só quer comprar um ingresso, mas induzir a criação de conta pra quem quiser acesso completo ao módulo.
- Arquivos alterados: `src/components/layouts/MobileLayout.tsx`, `src/pages/SignupPage.tsx` (nova prop `hideAuthCta`, usada só ali).

### Clientes — métricas no dashboard administrativo
- Adicionados dois cards no topo da página Admin → Clientes: **Clientes cadastrados** e **Idade média**.
- "Clientes cadastrados" considera todos os clientes retornados pela base da organização.
- "Idade média" ignora clientes sem idade válida e qualquer idade igual a `0`; o cálculo considera somente valores numéricos maiores que zero.
- A média é exibida com uma casa decimal e formatação brasileira.
- Arquivo alterado: `src/pages/admin/ClientsListPage.tsx`.

### Reserva de ingresso presa por até 1 hora em compra abandonada
- Diego reportou: clientes não conseguiam comprar (botão desabilitado, "R$ 0,00") mesmo com ingressos ainda não vendidos de verdade — precisava editar a quantidade manualmente pra destravar.
- Causa raiz 1: o tempo de reserva (`organizations.pending_sale_expiration_minutes`) estava em 60 minutos. Toda compra iniciada e não paga prendia o estoque por até 1h antes do job (`expire_pending_sales_job`, já rodava certinho a cada minuto) devolver. Ajustado para 15 minutos — tempo de sobra pra quem realmente vai pagar via Pix.
- Causa raiz 2 (bug real, corrigido em código): `src/pages/PublicEventPage.tsx` não tratava o caso de "nenhum lote disponível" — em vez de avisar "esgotado", mostrava a seção de seleção vazia e o botão de compra com "R$ 0,00" desabilitado, sem nenhuma explicação. Agora mostra "Ingressos esgotados no momento" com aviso de que pode ser temporário.
- Decisão registrada: não removemos a reserva de estoque (só dar baixa após pagamento confirmado, como cogitado inicialmente) porque isso abriria brecha pra venda duplicada em ingressos com pouca sobra — mantivemos a reserva, só encurtamos a janela.

### Admin agora pode editar o cadastro de um cliente
- Objetivo: corrigir erros de digitação do próprio cliente (e-mail errado, ano de nascimento errado, etc.) sem precisar excluir e recriar o cadastro.
- Botão "Editar cadastro" na ficha do cliente (`/admin/clientes/:id`), abre painel com Nome, WhatsApp, E-mail, Cidade, Data de nascimento, Instagram e Sexo — mesmos campos que o próprio cliente edita no perfil dele.
- Achado durante a implementação: a função do banco (`update_customer`) e o hook (`useUpdateCustomer`) já existiam prontos, com checagem de permissão (só admin da mesma organização pode editar cliente que não é ele mesmo) — só faltava a tela. Nenhuma mudança de banco foi necessária.
- Arquivos: `src/components/admin/clients/EditClientPanel.tsx` (novo), `src/pages/admin/ClientDetailPage.tsx`, `src/lib/customers-queries.ts` (hook passou a enviar também cidade/instagram/sexo, que a função já suportava).

### "Organização não encontrada" travava Dashboard/Vendas/Clientes/Usuários/Configurações numa aba
- Diego reportou: às vezes, numa aba/perfil do navegador, todas essas telas paravam de mostrar dados com a mensagem "Organização não encontrada" — só resolvia trocando de conta. A tela de Eventos continuava funcionando normal.
- Causa raiz: em `src/lib/auth-context.tsx`, as consultas que buscam o papel do usuário e a organização (rodadas uma vez ao logar/revalidar sessão) ignoravam qualquer erro de consulta — se uma falhasse por instabilidade momentânea (ex: token passando por renovação), o código assumia silenciosamente "organização não existe" e essa informação errada ficava presa na sessão daquela aba até um recarregamento com sorte de dar certo. "Eventos" não tem esse problema por não depender dessa informação.
- Corrigido: as duas consultas agora tentam de novo automaticamente uma vez se falharem, em vez de desistir. Também corrigidos 2 outros lugares (`src/lib/sales-queries.ts`) que tinham o mesmo padrão de ignorar erro de consulta.
- O botão "Tentar novamente" do Dashboard agora também reconfirma a sessão (`refreshProfile()`) antes de repetir as consultas — antes só repetia as mesmas consultas já quebradas, então nunca resolvia sozinho.
- Arquivos: `src/lib/auth-context.tsx`, `src/lib/sales-queries.ts`, `src/pages/AdminDashboard.tsx`.

### Ingresso e QR Code disponíveis offline (V1)
- Objetivo: cliente conseguir mostrar o ingresso/QR Code na portaria mesmo sem internet.
- Auditoria prévia (pedida por Diego) encontrou: a rota real usada pelo menu do cliente é `/cliente/ingressos`, não `/meus-ingressos` (essa é uma tela separada, de busca por código, sem exigir login) — `/cliente/ingressos` já tinha um fallback offline funcional para a *lista*; faltava só na tela do ingresso individual (`/ingresso/$ticket_code`), que é a que ambas as listas abrem.
- O QR Code não depende de nada online — é gerado 100% no navegador a partir do `ticket_code` (biblioteca `qrcode.react`), então bastou garantir que o `ticket_code` e os dados de exibição estivessem salvos localmente.
- `useCustomerSales` (já salvava ingressos no IndexedDB) passou a incluir também nome do lote e da produtora, que faltavam para a tela do ingresso individual.
- `TicketDetailPage` (tela do ingresso) e `MyTicketsPage` (`/meus-ingressos`) ganharam o mesmo fallback offline que `/cliente/ingressos` já tinha, com aviso "Offline"/"Disponível offline neste dispositivo".
- Isso é só uma cópia local para EXIBIÇÃO — o servidor continua sendo a única autoridade sobre a validade do ingresso; nada muda em autenticação, Mercado Pago, webhook, geração de ingresso ou validação de check-in.
- **Limite encontrado, decisão pendente:** o Service Worker atual não guarda nada em cache (de propósito, ver seção PWA acima). Isso significa que abrir o app do zero (ícone, sem tê-lo aberto recentemente) totalmente offline pode falhar antes mesmo do React carregar. Andando dentro do app (tocar em "Ingressos" → tocar no ingresso) funciona normalmente, porque não baixa nada novo da rede nessa navegação. Resolver o caso "abrir do zero, offline" exigiria voltar a interceptar requisições no Service Worker — a mesma área que já causou um incidente em produção antes. Não implementado nesta v1 sem confirmação explícita.
- Arquivos: `src/lib/customer-queries.ts`, `src/pages/TicketDetailPage.tsx`, `src/pages/MyTicketsPage.tsx`.

### Painel de Remarketing (leads em potencial)
- Objetivo: Diego conseguir ver quem gerou Pix e não pagou (cadastrado ou visitante), pra contato manual (WhatsApp). Achado durante a conversa: já existia um card "Remarketing" na tela de Ferramentas apontando para `/admin/remarketing` — a página em si nunca tinha sido criada (link quebrado).
- Somente leitura: lista vendas com status `pendente` ou `expirado` (exclui cortesias). Não envia nada sozinho — cada linha tem um botão que abre o WhatsApp do comprador pra contato manual.
- Filtro por evento, métricas resumidas no topo (total de leads, aguardando pagamento, expirados, valor potencial somado).
- Não toca em checkout, Pix, webhook, autenticação ou geração de ingresso — só lê a tabela `sales`, do mesmo jeito que a tela de Vendas já lê.
- Arquivos: `src/lib/remarketing-queries.ts` (novo), `src/pages/admin/RemarketingPage.tsx` (novo), `src/routes/admin.remarketing.tsx` (novo).

### Remarketing v1.1: não mostra quem já comprou depois + mensagem pronta no WhatsApp
- Diego notou que gente que teve dificuldade na hora de comprar, mas comprou depois, continuava aparecendo na lista.
- Corrigido: agora busca também as vendas pagas do mesmo evento e tira da lista quem já converteu, cruzando por WhatsApp (funciona pra visitante sem cadastro) e por `customer_id` (quando existe).
- Botão de WhatsApp agora abre com mensagem pronta: "Oi [primeiro nome]! Seus ingressos pro evento [evento] ainda estão te esperando! Bora!? Vou deixar aqui o link novamente pra você solicitar sua compra novamente: [link do evento]". Diego ainda revisa e manda manualmente — nada é enviado sozinho.
- Nota de segurança encontrada de passagem (não é deste código, é pré-existente e já registrada como resolvida — AUD-018): dois arquivos usam `ticketflow2.lovable.app` como *fallback* caso a variável `VITE_SITE_URL` não esteja configurada na Vercel. Não mexi nisso agora — fora do escopo desta tarefa — mas como o site antigo será despublicado, vale conferir se `VITE_SITE_URL` está mesmo configurada na Vercel, se não já estiver.
- Arquivos: `src/lib/remarketing-queries.ts`, `src/pages/admin/RemarketingPage.tsx`.

### Data de nascimento: 3 seletores (Dia/Mês/Ano) no lugar do calendário nativo
- Diego reportou (com print) que no Perfil (mobile), o campo "Data de Nascimento" aparecia como uma caixa pequena, desalinhada, na mesma linha do rótulo. Causa: bug conhecido do Safari/iOS, que ignora `width: 100%` em `<input type="date">` vazio — mesma classe de bug já visto nos ajustes de compatibilidade iOS 15 anteriores.
- Diego trouxe uma sugestão de solução (componente de calendário com biblioteca `@ark-ui/react`). Optamos por não usar: exigiria uma dependência nova nunca usada no projeto, estilo totalmente fora do sistema de temas (precisaria reescrever do zero mesmo assim), e um calendário completo tende a ser **mais** lento pra digitar uma data de nascimento do que escolher direto dia/mês/ano — o oposto do "sem barreiras" pedido.
- Solução escolhida (confirmada com Diego): 3 seletores simples — Dia, Mês, Ano — sem biblioteca nova, com o mesmo visual dos outros campos. Ajusta sozinho o dia se o mês escolhido tiver menos dias (ex: 31 → fevereiro vira 28/29).
- Aplicado nos dois lugares que pedem data de nascimento: Perfil (`/cliente/perfil`) e Cadastro (`/cadastro`).
- Arquivos: `src/components/ui/birthdate-select.tsx` (novo), `src/routes/cliente.perfil.tsx`, `src/pages/SignupPage.tsx`.

---

## Pendências conhecidas

> **Nota (06/09/2026, Claude 2):** as três afirmações abaixo são do início do projeto (Julho/2026) e ficaram desatualizadas — mantidas aqui só como registro histórico, nunca apagadas (ver `docs/AUDITORIA.md` para o estado real e atual de cada item).

- ~~Conexão real com Supabase (schema, autenticação, Edge Functions) ainda não realizada neste projeto novo.~~ **Desatualizado:** Supabase está conectado e em produção desde Agosto/2026 (projeto `ywcdopjqfhisopipqxgq`), com schema completo, autenticação, RLS e dezenas de funções `SECURITY DEFINER` versionadas em `supabase/migrations`.
- ~~Integração real com Mercado Pago depende da conexão com Supabase.~~ **Desatualizado:** a integração com Mercado Pago está implementada e ativa (checkout, Pix, webhook, confirmação de pagamento) — ver `src/lib/mp/` e `src/routes/api/public/mp/webhook.ts`.
- ~~ARQUITETURA.md será reescrito somente após a conexão real com o banco de dados.~~ **Desatualizado:** o arquivo `docs/ARQUITETURA.md` nunca chegou a ser criado; `docs/PROJECT-MAP.md` cumpre hoje esse papel (índice operacional do projeto, mantido revalidado a cada auditoria).

### Estado real (06/09/2026)

Para o estado operacional atual — o que está funcionando, o que está pendente e por quê — a fonte de verdade é `docs/AUDITORIA.md`. Este changelog registra decisões de produto ao longo do tempo; `AUDITORIA.md` registra o estado técnico vivo (segurança, integridade de dados, performance).
