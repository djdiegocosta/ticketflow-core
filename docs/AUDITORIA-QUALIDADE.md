# TicketFlow — Auditoria de Experiência e Confiabilidade do Evento

**Data da auditoria inicial:** 06/09/2026 20:08 BRT
**Agente da auditoria:** Claude (Sonnet)
**Branch:** `main`
**Repositório:** `djdiegocosta/ticketflow-core`
**Projeto Supabase:** `ywcdopjqfhisopipqxgq`
**Projeto Vercel:** `ticketflow-core`

## Objetivo

Este documento é irmão do `AUDITORIA.md` (segurança, banco de dados e performance), mas olha para outra frente: a experiência de quem compra ingresso e a confiabilidade do sistema no dia a dia de um evento real. O foco principal são questões que envolvem **clientes e acesso do público**; itens internos (admin/staff) aparecem apenas quando afetam esse público de forma indireta.

Segue as mesmas regras do `AUDITORIA.md`: nenhum item é removido quando resolvido, o status muda e recebe data/hora/agente/evidência.

### Status permitidos

- `ABERTO` — problema confirmado e ainda não resolvido.
- `EM ANÁLISE` — investigação iniciada, mas causa/solução ainda não confirmada.
- `RESOLVIDO` — correção aplicada e confirmada.
- `NÃO É BUG` — item investigado e confirmado como já protegido/funcionando corretamente.
- `ADIADO` — problema confirmado, mas fora da prioridade atual.

Horários neste documento são BRT (UTC-3).

---

## 1. Link do evento sem preview ao compartilhar

**ID:** QUA-001
**Status:** `RESOLVIDO`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

As páginas públicas (`/e/:slug`, `/e/:slug/checkout`, `/e/:slug/confirmacao/:sale_code`) têm título e descrição **fixos e genéricos** ("Evento | TicketFlow", "Garanta seu ingresso para este evento exclusivo."), não o nome, data ou imagem do evento real. Não existe `og:image`.

**Arquivos:** `src/routes/e.$slug.index.tsx`, `src/routes/e.$slug.checkout.tsx`, `src/routes/e.$slug.confirmacao.$sale_code.tsx`

### Impacto

Quando alguém compartilha o link do evento no WhatsApp, Instagram ou Facebook, o preview que aparece não mostra nome, data nem imagem do evento — apenas um card genérico do TicketFlow. Como esse compartilhamento costuma ser o principal canal de divulgação de um evento, isso reduz a taxa de clique e prejudica vendas diretamente.

### Correção aplicada

Criado `src/lib/event-meta.ts` com duas funções: `fetchEventMeta(slug)` busca título, descrição, imagem, data e local do evento publicado; `buildEventMeta(event, opts)` monta o título/descrição/og:image reais a partir desses dados, com `titleSuffix` e `descriptionOverride` opcionais por etapa.

As três rotas públicas passaram a usar `loader` (executa no servidor, antes de gerar o HTML) para buscar os dados e alimentar o `head()`:
- `/e/$slug/` — título e imagem do evento, descrição combinando descrição do evento, data e local.
- `/e/$slug/checkout` — mesmo evento/imagem, título com sufixo "Checkout".
- `/e/$slug/confirmacao/$sale_code` — mesmo evento/imagem, título com sufixo "Confirmação".

Quando o evento não tem imagem cadastrada, cai no `twitter:card` tipo `summary` (sem imagem) em vez de simular uma imagem inexistente.

**Arquivo novo:** `src/lib/event-meta.ts`
**Commit:** `0c49b3660328e4e4b95a54b0c0a47e8f733c29d9`

### Validação pós-correção

- Build de produção concluído sem erros.
- Deploy `dpl_Ds4gc6Wqi4jMqj6gx1Ba4WhQnTsL` concluído com `READY`.
- Pendente: Diego confirmar visualmente o preview ao colar o link de um evento real no WhatsApp (o cache de preview de cada rede social pode levar um tempo para atualizar em links já compartilhados antes desta correção).

### Resolução

- **Data:** 06/09/2026
- **Hora:** 20:38 BRT
- **Agente:** Claude
- **Evidência:** build e deploy validados; falta apenas confirmação visual do usuário no link real.

---

## 2. Recuperação de ingresso depende de um código que só aparece uma vez

**ID:** QUA-002
**Status:** `EM ANÁLISE`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Não existe envio automático de e-mail ou WhatsApp confirmando a compra. A única confirmação é a tela exibida no navegador logo após o pagamento. Quem compra sem estar logado (convidado) e fecha a aba só recupera o ingresso via "Buscar Ingressos" (`/meus-ingressos`), que exige saber de cor o código da venda (8 caracteres, mostrado uma única vez).

**Arquivos:** `src/pages/ConfirmationPage.tsx`, `src/pages/MyTicketsPage.tsx`

### Impacto

Cliente que compra, fecha o navegador e não anotou o código fica sem meio de recuperar o ingresso sozinho — precisa contatar o organizador manualmente. Em um evento com muita gente comprando pelo celular, isso gera atrito e mensagens de suporte evitáveis.

### Correção em andamento

Decisão (Diego): começar só com e-mail, usando Gmail SMTP (custo zero, sem domínio próprio) em vez de um serviço dedicado — o projeto não tem domínio verificável hoje.

- Criado `src/lib/email/confirmation-email.server.ts`: monta e envia o e-mail com nome do comprador, evento, código da venda e link para `/meus-ingressos`. Falha no envio nunca bloqueia a confirmação do pagamento nem a criação dos ingressos (só loga e segue).
- Webhook do Mercado Pago (`src/routes/api/public/mp/webhook.ts`) passou a chamar o envio logo após `confirm_sale_paid` + `create_locked_tickets`.
- Dependência `nodemailer` adicionada ao projeto.
- Variáveis `GMAIL_USER` e `GMAIL_APP_PASSWORD` configuradas na Vercel (Diego, 06/09/2026).

**Pendente:** teste ponta a ponta com uma compra real após o redeploy, pra confirmar que o e-mail chega e o link funciona. Status muda para `RESOLVIDO` só depois dessa validação.

**Nota (07/09/2026, Claude 2):** o teste real revelou uma causa separada e mais grave (`AUD-018` em `AUDITORIA.md`) que impedia QUALQUER confirmação automática de chegar — `notification_url` do Mercado Pago apontava para um domínio inexistente. Corrigido. Falta apenas confirmar visualmente que o e-mail chegou na caixa de entrada do comprador de teste.

**Commits:** `0602af807c419f299a0f742bd1f454ed4935f835` (envio), `a3c743e530609408625332a09c69ee326a98c7a2` (webhook), `89029e05296e6a5d746b0957c2ad5bffdfbdadc4` (dependência).

---

## 3. Nenhum aviso de privacidade ou termos no checkout

**ID:** QUA-003
**Status:** `RESOLVIDO`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

O checkout coleta nome, WhatsApp, e-mail e nome de cada participante, sem nenhum link para política de privacidade, termos de uso ou aviso de como os dados são usados. Confirmado por busca no código: não existia nenhuma página nem menção a "termos de uso", "política de privacidade" ou "LGPD" em nenhuma tela pública.

**Arquivo:** `src/pages/CheckoutPage.tsx`

### Impacto

A LGPD (Lei Geral de Proteção de Dados) exige informar a finalidade da coleta de dados pessoais, independente do porte do negócio. Hoje o sistema não cumpre isso, o que é um risco tanto para o cliente quanto para o organizador (Diego é o controlador dos dados coletados).

### Correção aplicada

- Criada a página pública `src/pages/PrivacyPolicyPage.tsx`, acessível em `/privacidade`, com informações sobre dados coletados, finalidades, compartilhamento, segurança, retenção e direitos do titular.
- Criada a página pública `src/pages/TermsPage.tsx`, acessível em `/termos`, com regras básicas de compra, pagamento, ingressos, cancelamento/reembolso, uso adequado e privacidade.
- `src/pages/CheckoutPage.tsx` passou a exibir, antes do botão “Gerar Pix”, um aviso curto com links para “Termos de Uso” e “Política de Privacidade”. O aviso é informativo e não cria checkbox obrigatório nem altera o fluxo de compra.

**Commits:**
- `f347ebd1c7c02700bf2d4e8e988806bcba00ba22` — página de Política de Privacidade.
- `7c5a7eae4051ae116876dba0e70680bc742bd9b7` — página de Termos de Uso.
- `51fd97b5853e9fd68e3e4c3759e4ccd3ff6ccf1b` — rota `/privacidade`.
- `098d948736a7abf88d3df59f63517f9e4ed71505` — rota `/termos`.
- `cdb06e76a4382492d38e6ec7b730cfa048f2a613` — aviso e links no checkout via Lovable.

### Validação pós-correção

- Build de produção executado pelo agente que realizou a alteração no checkout: `bun run build` passou com exit code 0.
- A alteração do checkout foi limitada ao `src/pages/CheckoutPage.tsx`; as páginas e rotas legais foram adicionadas separadamente e não alteraram o fluxo de pagamento.
- Não foi alterado Supabase, Mercado Pago, estoque, timer ou validações do checkout.

### Resolução

- **Data:** 06/09/2026
- **Hora:** 21:23 BRT
- **Agente:** ChatGPT
- **Evidência:** páginas e rotas legais criadas e aviso com links incorporado ao checkout; build de produção passou com exit code 0.

---

## 4. Ninguém é avisado quando o Pix para de funcionar para os clientes

**ID:** QUA-004
**Status:** `RESOLVIDO` (07/09/2026 00:45 BRT — ChatGPT)
**Severidade:** MÉDIA-ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Quando a geração do Pix falha no checkout (como aconteceu na semana de 06/09), o erro fica registrado apenas em `sales.mp_debug_response`, visível só consultando o banco diretamente. Não existe alerta automático (e-mail, notificação no painel) avisando o organizador.

### Impacto

Esse tipo de falha só é percebido se um cliente reclamar ou se alguém for investigar manualmente — como ocorreu. Enquanto isso, todo cliente que tenta comprar no período recebe "Erro ao gerar o Pix" sem que ninguém do lado do organizador saiba que está acontecendo.

### Ação necessária

Um alerta simples (e-mail para o Diego, por exemplo) quando `createMpPix` falhar, ou um indicador visível no Dashboard quando houver falhas recentes de geração de Pix.

### Correção aplicada

Alerta compacto no Dashboard Admin quando existem falhas de geração de Pix nas últimas 24h (stages `mp_rejected`, `missing_qr_code`, `exception` em `sales.mp_debug_response`), com filtro pelo evento operacional e link para `/admin/configuracoes/mercado-pago`. E-mail/WhatsApp seguem pendentes.

---

## 5. Proteção contra venda duplicada de ingresso

**ID:** QUA-005
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

Duas preocupações comuns em sistemas de venda de ingresso, testadas direto no banco:

- **Dois clientes comprando o último ingresso ao mesmo tempo:** `create_pending_sale` usa `SELECT ... FOR UPDATE` no lote e um `UPDATE ... WHERE quantity >= _quantity` atômico. Está protegido contra vender mais ingressos do que o estoque, mesmo com dois compradores simultâneos.
- **Mercado Pago reenviando a notificação de pagamento duas vezes (comportamento normal do Mercado Pago):** `confirm_sale_paid` só muda o status se a venda ainda estiver `pendente`, e `create_locked_tickets` só insere um ingresso se ele ainda não existir (`WHERE NOT EXISTS`). Uma segunda notificação do mesmo pagamento não gera ingresso duplicado.

### Conclusão

Não é necessário nenhum ajuste aqui. Registrado para constar que a checagem foi feita.

---

## 6. Comportamento do Pix quando expira na tela do cliente

**ID:** QUA-006
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

Quando o cronômetro do Pix chega a zero, o sistema mostra um aviso claro ("O tempo para pagamento expirou. O estoque foi liberado.") e devolve o cliente para o início do formulário automaticamente, sem deixá-lo travado numa tela de QR Code morto.

**Arquivo:** `src/pages/CheckoutPage.tsx`

### Conclusão

Comportamento adequado, sem ação necessária.

---

## 7. Check-in com internet instável no dia do evento

**ID:** QUA-007
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

A tela de check-in (`src/pages/CheckinPage.tsx`) já tem um mecanismo de fila offline (`offlineDB`): detecta quando a internet cai, guarda os check-ins localmente e sincroniza automaticamente quando a conexão volta.

### Conclusão

Já resolvido em uma rodada anterior. Não é um item novo, mas fica registrado que foi conferido nesta auditoria.

---

## 8. Zero testes automatizados protegendo o fluxo de compra

**ID:** QUA-008
**Status:** `ABERTO`
**Severidade:** MÉDIA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Não existe nenhum teste automatizado no repositório (nenhum arquivo `.test.` ou `.spec.`). Toda alteração de código depende de teste manual para garantir que o checkout, o Pix e o check-in continuam funcionando.

### Impacto

Não afeta o cliente diretamente hoje, mas é o tipo de lacuna que permite que um bug no fluxo de pagamento chegue a produção sem ninguém perceber antes de um cliente real ser afetado — como quase aconteceu com o Pix.

### Ação necessária

Fora do foco principal desta auditoria (que é experiência do cliente), mas registrado para priorização futura: pelo menos um teste automatizado cobrindo o fluxo completo de compra (criar venda → gerar Pix → confirmar pagamento → gerar ingresso).

---

## 9. Página de confirmação com resumo em branco e PDF de ingresso quebrado

**ID:** QUA-009
**Status:** `RESOLVIDO`
**Severidade:** CRÍTICA
**Descoberta:** 07/09/2026 12:40 BRT (Diego, durante teste real de compra)
**Agente da correção:** Claude 2

### Problema

Na tela de confirmação, o resumo (evento, data, quantidade, total pago) aparecia em branco, e o botão "Baixar todos os ingressos (PDF)" falhava com "Não foi possível gerar o PDF do ingresso".

### Causa raiz

Dupla, ambas no mesmo ponto do código (`src/lib/customer-queries.ts`, hook `useSaleByCode`):

1. `get_sale_by_code` e `get_tickets_by_sale_code` são funções `RETURNS TABLE` — o supabase-js sempre entrega o resultado como **array**. O código fazia `{ ...data, tickets }`, um spread direto do array, que produz um objeto com chaves numéricas (`0`, `1`...) em vez dos campos da venda. Todo campo lido depois (`sale.quantity`, `sale.events?.title` etc.) vinha `undefined`.
2. `get_sale_by_code` nunca retornou `organization_id`/`buyer_whatsapp` (usados no link "Criar minha conta"), e `get_tickets_by_sale_code` nunca retornou o `id` do ingresso — usado para casar o QR Code na hora de montar o PDF (por isso o erro "QR Code não encontrado").
3. `ConfirmationPage.tsx` também lia um objeto aninhado `sale.events?.title` que nunca existiu — a função sempre devolveu campos soltos (`event_title`, `event_date`).

### Correção aplicada

- `get_sale_by_code`: agora também retorna `organization_id` e `buyer_whatsapp`.
- `get_tickets_by_sale_code`: agora também retorna `id`.
- `useSaleByCode`: pega a primeira linha do array (`data[0]`) em vez de espalhar o array inteiro.
- `ConfirmationPage.tsx`: lê os campos reais (`sale.event_title`, `sale.event_date`, `sale.organization_id`) em vez do objeto `events` inexistente.

**Commits:** migrations Supabase (`fix_confirmation_rpc_return_shape`), `d2bdf6f384ba91f0224872e83951e4bce8aa3807` (customer-queries.ts), `d7b109d497683f4586d97f4210d2fb5575f7d2e1` (ConfirmationPage.tsx).

### Resolução

- **Data:** 07/09/2026
- **Hora:** 13:35 BRT
- **Agente:** Claude 2
- **Evidência:** build de produção `READY` após o deploy. Validação visual final (segunda compra real conferindo resumo e PDF) pendente de confirmação do Diego.

---

## 10. Vendas de teste do admin nunca expiravam

**ID:** QUA-010
**Status:** `RESOLVIDO`
**Severidade:** BAIXA
**Descoberta:** 07/09/2026 13:00 BRT (Diego reportou "vendas pendentes não expiram no tempo configurado")
**Agente da correção:** Claude 2

### Problema

`create_mp_test_sale` (usada pelo botão "pagamento de teste" da tela Configurações → Mercado Pago) criava a venda com `status = 'pendente'`, mas nunca definia `expires_at`. Como o job de expiração só processa vendas com `expires_at` preenchido, essas vendas de teste ficavam pendentes para sempre.

**Importante:** vendas reais de clientes (via checkout) sempre definiram `expires_at` corretamente e expiram no prazo configurado — confirmado com dados reais (vendas expiraram exatamente aos 32 minutos, valor configurado da organização). O problema era isolado à ferramenta de teste do admin.

### Correção aplicada

`create_mp_test_sale` agora calcula `expires_at` da mesma forma que `create_pending_sale` (usa `pending_sale_expiration_minutes` da organização, padrão 30min). As 5 vendas de teste que já estavam presas foram expiradas retroativamente (não afeta estoque — essa função nunca decrementou lote).

### Resolução

- **Data:** 07/09/2026
- **Hora:** 13:20 BRT
- **Agente:** Claude 2
- **Evidência:** migration aplicada no Supabase; 5 vendas `TEST%` marcadas `expirado` retroativamente.

---

## 11. Status "Devolvido" ausente na lista de vendas

**ID:** QUA-011
**Status:** `RESOLVIDO`
**Severidade:** BAIXA
**Descoberta:** 07/09/2026 13:00 BRT (pedido direto de Diego)
**Agente da correção:** Claude 2

### Problema

O banco já suporta o status `reembolsado` (valor válido do enum `sale_status`), mas a tela de vendas do admin não tinha aba nem rótulo próprio para ele — uma venda devolvida aparecia disfarçada como "Cancelado".

### Correção aplicada

Adicionada aba "Devolvido" em `STATUS_TABS`, com cor e rótulo distintos de "Cancelado" no `StatusBadge`, e ajuste no filtro (`reembolsado` ≠ `"devolvido".toLowerCase()`, precisa de mapeamento explícito).

**Commit:** `e42921875feada92a32bef8216a6d4991e84f600` (`src/pages/admin/SalesListPage.tsx`).

### Resolução

- **Data:** 07/09/2026
- **Hora:** 13:35 BRT
- **Agente:** Claude 2
- **Evidência:** build de produção `READY`.

---

# Prioridade sugerida

1. **QUA-002** — confirmação automática por e-mail/WhatsApp: falta só a validação visual final do e-mail.
2. **QUA-008** — testes automatizados (proteção de longo prazo, menor urgência).

QUA-001, QUA-003, QUA-004, QUA-009, QUA-010 e QUA-011 já foram corrigidos. QUA-005, QUA-006 e QUA-007 foram verificados e não precisam de ação.

---

# Histórico de alterações deste documento

| Data | Hora BRT | Agente | ID | Alteração |
|---|---:|---|---|---|
| 06/09/2026 | 20:08 | Claude | — | Auditoria inicial registrada: 8 itens (4 abertos, 3 verificados sem problema, 1 aberto de menor prioridade). |
| 06/09/2026 | 20:38 | Claude | QUA-001 | Meta tags dinâmicas implementadas (título, descrição e og:image reais do evento) nas 3 páginas públicas; build e deploy validados. |
| 06/09/2026 | 21:23 | ChatGPT | QUA-003 | Criadas páginas/rotas de Política de Privacidade e Termos de Uso e adicionados links informativos ao checkout; build de produção passou. |

**Regra permanente:** problemas resolvidos não devem ser apagados deste documento. Apenas seu status é alterado, com data, hora, agente e evidência.
| 07/09/2026 | 00:45 | ChatGPT | QUA-004 | Alerta de falhas recentes na geração de Pix adicionado ao Dashboard Admin (últimas 24h, escopo do evento atual, link para Mercado Pago); build de produção passou. |
| 07/09/2026 | 13:35 | Claude 2 | QUA-009 | Resumo em branco e PDF quebrado na confirmação: causa raiz era spread de array da RPC. Corrigido em `get_sale_by_code`, `get_tickets_by_sale_code`, `useSaleByCode` e `ConfirmationPage.tsx`. |
| 07/09/2026 | 13:20 | Claude 2 | QUA-010 | `create_mp_test_sale` corrigida para definir `expires_at`; vendas de teste presas expiradas retroativamente. |
| 07/09/2026 | 13:35 | Claude 2 | QUA-011 | Status "Devolvido" adicionado à lista de vendas (aba, cor e rótulo distintos de "Cancelado"). |
