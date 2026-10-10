# TicketFlow — CHANGELOG

Registro cronológico de mudanças reais no projeto. **Mais recente no topo.**

**Reiniciado em 01/10/2026.** O changelog anterior parou de ser atualizado em
julho/2026 — mais de 460 commits depois ficaram sem registro, por agentes
diferentes trabalhando sem anotar. Reconstruir esse histórico perdido viraria
arqueologia de git, então não tentamos: o conteúdo antigo continua disponível
em `docs/CHANGELOG-ARQUIVO-ATE-2026-07.md`, e o histórico completo sempre
pode ser consultado em `git log`. **Daqui pra frente, toda mudança relevante
entra aqui — ver regra em `CLAUDE.md`.**

**Como registrar uma entrada nova:** data, categoria (🐛 correção /
🔒 segurança / ✨ funcionalidade / 🎨 design / 📝 documentação), descrição
em 1 linha, hash do commit entre parênteses. Adicionar sempre no topo.

---

## 10/10/2026 — Agente Claude (chat)

- 🐛 **Pagamento aprovado depois da reserva expirar não é mais descartado.**
  Incidente real: venda `1A494A29` (R$ 25,00). O Pix é criado sem prazo de
  validade, então o QR Code seguia pagável no Mercado Pago depois dos 15
  min da reserva; o webhook chamava `confirm_sale_paid`, que recusa venda
  expirada, e respondia "ok" sem registrar nada. Achado pela conferência
  de pagamentos. Regra de negócio: o prazo só dá urgência ao cliente, todo
  pagamento aprovado é bem-vindo. Agora, se `confirm_sale_paid` recusar, o
  webhook chama a nova `confirm_late_paid_sale`: com estoque, confirma,
  baixa o estoque de novo e segue o fluxo normal (ingresso, e-mail, push
  "pagamento após o prazo"); sem estoque, ou em qualquer estado inesperado,
  anota na venda e avisa a equipe por push (`late-paid-<id>`). Aviso
  repetido continua idempotente. Função só para `service_role`. Lógica de
  decisão em `src/lib/mp/late-payment.ts` (5 testes). Migration
  `20261010015324_confirm_late_paid_sale`.
- 🔓 **Reserva expirada não bloqueia mais quem quer pagar.** Regra de
  negócio: o prazo da reserva só dá urgência; todo pagamento é bem-vindo.
  (1) Tela de pagamento (`CheckoutPage`): ao expirar, o cliente não é mais
  expulso do Pix nem perde o QR Code (antes voltava ao formulário com
  "o estoque foi liberado"); aparece "Tempo de reserva encerrado, mas você
  ainda pode pagar. Se o ingresso esgotar, entraremos em contato." e a
  tela segue acompanhando o status até a confirmação. (2) `createMpPix`:
  em vez de recusar "Esta reserva expirou", chama a nova
  `reopen_expired_sale`: com estoque, reabre a reserva (baixa o estoque de
  novo e dá prazo novo); sem estoque, único bloqueio, com mensagem clara
  ("Os ingressos deste lote esgotaram..."). O Pix usa a venda como chave de
  idempotência no Mercado Pago, então pedir de novo devolve o mesmo QR
  Code (sem pagamento em dobro). Caminho normal (reserva dentro do prazo)
  não muda. Lógica em `src/lib/mp/reopen-sale.ts` (4 testes). Migration
  `reopen_expired_sale` (só `service_role`).
- 🧾 **Correção manual da venda `1A494A29`** (venda confirmada e ingresso
  `1A494A29-1` emitido direto no banco; e-mail não foi enviado). Na
  correção manual o estoque do lote não foi baixado de novo e foi acertado
  em seguida (2º Lote: 91 → 90). **Regra de estoque a lembrar:**
  `ticket_batches.quantity` é o estoque que RESTA; diminui ao criar a
  reserva e VOLTA quando a reserva expira (`expire_pending_sales_job`).
  Reativar venda expirada exige baixar o estoque de novo.

## 08/10/2026 — Agente Claude (chat)

- ✨ **Conferência de pagamentos com o Mercado Pago (só leitura).** Botão
  com ícone de atualizar no cabeçalho do painel, ao lado do sino de
  notificações (visível só para admin). Ao parar o mouse mostra uma dica
  curta; ao clicar abre uma janela que roda a conferência e mostra o
  resultado (antes era um cartão no dashboard). Compara as vendas dos últimos 7 dias que têm Pix gerado
  com o status real do pagamento no Mercado Pago e lista divergências:
  pago no MP e não confirmado, valor ou referência diferente, e venda
  confirmada mas estornada/contestada no MP. **Não altera nenhuma venda.**
  Limites: 120 vendas por conferência, 4 consultas em paralelo, 8 s por
  consulta. Lógica pura em `src/lib/mp/reconcile.ts` (9 testes); função de
  servidor em `src/lib/mp/reconcile.functions.ts` (exige admin da
  organização). Ainda não testada contra o Mercado Pago real.
- 🐛 **Alerta de falhas de Pix no painel: acabou o alarme falso.** Antes, se
  o cliente tentava de novo e o Pix saía, o registro da falha antiga
  mantinha a faixa vermelha por 24h. Agora só conta falha de venda que
  ficou sem Pix (`mp_payment_id` vazio). Mudança só na consulta do painel
  (`dashboard-queries.ts`); a geração do Pix não foi tocada. Regra
  extraída para `src/lib/pix-failures.ts` com 3 testes novos.

## 07/10/2026 — Agente Claude (chat)

- 🔒 **Security Advisor: fechado o acesso externo a 5 funções internas do
  banco.** `grant_xp_new_account`, `grant_xp_on_checkin`,
  `grant_xp_on_sale_paid` e `enforce_single_active_banner` (gatilhos que
  só o próprio banco dispara) deixam de ser chamáveis por visitantes e
  por usuários logados; `link_guest_purchases_to_current_customer` deixa
  de ser chamável por visitantes (segue liberada para logado). Nenhuma
  tela as chamava. Testado antes: gatilho continua disparando mesmo sem
  permissão de chamada. Alertas do Advisor: 60 → 52. Migration
  `20261008024752_revoke_internal_function_execute`.
- 🐛 **Zerados os 23 erros de typecheck** (antes: 3 importantes e 20
  avisos). Importantes: (1) Pix retomado sem imagem de QR Code agora
  mostra a instrução de usar o copia e cola, em vez de imagem quebrada;
  (2) e (3) criar e editar evento com data/horário inválido agora mostra
  "Data ou horário do evento inválido" em vez de falhar no banco com erro
  genérico. Os 20 avisos eram "valor possivelmente vazio" já tratado no
  código; ajustes sem mudança de comportamento. A tela de erro geral
  também passou a aceitar erro que não seja `Error`. (`d459aba`)
- ✨ **Typecheck no pipeline**: novo script `bun run typecheck`
  (`tsc --noEmit`) e passo "Typecheck" em `quality.yml`, antes dos
  testes. Motivo: o pipeline só rodava testes e build, então erros de
  tipo novos (inclusive os gerados pelo Lovable) passavam sem aviso.
  (`d459aba`)
## 06/10/2026 — Agente Claude

- 🎨 Ícones do app (PWA, favicon, ícone do iPhone) regenerados a partir do `ticketflow-icon.svg` (ingresso verde inclinado). Antes, as imagens ainda eram o desenho antigo (ingresso branco com QR). O logo dentro do sistema continua sendo o `Brandmark.tsx`, que acompanha o tema. O ícone do iPhone tem fundo cinza-escuro (#383B43), porque o iOS não aceita fundo transparente.
- ✨ Vendas → Nova Venda: agora dá para buscar um cliente cadastrado (por nome, WhatsApp ou e-mail) e lançar o ingresso direto na conta dele. "Novo comprador" continua disponível. Sem mudança no banco: usa a função `create_manual_sale` existente com os dados exatos do cadastro.
- 🐛 Pix: o identificador do dispositivo deixou de poder impedir a geração do Pix. O servidor descarta o valor se vier fora do formato, e a tela tenta de novo sem ele se a 1ª tentativa falhar. Erros do Pix passam a ser registrados nos logs da Vercel. Causa exata ainda não confirmada (erro vinha sem registro).
- 🐛 Vendas online pagas agora gravam a data/hora do pagamento (`sales.paid_at`): a função `confirm_sale_paid` do banco foi atualizada. Antes o campo ficava vazio. Vendas pagas antes de hoje continuam sem a data (2 casos).

## 05/10/2026 — Agente Claude 2

- ✨ **Testes automáticos de Pix, assinatura do webhook e retorno ao
  checkout**: 3 arquivos de teste novos, 44 testes no total, todos
  passando; o pipeline agora roda todos. Refatoração sem mudança de
  comportamento: montagem do Pix e conferência da assinatura saíram de
  `mercado-pago.functions.ts` e `webhook.ts` para módulos puros
  testáveis. `safeReturnTo` também passou a recusar `..` no caminho.
  (`385b173`)

## 04/10/2026 — Agente Claude 2

- ✨ **Toggle "Compra sem cadastro" nas Preferências do Admin**: ligado
  (padrão) = qualquer pessoa compra sem conta, como já era; desligado =
  o cliente vê "Entre para comprar" no checkout, entra ou cria conta e
  volta direto ao checkout (parâmetro `voltar`, só caminhos `/e/...`). A
  regra vale para todos os eventos ativos e também é imposta no banco
  (`create_pending_sale` recusa venda sem login). Banco: coluna
  `organizations.allow_guest_checkout` (padrão `true`), função
  `is_guest_checkout_allowed` e migration
  `20261004120000_add_guest_checkout_toggle`. O link de confirmação de
  e-mail do cadastro também volta ao checkout (depende de a URL estar
  liberada no Supabase). **Pendente:** testar com evento ativo, ligado e
  desligado. (`ffadc1e`, `12b6a40`)
- 🎨 **Preferências reorganizadas**: linhas compactas, campos menores e
  explicações atrás de ícone (i) (`InfoHint`), no lugar de textos
  longos. (`ffadc1e`)
- ✨ **"Unificar listas de PDF" agora funciona**: antes era um switch
  que não salvava nem era usado. Ligado (padrão): o PDF de check-in traz
  vendas pagas + cortesias numa lista só, nas telas Vendas e Cortesias;
  desligado: Vendas só compradores e Cortesias só cortesias. Banco:
  coluna `organizations.unify_checkin_pdf` e migration
  `20261004130000_add_unify_checkin_pdf_preference`. **Pendente:**
  conferir o PDF com evento ativo. (`e4de0d2`)
- ✨ **Qualidade da integração Mercado Pago**: o Pix agora envia a
  descrição do item (id do lote, título do evento, categoria `tickets`,
  quantidade e preço), carrega o SDK oficial `MercadoPago.JS V2` com o
  script de segurança e envia o código do dispositivo no cabeçalho
  `X-meli-session-id`, e usa `INGRESSO-TICKETFLOW` como descrição na
  fatura. Se o SDK falhar, o Pix sai normalmente — nunca bloqueia a
  compra. **Pendente:** validar com um Pix real em evento ativo e
  acompanhar a nota no painel do Mercado Pago. (`414d353`)
- 🔒 **Bibliotecas com falha de segurança atualizadas**: `nodemailer`
  10.0.0 → 10.0.14 (falha de nível alto, afetava envio do ingresso por
  e-mail) e `dompurify` 3.4.12 → 3.4.16. Restam 3 avisos em ferramentas
  de build (`js-yaml`, `nanoid`), sem efeito no site em produção. O
  `bun.lock` ainda tem pacotes apontando para o registro do Lovable
  (`pkg.dev/lovable-core-prod`) — hoje o deploy funciona, mas vale
  migrar quando for conveniente. (`6176db9`)
- 🔒 **Limite de reservas pendentes por pessoa**: `create_pending_sale`
  recusa a 4ª reserva não paga de um mesmo WhatsApp ou e-mail no mesmo
  evento, com trava de concorrência para tentativas simultâneas. Compra
  sem cadastro continua liberada. Limite conhecido: quem trocar WhatsApp
  e e-mail a cada tentativa passa; limite por IP ficou de fora por
  decisão do Diego (afetaria clientes na mesma rede de Wi-Fi). Migration
  `20261004140000_limit_pending_sales_per_buyer`. **Pendente:** validar
  com evento ativo (4ª tentativa recusada, compra normal segue).
  (`49cda8b`)
- 🔧 **Endereço de reserva do Mercado Pago apontava para o Lovable (fora
  do ar)**: usado só quando falta a variável `VITE_SITE_URL`; trocado
  para `https://ticketflow-core.vercel.app`. Como a Vercel já tem essa
  variável configurada, não muda nada na prática hoje — é uma rede de
  segurança para o caso de faltar. (`3bf4635`)
- 📝 Confirmado: painel do Mercado Pago com webhook já apontando para a
  Vercel; Supabase → Authentication → URL Configuration com Site URL e
  Redirect URLs só da Vercel (removidas as referências ao Lovable).

## 01/10/2026 — Agente 01 (Claude)

- 🎨 **Logo unificado** entre sidebar do Admin, header do Cliente, Login,
  Cadastro e telas de senha — existiam 4 versões visuais diferentes do
  mesmo logo; criado componente único `Brandmark`. De quebra, corrigiu um
  bug de texto invisível no tema claro do Cadastro. (`ee82b07`)
- 🐛 **Módulo Usuários inacessível**: a tela sempre redirecionava para
  Vendas, até para administradores reais — a checagem de permissão
  dependia de um dado nunca preenchido pelo sistema. (`42d9423`)
- 🐛 **Botão "Remover" não cancelava convite pendente**: funcionava só
  para quem já tinha conta; convite pendente ficava órfão mesmo com a
  mensagem de sucesso. Criada função `remove_user_or_invite`. (`42d9423`)
- 🐛 **Assistente do Mercado Pago inacessível**: mesmo bug de permissão
  do item acima, numa tela ainda mais crítica — sem abrir, não dava para
  configurar o Pix de jeito nenhum. (`2507b52`)
- 🔒 **Falha de segurança no salvamento de credenciais do Mercado Pago**:
  as funções de servidor não conferiam quem estava chamando — qualquer
  pessoa que descobrisse o endereço poderia trocar as credenciais de
  pagamento de qualquer organização. Corrigido com checagem de admin.
  (`2507b52`)
- 🐛 **Salvar só o webhook secret apagava o Access Token** já salvo (e
  vice-versa) por sobrescrita sem preservar o que não foi reenviado.
  Correção convergiu com um fix equivalente aplicado em paralelo por
  outro agente. (`66a7e43`)
- 🐛 **Botão "Criar PIX de teste" nunca funcionava**: tentava inserir
  direto na tabela `sales`, bloqueado por regra de segurança do banco,
  com um evento/lote inventado que não existe. Criada função
  `create_mp_test_sale`, usando um evento real da organização. (`66a7e43`)
- 📝 Registrada a causa raiz de fundo do problema do Pix: Lovable e
  Vercel guardam a chave de criptografia (`APP_ENCRYPTION_KEY`) em
  variáveis de ambiente separadas — credencial salva numa plataforma não
  descriptografa na outra. Ação pendente, fora do repositório: igualar a
  variável nas duas plataformas ou definir uma só como produção.
  (`6460526`)
- 🐛 **Duas versões de funções do banco coexistindo** (`create_locked_tickets`,
  `create_pending_sale`, `update_customer`) — o sistema estava resolvendo
  chamadas para a versão antiga e já corrigida, reativando bugs já dados
  como resolvidos. Risco real: ingresso duplicado em reenvio de webhook,
  e venda sem login nunca vinculava ao cliente. Removidas as versões
  antigas; criado snapshot de todas as funções do banco como backup
  versionado (não existia controle de versão de várias delas).
- 🎨 Auditoria de aderência ao Design System: achado que o documento
  oficial descreve o tema verde antigo (v1.1) enquanto o código já roda
  o tema roxo (v1.2) — raiz de parte da sensação de inconsistência visual.
  Ver `docs/DESIGN-SYSTEM.md` para o status da correção do documento.
- 📝 Criado `CLAUDE.md` (índice de rotas) — na verdade já existia, criado
  por outro agente em paralelo; só foi complementado.
