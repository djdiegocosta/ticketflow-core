# TicketFlow — Status de Auditoria e Refinamentos
**Última atualização:** 23/08/2026
**Como usar este documento:** histórico vivo de tudo que foi encontrado, corrigido ou decidido nas rodadas de auditoria/refinamento do projeto. Atualizado sempre que um SQL/prompt é confirmado como aplicado. Não substitui o TPS.md nem o DESIGN-SYSTEM.md (que descrevem o sistema como ele deve ser) — este documento é o registro de como ele chegou até lá.

Legenda: ✅ Aplicado e confirmado · ⏳ Aguardando teste/confirmação · 🔴 Pendente

---

## Segurança e integridade de vendas
- ✅ `confirm_sale_paid` e `create_locked_tickets` restritas a `service_role` — antes eram executáveis por qualquer visitante (permissão padrão do Postgres não revogada).
- ✅ Checkout público conectado ao Mercado Pago de verdade (Pix real, QR Code real) — antes usava um código Pix fixo/fake e um botão "Simular Pagamento Confirmado" visível para qualquer visitante.
- ✅ Tela de checkout passou a "escutar" o status da venda (polling) e avança sozinha para a confirmação quando o webhook confirma o pagamento — antes dependia só do botão de simulação removido.
- ✅ `create_pending_sale` bloqueia explicitamente a compra de lotes marcados como cortesia pelo checkout público.

## Conta de cliente / Área do Cliente
- ✅ Causa raiz encontrada e corrigida: nenhuma venda vinculava `sales.customer_id`, e contas criadas via `/cadastro` puro nunca geravam registro em `customers` — Área do Cliente inteira ficava vazia/quebrada para essas contas.
- ✅ Decisão confirmada: um comprador tem **um registro de cliente por organização** (não uma conta global única), refletindo o modelo de banco já existente.
- ✅ Função `get_or_create_customer(organization_id)` criada — chamada ao entrar em `/cliente`, resolve a organização via "última organização visitada" (guardada em localStorage ao visitar a página pública de um evento) com fallback para organização única do sistema.
- ✅ Autocura para contas já quebradas antes da correção (ex.: conta de teste "Cliente Teste") — regularizam sozinhas no próximo acesso a `/cliente`, sem necessidade de ajuste manual no banco.
- ✅ Bug do status do ingresso (comparava valor traduzido "Válido"/"Utilizado" contra o valor cru do banco "valido"/"utilizado") corrigido em `TicketDetailPage.tsx` e `cliente.ingressos.tsx` — todo ingresso aparecia com cor de erro, independente do status real.
- ✅ Tela inicial do cliente simplificada: saudação fixa "Seja Bem Vindo!", card de "Próximos eventos" removido.
- ✅ Nova aba "Eventos" (`/cliente/eventos`) no menu inferior — lista eventos ativos da organização, reaproveitando dados/imagem de capa já cadastrados no Admin.
- 🔴 Vínculo automático por WhatsApp com compras feitas como visitante antes da criação da conta — ainda não existe (vínculo só passou a acontecer daqui para frente).
- 🔴 Exclusão de conta pela interface — só é possível hoje via banco de dados.

## Configurações da organização
- ✅ Causa raiz: tabela `organizations` tinha política de segurança (RLS) de leitura, mas nenhuma de escrita — toda tentativa de salvar (nome, logo, cor, cantos) era bloqueada silenciosamente pelo banco, sem erro visível.
- ✅ Política de UPDATE criada para admin da própria organização.
- ✅ Bucket `organization-logos` criado com políticas de acesso (leitura pública, escrita restrita ao admin da própria organização) — upload de logo passou a persistir de verdade.
- ✅ Cor de destaque (`accent_color`) e estilo de cantos (`corner_style`) passaram a salvar em `organizations`, aplicados também nas páginas públicas do evento e na Área do Cliente (antes só existiam no `localStorage` do navegador de quem editava).
- ✅ Mutations de salvamento passaram a validar se a escrita realmente afetou alguma linha, evitando repetição do bug de "sucesso falso" no futuro.

## Vitrine (Ferramentas → Vitrine)
- ✅ Regra "um banner ativo por vez" movida para um trigger no banco (antes era um laço de atualizações no navegador, sem garantia contra concorrência).
- ✅ Exibição no cliente corrigida: proporção 4:5 (1080×1350px) sem cortar a imagem (antes 9:16 com corte), botão "Acessar" real abaixo do banner (antes um selo flutuando sobre a imagem).
- ✅ Limite de upload ajustado para 3MB, com aviso de proporção recomendada.
- ✅ Código órfão removido (`banners.functions.ts`, `banners.server.ts`, implementação duplicada não usada).
- ⏳ Painel de cadastro/edição de banner migrado para o componente `SidePanel` compartilhado — corrige tela não-rolável no celular com botão de ação inacessível. Aguardando confirmação de teste.

## Cortesias
- ✅ Lotes de cortesia agora são um tipo próprio (`ticket_batches.is_courtesy`), separados dos lotes pagos — preço travado em R$0, limite de quantidade opcional e agora realmente aplicado pelo banco (antes não descontava estoque nenhum).
- ✅ Emissão de cortesia diretamente pela ficha do cliente já cadastrado (`/admin/clientes/:id` → "+ Nova Cortesia"), vinculando `sales.customer_id` — a cortesia passa a aparecer em "Meus Ingressos" da pessoa.
- ✅ Cortesia nunca exibida como "Pago" nas telas administrativas, nunca contabilizada em faturamento nem elegível para reembolso — usando a marcação `is_courtesy` já existente no banco, sem precisar alterar o status interno da venda.

## Design System — conformidade
- ✅ Badge de status de Eventos (`EventsListPage`, `EditEventPage`) migrado para o componente `StatusPill` compartilhado — tinha 4 tratamentos visuais diferentes, um deles violando a regra explícita do Design System (fundo `--error` sólido com texto por cima).
- ✅ Ordem do menu lateral do admin corrigida ("Ferramentas" estava fora do lugar).
- ✅ Guardas de rota do Colaborador completadas em `admin.clientes.index/$id` e `admin.eventos.$id/novo` — estavam sem checagem de papel nenhuma, diferente do resto do sistema.

## Visual / identidade
- ✅ Fundo discreto e monocromático na tela de Login (imagem gerada pelo próprio usuário, sem risco de direitos autorais).
- 🔴 Refinamento visual do ingresso individual — em andamento, aguardando referências visuais do usuário.

---

## Rodada — Cidades, permissões do cliente, lotes e datas (22-23/08/2026)

### Confirmado por SQL/teste
- ✅ Causa raiz do bug de permissão do cliente identificada e corrigida: `events` e `ticket_batches` tinham política de leitura só para `anon`, nunca para `authenticated` — cliente logado nunca conseguia ver eventos/lotes. `sales` e `tickets` não tinham política nenhuma para o cliente ver o que é seu. `customers` não tinha política de UPDATE. As quatro corrigidas via SQL, confirmado por consulta de diagnóstico antes e depois.
- ✅ `update_customer` corrigida: exigia papel de admin até para o cliente editar o próprio perfil (bug confirmado via `pg_get_functiondef`) — agora aceita o dono do registro OU admin da organização. Parâmetros de Cidade/Instagram/Sexo passam a preservar valor atual quando não enviados (antes o painel admin apagava esses campos ao editar só nome/e-mail/WhatsApp).
- ✅ Bug "Data de Nascimento obrigatória mesmo sendo opcional" — causa raiz confirmada: campo vazio enviava texto vazio para um parâmetro do tipo `date` no banco, que rejeita a conversão. Corrigido enviando nulo.
- ✅ Banner da Vitrine não aparecendo — investigado e não era bug: banner ativo sem link de destino cadastrado (comportamento intencional do sistema).
- ✅ Função `get_available_batches` criada — lotes liberados em cascata (esgotamento ou data), cortesia sempre excluída.
- ✅ Segurança (achados apontados pelo linter do Lovable, resolvidos via SQL direto em vez de correção automática): bucket `event-images` sem validação de organização (corrigido); tabela `checkout_rate_limits` com RLS desabilitada, expondo WhatsApp/IP publicamente (corrigido); confirmado que não há outras tabelas sem RLS nem views com SECURITY DEFINER problemáticas.

### Entregue (prompt fornecido), aguardando confirmação de teste
- ⏳ Cidade restrita a municípios do RJ + opção "Outra" com texto livre.
- ⏳ Seletores nativos de data/hora substituídos por entrada manual com máscara, em todos os pontos do sistema (Criar/Editar Evento, Cadastro de Cliente, Perfil).
- ⏳ Conexão da tela pública/checkout com `get_available_batches` (a função já existe e funciona; falta confirmar que a tela para de listar todos os lotes juntos).
- ⏳ Bug do logo "TicketFlow" invisível no tema claro do Login — causa raiz encontrada (cor fixa em branco) e correção repassada.
- ⏳ Campo Sexo adicionado às telas de Cadastro e Perfil (coluna e função já prontas no banco desde rodada anterior).

## Rodada — Splash, Vitrine (2ª correção) e ícone do ingresso

- ✅ Causa raiz da splash reaparecendo a cada visita à aba Início: dois mecanismos de splash distintos no código, um correto (controlado por sessão) e um solto em `cliente.index.tsx`, sempre disparando. **Superado** pela mudança de abordagem — ver Skeleton Screen abaixo.
- ✅ Confirmado por print enviado pelo usuário: ajuste de altura flexível da Vitrine (preenchimento por espaço real disponível, não `vh` fixo) está funcionando em tela — usado como base para o refinamento seguinte.
- ⏳ Ajuste fino de espaçamento da Vitrine (moldura ao redor da imagem, botão com cantos quadrados) — prompt entregue nesta mesma rodada, incorporado à seção seguinte.
- ⏳ Link de "voltar" do ingresso apontando para página antiga (`/meus-ingressos`, sem menu) em vez de `/cliente/ingressos` — causa raiz confirmada, correção repassada.
- ⏳ Selo de status do ingresso sem texto visível (fundo sólido sem contraste) e espaçamento do cartão do ingresso empurrando o QR Code para fora da tela — causas confirmadas por print, correções repassadas.

## Rodada — Revisão de UX (5 Leis) + Pacote de refinamento visual

Baseado em revisão estruturada (Fitts, Hick, Miller, Doherty, Postel) sobre o código real do projeto.

### Entregue nesta rodada (3 prompts separados, aguardando teste)
- ⏳ **Skeleton Screen (Doherty):** troca da splash de tela cheia por blocos "esqueleto" no formato da tela real, limitados a 400ms via temporizador — não mais duração fixa de 2-3s nem dependente do tempo de carregamento real.
- ⏳ **Campo Inteligente (Postel/Fitts):** componente novo (`SmartField`) com ícone identificador discreto + confirmação visual (check verde) em tempo real, aplicado em Checkout, Cadastro e Perfil — inclui trim automático de e-mail e validação calculada a cada tecla, não só no envio.
- ⏳ **Ajuste fino de espaçamento + Vitrine (2ª correção):** card da Vitrine com imagem encostando nas bordas (sem moldura), botão herdando o arredondamento do card via `overflow-hidden` no container pai, revisão geral de paddings fora da escala de 4px.

### Achados da revisão, não endereçados ainda (registrados para priorização futura)
- 🔴 Sem feedback visual imediato ao clicar "Gerar Pix" no Checkout — gap perceptível (1-2s) entre o clique e o spinner aparecer.
- 🔴 Cabeçalho da Área do Cliente com 3 elementos comprimidos (logo clicável + tema + sair) — candidato a simplificação.
- 🔴 Código do ingresso sem agrupamento visual (ex: `TCK-8F3A2C` → `TCK-8F3A-2C`), QR Code sem instrução textual de "escaneie aqui".
- 🔴 Hit area de links de "voltar" pequena (ícone de 18px sem padding extra).
- 🔴 Busca de cliente por WhatsApp sem debounce — risco de excesso de requisições.

## Pendências conhecidas, não priorizadas ainda

- 🔴 Função `checkin_ticket` existe apenas no banco ao vivo, fora de controle de versão (mesmo padrão do bucket `event-images`, criado fora de migration).
- 🔴 Botão "Baixar todos os ingressos (PDF)" na tela de confirmação de compra não tem ação implementada.
- 🔴 Preferência de tema do cliente (claro/escuro) ainda salva só localmente no navegador, não na conta.
- 🔴 Foto de perfil do cliente — sem campo no banco, sem upload implementado.
- 🔴 App Android nativo para Check-in — intenção registrada, arquitetura já favorável (checagem centralizada em função de banco), não iniciado.
- 🔴 Regra fina de validação de nome (aviso não-bloqueante para nome composto comum de 2 palavras) — não implementada, mas concentrada num único ponto do código, fácil de aplicar quando priorizada.
- 🔴 Áreas Financeiro, Importação e Sorteios — banco de dados já preparado (tabelas existem), interface ainda é placeholder. Fora do escopo por decisão do usuário até segunda ordem.
